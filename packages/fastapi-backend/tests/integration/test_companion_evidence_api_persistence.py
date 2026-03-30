import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.features.companion.service import CompanionService
from app.features.knowledge.service import KnowledgeService
from app.main import create_app
import app.features.companion.routes as companion_routes
import app.features.knowledge.routes as knowledge_routes
from app.shared.ruoyi_client import RuoYiClient


def _build_client_factory(handler):
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return factory


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    state = {
        "companion_turns": [],
        "knowledge_chat_logs": [],
    }

    def _build_companion_row(payload: dict[str, object]) -> dict[str, object]:
        turn_id = f"turn_{len(state['companion_turns']) + 1:03d}"
        created_at = "2026-03-29 15:00:00"
        whiteboard_actions = [
            {
                "tableName": "xm_whiteboard_action_log",
                "actionId": f"wb_{index:03d}",
                "turnId": turn_id,
                "sessionId": payload["sessionId"],
                "userId": payload["userId"],
                "actionType": item["actionType"],
                "payload": item.get("payload") or {},
                "objectRef": item.get("objectRef"),
                "renderUri": item.get("renderUri"),
                "renderState": item.get("renderState"),
                "createdAt": created_at,
            }
            for index, item in enumerate(payload.get("whiteboardActions", []), start=1)
        ]
        return {
            "tableName": "xm_companion_turn",
            "turnId": turn_id,
            "sessionId": payload["sessionId"],
            "userId": payload["userId"],
            "contextType": payload["contextType"],
            "conversationDomain": "companion",
            "anchor": payload["anchor"],
            "questionText": payload["questionText"],
            "answerSummary": payload["answerSummary"],
            "sourceSummary": payload.get("sourceSummary"),
            "sourceRefs": payload.get("sourceRefs", []),
            "whiteboardActions": whiteboard_actions,
            "whiteboardDegraded": payload.get("whiteboardDegraded", False),
            "referenceMissing": payload.get("referenceMissing", False),
            "overallFailed": payload.get("overallFailed", False),
            "persistenceStatus": payload["persistenceStatus"],
            "createdAt": created_at,
        }

    def _build_knowledge_row(payload: dict[str, object]) -> dict[str, object]:
        chat_log_id = f"chat_{len(state['knowledge_chat_logs']) + 1:03d}"
        created_at = "2026-03-29 15:05:00"
        return {
            "tableName": "xm_knowledge_chat_log",
            "chatLogId": chat_log_id,
            "sessionId": payload["sessionId"],
            "userId": payload["userId"],
            "contextType": payload["contextType"],
            "conversationDomain": "evidence",
            "retrievalScope": payload["retrievalScope"],
            "questionText": payload["questionText"],
            "answerSummary": payload["answerSummary"],
            "sourceSummary": payload.get("sourceSummary"),
            "sourceRefs": payload.get("sourceRefs", []),
            "referenceMissing": payload.get("referenceMissing", False),
            "overallFailed": payload.get("overallFailed", False),
            "persistenceStatus": payload["persistenceStatus"],
            "createdAt": created_at,
        }

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        path = request.url.path
        if request.method == "POST" and path == "/internal/xiaomai/companion/turns":
            row = _build_companion_row(payload)
            state["companion_turns"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "GET" and path.startswith("/internal/xiaomai/companion/turns/"):
            turn_id = path.rsplit("/", 1)[-1]
            row = next((item for item in state["companion_turns"] if item["turnId"] == turn_id), None)
            if row is None:
                return httpx.Response(200, json={"code": 404, "msg": "not found", "data": None})
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "GET" and path.startswith("/internal/xiaomai/companion/sessions/") and path.endswith("/replay"):
            session_id = path.split("/")[-2]
            companion_turns = [item for item in state["companion_turns"] if item["sessionId"] == session_id]
            whiteboard_actions = [
                action
                for item in companion_turns
                for action in item.get("whiteboardActions", [])
            ]
            knowledge_chat_logs = [item for item in state["knowledge_chat_logs"] if item["sessionId"] == session_id]
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "msg": "ok",
                    "data": {
                        "sessionId": session_id,
                        "storageTables": [
                            "xm_companion_turn",
                            "xm_whiteboard_action_log",
                            "xm_knowledge_chat_log",
                        ],
                        "companionTurns": companion_turns,
                        "whiteboardActionLogs": whiteboard_actions,
                        "knowledgeChatLogs": knowledge_chat_logs,
                    },
                },
            )
        if request.method == "POST" and path == "/internal/xiaomai/knowledge/chat-logs":
            row = _build_knowledge_row(payload)
            state["knowledge_chat_logs"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "GET" and path.startswith("/internal/xiaomai/knowledge/chat-logs/"):
            chat_log_id = path.rsplit("/", 1)[-1]
            row = next((item for item in state["knowledge_chat_logs"] if item["chatLogId"] == chat_log_id), None)
            if row is None:
                return httpx.Response(200, json={"code": 404, "msg": "not found", "data": None})
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    monkeypatch.setattr(companion_routes, "service", CompanionService(client_factory=_build_client_factory(handler)))
    monkeypatch.setattr(knowledge_routes, "service", KnowledgeService(client_factory=_build_client_factory(handler)))
    return TestClient(create_app())


def test_companion_turn_roundtrip_via_api(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/companion/turns",
        json={
            "user_id": "student-200",
            "session_id": "session-video-200",
            "context_type": "video",
            "anchor": {
                "context_type": "video",
                "anchor_kind": "video_timestamp",
                "anchor_ref": "00:08:18",
                "scope_summary": "视频第 2 段",
                "source_ids": ["video-source-1"],
            },
            "question_text": "这一步为什么要先归一化？",
            "answer_summary": "先归一化可以稳定后续的比较过程。",
            "source_summary": "视频内容与白板步骤",
            "source_refs": [
                {
                    "source_id": "video-source-1",
                    "source_title": "视频分镜 2",
                    "source_kind": "video",
                    "source_anchor": "00:08:18",
                }
            ],
            "whiteboard_actions": [
                {
                    "action_type": "highlight",
                    "payload": {"color": "amber"},
                    "object_ref": "wb-step-2",
                    "render_state": "rendered",
                }
            ],
        },
    )

    payload = create_response.json()
    turn_id = payload["turn_id"]

    assert create_response.status_code == 200
    assert payload["table_name"] == "xm_companion_turn"
    assert payload["user_id"] == "student-200"
    assert payload["persistence_status"] == "complete_success"
    assert payload["whiteboard_actions"][0]["object_ref"] == "wb-step-2"

    fetch_response = client.get(f"/api/v1/companion/turns/{turn_id}")
    replay_response = client.get("/api/v1/companion/sessions/session-video-200/replay")

    assert fetch_response.status_code == 200
    assert fetch_response.json()["question_text"] == "这一步为什么要先归一化？"
    assert replay_response.status_code == 200
    assert replay_response.json()["companion_turns"][0]["turn_id"] == turn_id
    assert replay_response.json()["whiteboard_action_logs"][0]["table_name"] == "xm_whiteboard_action_log"


def test_knowledge_chat_roundtrip_and_session_replay_via_api(client: TestClient) -> None:
    chat_response = client.post(
        "/api/v1/knowledge/chat-logs",
        json={
            "user_id": "student-201",
            "session_id": "session-document-200",
            "context_type": "document",
            "retrieval_scope": {
                "context_type": "document",
                "anchor_kind": "document_range",
                "anchor_ref": "appendix-b:section-1",
                "scope_summary": "附录 B 第 1 节",
                "source_ids": ["doc-11"],
            },
            "question_text": "这个概念在资料里如何定义？",
            "answer_summary": "资料把它定义为带有边界条件的解释性对象。",
            "source_summary": "证据索引只返回章节级来源",
            "reference_missing": True,
        },
    )

    companion_response = client.post(
        "/api/v1/companion/turns",
        json={
            "user_id": "student-201",
            "session_id": "session-document-200",
            "context_type": "document",
            "anchor": {
                "context_type": "document",
                "anchor_kind": "document_range",
                "anchor_ref": "appendix-b:section-1",
                "scope_summary": "附录 B 第 1 节",
                "source_ids": ["doc-11"],
            },
            "question_text": "继续解释这段内容。",
            "answer_summary": "可以把它理解成对上一步证据的补充说明。",
        },
    )

    chat_payload = chat_response.json()
    replay_response = client.get("/api/v1/companion/sessions/session-document-200/replay")

    assert chat_response.status_code == 200
    assert chat_payload["table_name"] == "xm_knowledge_chat_log"
    assert chat_payload["persistence_status"] == "reference_missing"
    assert chat_payload["retrieval_scope"]["anchor_ref"] == "appendix-b:section-1"
    assert companion_response.status_code == 200
    assert replay_response.status_code == 200
    assert replay_response.json()["storage_tables"] == [
        "xm_companion_turn",
        "xm_whiteboard_action_log",
        "xm_knowledge_chat_log",
    ]
    assert len(replay_response.json()["knowledge_chat_logs"]) == 1
    assert len(replay_response.json()["companion_turns"]) == 1
