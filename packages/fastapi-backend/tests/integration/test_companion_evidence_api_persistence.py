import pytest
from fastapi.testclient import TestClient

from app.features.companion.long_term_records import shared_long_term_repository
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_long_term_repository() -> None:
    shared_long_term_repository.clear()
    yield
    shared_long_term_repository.clear()


def test_companion_turn_roundtrip_via_api() -> None:
    client = TestClient(create_app())

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
                "source_ids": ["video-source-1"]
            },
            "question_text": "这一步为什么要先归一化？",
            "answer_summary": "先归一化可以稳定后续的比较过程。",
            "source_summary": "视频内容与白板步骤",
            "source_refs": [
                {
                    "source_id": "video-source-1",
                    "source_title": "视频分镜 2",
                    "source_kind": "video",
                    "source_anchor": "00:08:18"
                }
            ],
            "whiteboard_actions": [
                {
                    "action_type": "highlight",
                    "payload": {"color": "amber"},
                    "object_ref": "wb-step-2",
                    "render_state": "rendered"
                }
            ]
        }
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


def test_knowledge_chat_roundtrip_and_session_replay_via_api() -> None:
    client = TestClient(create_app())

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
                "source_ids": ["doc-11"]
            },
            "question_text": "这个概念在资料里如何定义？",
            "answer_summary": "资料把它定义为带有边界条件的解释性对象。",
            "source_summary": "证据索引只返回章节级来源",
            "reference_missing": True
        }
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
                "source_ids": ["doc-11"]
            },
            "question_text": "继续解释这段内容。",
            "answer_summary": "可以把它理解成对上一步证据的补充说明。"
        }
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
        "xm_knowledge_chat_log"
    ]
    assert len(replay_response.json()["knowledge_chat_logs"]) == 1
    assert len(replay_response.json()["companion_turns"]) == 1
