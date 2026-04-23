"""POST /api/v1/classroom/chat 路由单测 —— SSE 协议 / 翻译 / broker / 断线重连。"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_access_context
from app.features.classroom import routes_chat as routes_chat_module
from app.features.classroom.chat_sse_broker import (
    get_chat_sse_broker,
    reset_chat_sse_broker_for_tests,
)
from app.features.classroom.orchestration.schemas import (
    AgentSwitchEvent,
    AgentTurnEndEvent,
    CueUserEvent,
    EndEvent,
    ErrorEvent,
    SummaryEvent,
    TextDeltaEvent,
    ThinkingEvent,
    ToolCallEvent,
)
from app.main import create_app

from tests.conftest import MOCK_ACCESS_CONTEXT


@pytest.fixture(autouse=True)
def _reset_broker():
    reset_chat_sse_broker_for_tests()
    yield
    reset_chat_sse_broker_for_tests()


@pytest.fixture
def app_with_fakes(monkeypatch):
    async def _fake_resolve(*a, **k) -> list:
        return []

    monkeypatch.setattr(
        "app.features.classroom.llm_adapter.resolve_classroom_providers",
        _fake_resolve,
    )
    app = create_app()
    app.dependency_overrides[get_access_context] = lambda: MOCK_ACCESS_CONTEXT
    return app


def _payload(**o: Any) -> dict:
    base = {
        "messages": [{"role": "user", "content": "你好"}],
        "agents": [{"id": "t1", "name": "Teacher", "role": "teacher", "persona": "p"}],
        "classroomContext": "x", "languageDirective": "zh", "taskId": "task-1",
    }
    base.update(o)
    return base


def _frames(body: str) -> list[dict[str, str]]:
    out = []
    for raw in body.split("\n\n"):
        raw = raw.strip("\n")
        if not raw:
            continue
        frame = {"id": "", "event": "", "data": ""}
        for line in raw.split("\n"):
            for prefix, key in (("id: ", "id"), ("event: ", "event"), ("data: ", "data")):
                if line.startswith(prefix):
                    frame[key] = line[len(prefix):]
        out.append(frame)
    return out


def _json_payloads(body: str) -> list[dict]:
    out = []
    for f in _frames(body):
        if not f["data"] or f["data"] == "[DONE]":
            continue
        try:
            parsed = json.loads(f["data"])
            if isinstance(parsed, dict):
                out.append(parsed)
        except json.JSONDecodeError:
            pass
    return out


def _stub_long_term(monkeypatch):
    calls: list[Any] = []

    class _FakeRepo:
        def save_companion_turn(self, request):
            calls.append(request)

    monkeypatch.setattr("app.shared.long_term.shared_long_term_repository", _FakeRepo())
    return calls


def _patch_run(monkeypatch, events: list[Any], raise_after: bool = False):
    async def _fake_run(req, chain) -> AsyncIterator:  # type: ignore[no-untyped-def]
        for e in events:
            yield e
        if raise_after:
            raise RuntimeError("llm blew up")

    monkeypatch.setattr(
        "app.features.classroom.orchestration.run_discussion", _fake_run
    )


# ─── SSE 协议 & 翻译 ────────────────────────────────────────────────────────


def test_returns_sse_content_type(app_with_fakes, monkeypatch):
    _patch_run(monkeypatch, [TextDeltaEvent(content="hi", message_id="m")])
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        r = client.post("/api/v1/classroom/chat", json=_payload())
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")


def test_translates_all_event_types(app_with_fakes, monkeypatch):
    """所有 ChatEvent 子类型翻译 + thinking / cue_user drop 行为。"""
    emitted = [
        AgentSwitchEvent(
            agent_id="t1", agent_name="Teacher", agent_avatar=None,
            agent_color="#123", message_id="m-1",
        ),
        ThinkingEvent(stage="director"),
        TextDeltaEvent(content="讲解", message_id="m-1"),
        ToolCallEvent(
            action_id="a-1", name="wb_draw_text",
            args={"x": 1.0, "y": 2.0, "content": "hi"},
            agent_id="t1", message_id="m-1",
        ),
        CueUserEvent(from_agent_id="t1"),
        AgentTurnEndEvent(message_id="m-1", agent_id="t1"),
        SummaryEvent(text="小结"),
        ErrorEvent(message="downstream"),
        EndEvent(total_actions=1, total_agents=1),
    ]
    _patch_run(monkeypatch, emitted)
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        r = client.post("/api/v1/classroom/chat", json=_payload())

    by_type = {p.get("type"): p for p in _json_payloads(r.text)}
    assert by_type["agent_start"]["data"]["agentId"] == "t1"
    assert by_type["text_delta"]["data"]["content"] == "讲解"
    assert by_type["tool_call"]["data"]["actionId"] == "a-1"
    assert by_type["tool_call"]["data"]["name"] == "wb_draw_text"
    assert by_type["agent_turn_end"]["data"]["messageId"] == "m-1"
    assert by_type["summary"]["data"]["text"] == "小结"
    assert by_type["error"]["data"]["message"] == "downstream"
    assert "done" in by_type
    # thinking / cue_user 应被 drop
    assert "thinking" not in by_type and "cue_user" not in by_type
    assert "[DONE]" in [f["data"] for f in _frames(r.text)]


# ─── long_term 落库 ─────────────────────────────────────────────────────────


def test_persists_turn_via_long_term_repo(app_with_fakes, monkeypatch):
    """正常流 → save_companion_turn 被调用一次，answer 是所有 text_delta 拼接，
    session_id / anchor_ref 映射到 task_id。"""
    _patch_run(monkeypatch, [
        TextDeltaEvent(content="答案", message_id="m"),
        TextDeltaEvent(content="拼接", message_id="m"),
    ])
    calls = _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        client.post("/api/v1/classroom/chat", json=_payload(taskId="task-X"))

    assert len(calls) == 1
    assert calls[0].session_id == "task-X"
    assert calls[0].anchor.anchor_ref == "task-X"
    assert calls[0].question_text == "你好"
    assert calls[0].answer_summary == "答案拼接"


def test_persists_turn_on_exception(app_with_fakes, monkeypatch):
    """director 抛异常 → error 帧 + finally 中 persist 仍调 1 次。"""
    _patch_run(
        monkeypatch,
        [TextDeltaEvent(content="部分", message_id="m")],
        raise_after=True,
    )
    _stub_long_term(monkeypatch)
    captured: list[dict[str, Any]] = []
    monkeypatch.setattr(
        routes_chat_module, "_persist_chat_turn", lambda **kw: captured.append(kw)
    )

    with TestClient(app_with_fakes) as client:
        r = client.post("/api/v1/classroom/chat", json=_payload())

    errors = [p for p in _json_payloads(r.text) if p.get("type") == "error"]
    assert errors and "llm blew up" in errors[0]["data"]["message"]
    assert len(captured) == 1
    assert captured[0]["answer"] == "部分"


# ─── broker 集成 + Last-Event-ID ──────────────────────────────────────────


def test_each_event_has_id_and_broker_receives_publish(app_with_fakes, monkeypatch):
    """每个发出的帧都带 id；broker 在 drop 前收到对应事件。"""
    _patch_run(monkeypatch, [
        AgentSwitchEvent(
            agent_id="t1", agent_name="T", agent_avatar=None,
            agent_color=None, message_id="m",
        ),
        TextDeltaEvent(content="hi", message_id="m"),
    ])
    _stub_long_term(monkeypatch)

    # 拦截 drop 以便在响应结束后仍能观测 broker 记录
    broker = get_chat_sse_broker()
    dropped: list[str] = []
    monkeypatch.setattr(broker, "drop", lambda ch: dropped.append(ch))

    with TestClient(app_with_fakes) as client:
        r = client.post("/api/v1/classroom/chat", json=_payload(taskId="t-bk"))

    ids = [f["id"] for f in _frames(r.text) if f["event"]]
    assert all(i.startswith("classroom_chat_t-bk:") for i in ids)

    names = [e.event_name for e in broker.replay("classroom_chat_t-bk")]
    assert "agent_start" in names and "text_delta" in names
    assert dropped == ["classroom_chat_t-bk"]


def test_last_event_id_replays_before_live(app_with_fakes, monkeypatch):
    """Last-Event-ID 命中 → 先回放 tail，再 live，seq 从缓存末尾续接。"""
    broker = get_chat_sse_broker()
    for i in (1, 2, 3):
        broker.publish(
            "classroom_chat_t-rp",
            event_id=f"classroom_chat_t-rp:{i}",
            event_name="text_delta" if i > 1 else "agent_start",
            data=f'{{"n":{i}}}',
        )
    monkeypatch.setattr(broker, "drop", lambda ch: None)
    _patch_run(monkeypatch, [TextDeltaEvent(content="new", message_id="m")])
    _stub_long_term(monkeypatch)

    with TestClient(app_with_fakes) as client:
        r = client.post(
            "/api/v1/classroom/chat",
            json=_payload(taskId="t-rp"),
            headers={"Last-Event-ID": "classroom_chat_t-rp:1"},
        )

    ids = [f["id"] for f in _frames(r.text) if f["id"]]
    assert "classroom_chat_t-rp:2" in ids and "classroom_chat_t-rp:3" in ids
    assert ids.index("classroom_chat_t-rp:2") < ids.index("classroom_chat_t-rp:3")
    # 新 live 帧从 :4 开始（3 条历史后续接）
    assert "classroom_chat_t-rp:4" in ids
    assert ids.index("classroom_chat_t-rp:4") > ids.index("classroom_chat_t-rp:3")
