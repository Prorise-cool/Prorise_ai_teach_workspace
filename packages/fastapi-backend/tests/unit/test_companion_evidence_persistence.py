import asyncio
import json

import httpx

from app.features.companion.long_term_records import (
    AnchorContext,
    AnchorKind,
    CompanionTurnCreateRequest,
    ContextType,
    KnowledgeChatCreateRequest,
    PersistenceStatus,
    SourceReference,
    WhiteboardActionRecord,
)
from app.features.companion.service import CompanionService
from app.features.knowledge.service import KnowledgeService
from app.shared.ruoyi_client import RuoYiClient


def _build_client_factory(state: dict[str, list[dict]]) -> callable:
    def _build_companion_row(payload: dict[str, object]) -> dict[str, object]:
        turn_id = f"turn_{len(state['companion']) + 1:03d}"
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
        chat_log_id = f"chat_{len(state['knowledge']) + 1:03d}"
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
            state["companion"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})

        if request.method == "GET" and path.startswith("/internal/xiaomai/companion/turns/"):
            turn_id = path.rsplit("/", 1)[-1]
            row = next((item for item in state["companion"] if item["turnId"] == turn_id), None)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})

        if request.method == "GET" and path.startswith("/internal/xiaomai/companion/sessions/") and path.endswith("/replay"):
            session_id = path.split("/")[-2]
            companion_turns = [item for item in state["companion"] if item["sessionId"] == session_id]
            whiteboard_actions = [
                action
                for turn in companion_turns
                for action in turn.get("whiteboardActions", [])
            ]
            knowledge_chat_logs = [item for item in state["knowledge"] if item["sessionId"] == session_id]
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
            state["knowledge"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})

        if request.method == "GET" and path.startswith("/internal/xiaomai/knowledge/chat-logs/"):
            chat_log_id = path.rsplit("/", 1)[-1]
            row = next((item for item in state["knowledge"] if item["chatLogId"] == chat_log_id), None)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})

        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return client_factory


def test_companion_turn_service_persists_partial_failure_and_replays_from_ruoyi() -> None:
    state = {"companion": [], "knowledge": []}
    companion_service = CompanionService(client_factory=_build_client_factory(state))

    request = CompanionTurnCreateRequest(
        user_id="student-001",
        session_id="session-video-001",
        context_type=ContextType.VIDEO,
        anchor=AnchorContext(
            context_type=ContextType.VIDEO,
            anchor_kind=AnchorKind.VIDEO_TIMESTAMP,
            anchor_ref="00:12:34",
            scope_summary="视频第 3 段",
            source_ids=["source-video-1"],
        ),
        question_text="这里为什么要这么做？",
        answer_summary="因为这一步用于固定符号定义。",
        source_summary="视频脚本与板书笔记",
        source_refs=[
            SourceReference(
                source_id="source-video-1",
                source_title="视频分镜 3",
                source_kind="video",
                source_anchor="00:12:34",
            )
        ],
        whiteboard_actions=[
            WhiteboardActionRecord(
                action_type="draw-box",
                payload={"x": 12, "y": 18, "width": 120, "height": 40},
                object_ref="wb-node-1",
                render_state="degraded",
            )
        ],
        whiteboard_degraded=True,
        reference_missing=True,
    )

    snapshot = asyncio.run(companion_service.persist_turn(request))
    fetched = asyncio.run(companion_service.get_turn(snapshot.turn_id))
    replay = asyncio.run(companion_service.replay_session("session-video-001"))

    assert snapshot.persistence_status == PersistenceStatus.PARTIAL_FAILURE
    assert snapshot.table_name == "xm_companion_turn"
    assert fetched is not None
    assert fetched.user_id == "student-001"
    assert fetched.whiteboard_actions[0].table_name == "xm_whiteboard_action_log"
    assert replay.whiteboard_action_logs[0].object_ref == "wb-node-1"
    assert replay.companion_turns[0].source_refs[0].source_title == "视频分镜 3"


def test_knowledge_chat_service_persists_reference_missing_without_losing_scope() -> None:
    state = {"companion": [], "knowledge": []}
    knowledge_service = KnowledgeService(client_factory=_build_client_factory(state))

    request = KnowledgeChatCreateRequest(
        user_id="student-002",
        session_id="session-document-001",
        context_type=ContextType.DOCUMENT,
        retrieval_scope=AnchorContext(
            context_type=ContextType.DOCUMENT,
            anchor_kind=AnchorKind.DOCUMENT_RANGE,
            anchor_ref="chapter-2:paragraph-4",
            scope_summary="教材第 2 章第 4 段",
            source_ids=["doc-1", "doc-2"],
        ),
        question_text="教材里对这个术语的定义是什么？",
        answer_summary="教材给出的定义强调边界条件与适用范围。",
        source_summary="仅命中章节标题，未命中原文段落",
        reference_missing=True,
    )

    snapshot = asyncio.run(knowledge_service.persist_chat_log(request))
    fetched = asyncio.run(knowledge_service.get_chat_log(snapshot.chat_log_id))

    assert snapshot.persistence_status == PersistenceStatus.REFERENCE_MISSING
    assert snapshot.table_name == "xm_knowledge_chat_log"
    assert fetched is not None
    assert fetched.retrieval_scope.anchor_ref == "chapter-2:paragraph-4"
    assert fetched.source_summary == "仅命中章节标题，未命中原文段落"
