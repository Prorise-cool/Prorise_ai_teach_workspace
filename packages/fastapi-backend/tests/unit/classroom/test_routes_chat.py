"""POST /api/v1/classroom/chat SSE 路由单测。

验证范围（Wave 1.6 scope A）：
- Content-Type: text/event-stream
- 后端 ChatEvent → 前端事件名翻译（agent_switch→agent_start 等）
- _persist_chat_turn 在 finally 被调用一次（正常 & 异常路径）
- long_term 仓库调用被 mock，避免真实数据库依赖

sse_broker 集成 + Last-Event-ID 回放为 wave 2 技术债，不在此单测覆盖。
"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_access_context
from app.features.classroom import routes_chat as routes_chat_module
from app.features.classroom.orchestration.schemas import (
    AgentSwitchEvent,
    AgentTurnEndEvent,
    EndEvent,
    ErrorEvent,
    SummaryEvent,
    TextDeltaEvent,
    ToolCallEvent,
)
from app.main import create_app

from tests.conftest import MOCK_ACCESS_CONTEXT


@pytest.fixture
def app_with_fakes(monkeypatch):
    """构造 app；monkeypatch provider resolver，避免真实 LLM 调用。"""

    async def _fake_resolve(*args, **kwargs) -> list:
        return []

    monkeypatch.setattr(
        "app.features.classroom.llm_adapter.resolve_classroom_providers",
        _fake_resolve,
    )

    app = create_app()
    app.dependency_overrides[get_access_context] = lambda: MOCK_ACCESS_CONTEXT
    return app


def _chat_payload(**overrides: Any) -> dict:
    base = {
        "messages": [{"role": "user", "content": "你好"}],
        "agents": [{"id": "t1", "name": "Teacher", "role": "teacher", "persona": "p"}],
        "classroomContext": "lesson-1",
        "languageDirective": "Respond in Chinese",
        "taskId": "task-test-1",
    }
    base.update(overrides)
    return base


def _parse_sse_frames(body: str) -> list[dict[str, str]]:
    """解析 SSE 帧：返回每帧的 event / data 字段（data 保持原始字符串）。"""
    frames: list[dict[str, str]] = []
    for raw in body.split("\n\n"):
        raw = raw.strip("\n")
        if not raw:
            continue
        frame = {"event": "", "data": ""}
        for line in raw.split("\n"):
            if line.startswith("event: "):
                frame["event"] = line[7:]
            elif line.startswith("data: "):
                frame["data"] = line[6:]
        frames.append(frame)
    return frames


def _json_payloads(body: str) -> list[dict]:
    """抽取所有可解析为 JSON 的 data 字段（跳过 [DONE] 等非 JSON 帧）。"""
    out: list[dict] = []
    for frame in _parse_sse_frames(body):
        data = frame["data"]
        if not data or data == "[DONE]":
            continue
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            out.append(parsed)
    return out


def _stub_long_term(monkeypatch):
    """把 shared_long_term_repository.save_companion_turn mock 成 no-op。"""
    calls: list[Any] = []

    class _FakeRepo:
        def save_companion_turn(self, request):
            calls.append(request)

    monkeypatch.setattr(
        "app.shared.long_term.shared_long_term_repository",
        _FakeRepo(),
    )
    return calls


# ─── 核心用例 ───────────────────────────────────────────────────────────────


def test_chat_returns_sse_content_type(app_with_fakes, monkeypatch):
    """Content-Type 必须是 text/event-stream。"""

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        yield TextDeltaEvent(content="hi", message_id="m-0")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        response = client.post("/api/v1/classroom/chat", json=_chat_payload())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")


def test_chat_translates_all_event_types(app_with_fakes, monkeypatch):
    """后端 ChatEvent → 前端事件名翻译全覆盖。"""
    emitted = [
        AgentSwitchEvent(
            agent_id="t1",
            agent_name="Teacher",
            agent_avatar=None,
            agent_color="#123456",
            message_id="m-1",
        ),
        TextDeltaEvent(content="讲解内容", message_id="m-1"),
        ToolCallEvent(
            action_id="a-1",
            name="wb_draw_text",
            args={"x": 1.0, "y": 2.0, "content": "hi"},
            agent_id="t1",
            message_id="m-1",
        ),
        AgentTurnEndEvent(message_id="m-1", agent_id="t1"),
        SummaryEvent(text="课程小结"),
        ErrorEvent(message="downstream failure"),
        EndEvent(total_actions=1, total_agents=1),
    ]

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        for ev in emitted:
            yield ev

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        response = client.post("/api/v1/classroom/chat", json=_chat_payload())

    assert response.status_code == 200
    payloads = _json_payloads(response.text)
    by_type = {p.get("type"): p for p in payloads}

    # agent_switch → agent_start
    assert by_type["agent_start"]["data"]["agentId"] == "t1"
    assert by_type["agent_start"]["data"]["agentName"] == "Teacher"
    # text_delta → text_delta
    assert by_type["text_delta"]["data"]["messageId"] == "m-1"
    assert by_type["text_delta"]["data"]["content"] == "讲解内容"
    # tool_call → tool_call
    assert by_type["tool_call"]["data"]["actionId"] == "a-1"
    assert by_type["tool_call"]["data"]["name"] == "wb_draw_text"
    assert by_type["tool_call"]["data"]["agentId"] == "t1"
    # agent_turn_end
    assert by_type["agent_turn_end"]["data"]["agentId"] == "t1"
    assert by_type["agent_turn_end"]["data"]["messageId"] == "m-1"
    # summary
    assert by_type["summary"]["data"]["text"] == "课程小结"
    # error → error (ErrorEvent from run_discussion translates to {type:error})
    assert by_type["error"]["data"]["message"] == "downstream failure"
    # end → done (EndEvent translates to {type:done})
    assert "done" in by_type

    # 终止哨兵
    data_blobs = [f["data"] for f in _parse_sse_frames(response.text)]
    assert "[DONE]" in data_blobs


def test_chat_drops_thinking_and_cue_user_events(app_with_fakes, monkeypatch):
    """thinking / cue_user 不应出现在前端流（按 _translate_chat_event 行 189 规则）。"""
    from app.features.classroom.orchestration.schemas import CueUserEvent, ThinkingEvent

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        yield ThinkingEvent(stage="director")
        yield CueUserEvent(from_agent_id="t1")
        yield TextDeltaEvent(content="real content", message_id="m-1")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        response = client.post("/api/v1/classroom/chat", json=_chat_payload())

    payloads = _json_payloads(response.text)
    types = {p.get("type") for p in payloads}
    assert "thinking" not in types
    assert "cue_user" not in types
    assert any(
        p.get("type") == "text_delta"
        and p.get("data", {}).get("content") == "real content"
        for p in payloads
    )


def test_chat_persists_turn_on_normal_completion(app_with_fakes, monkeypatch):
    """正常流结束 → _persist_chat_turn 调用一次，answer 是所有 text_delta 的拼接。"""

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        yield TextDeltaEvent(content="答案", message_id="m-1")
        yield TextDeltaEvent(content="拼接", message_id="m-1")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    _stub_long_term(monkeypatch)

    captured: list[dict[str, Any]] = []

    def _spy(**kwargs):
        captured.append(kwargs)

    monkeypatch.setattr(routes_chat_module, "_persist_chat_turn", _spy)

    with TestClient(app_with_fakes) as client:
        response = client.post("/api/v1/classroom/chat", json=_chat_payload())

    assert response.status_code == 200
    assert len(captured) == 1
    assert captured[0]["question"] == "你好"
    assert captured[0]["answer"] == "答案拼接"


def test_chat_persists_turn_even_on_exception(app_with_fakes, monkeypatch):
    """director 中途抛异常 → finally 仍调用 _persist_chat_turn 一次。"""

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        yield TextDeltaEvent(content="部分输出", message_id="m-err")
        raise RuntimeError("llm blew up")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    _stub_long_term(monkeypatch)

    captured: list[dict[str, Any]] = []

    def _spy(**kwargs):
        captured.append(kwargs)

    monkeypatch.setattr(routes_chat_module, "_persist_chat_turn", _spy)

    with TestClient(app_with_fakes) as client:
        response = client.post("/api/v1/classroom/chat", json=_chat_payload())

    assert response.status_code == 200
    payloads = _json_payloads(response.text)
    error_payloads = [p for p in payloads if p.get("type") == "error"]
    assert error_payloads
    assert "llm blew up" in error_payloads[0]["data"]["message"]
    data_blobs = [f["data"] for f in _parse_sse_frames(response.text)]
    assert "[DONE]" in data_blobs
    # finally 保证 persist 被调用一次，answer 含部分输出
    assert len(captured) == 1
    assert captured[0]["answer"] == "部分输出"


def test_chat_invokes_shared_long_term_repository(app_with_fakes, monkeypatch):
    """end-to-end：不 mock _persist_chat_turn 本身，只 mock 底层 repo，
    验证 save_companion_turn 被调用（anchor / context_type 等字段映射正确）。"""

    async def _fake_run(request, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        yield TextDeltaEvent(content="最终答案", message_id="m-1")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion",
        _fake_run,
    )
    repo_calls = _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        response = client.post(
            "/api/v1/classroom/chat", json=_chat_payload(taskId="task-persist-1")
        )

    assert response.status_code == 200
    assert len(repo_calls) == 1
    request = repo_calls[0]
    assert request.question_text == "你好"
    assert request.answer_summary == "最终答案"
    assert request.session_id == "task-persist-1"
    assert request.anchor.anchor_ref == "task-persist-1"
