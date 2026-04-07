"""伴学 / 知识检索长期记录与 RuoYi 数据格式之间的双向映射。

本模块提供：

- 写入方向（``*_to_ruoyi_payload``）：将快照或创建请求转换为
  RuoYi 后端可接受的 camelCase dict。
- 读取方向（``*_from_ruoyi_data`` / ``*_from_ruoyi_row``）：将
  RuoYi 返回的 camelCase dict 还原为 Pydantic 快照模型。
- 内部辅助函数：时间格式化、ID 生成、JSON 序列化等。

本模块不维护任何状态，所有函数均为纯函数或近似纯函数。
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.shared.ruoyi_mapper import RUOYI_DATETIME_FORMAT

from .long_term_models import (
    COMPANION_TURN_TABLE,
    KNOWLEDGE_CHAT_LOG_TABLE,
    WHITEBOARD_ACTION_LOG_TABLE,
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    ConversationDomain,
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    PersistenceStatus,
    SessionReplaySnapshot,
    SourceReference,
    WhiteboardActionSnapshot,
)


# ── 内部辅助函数 ──────────────────────────────────────────────────────

def _now() -> datetime:
    """返回当前 UTC 时间（带时区信息）。"""
    return datetime.now(timezone.utc)


def _new_id(prefix: str) -> str:
    """生成带前缀的短随机 ID（12 位十六进制）。"""
    return f"{prefix}_{uuid4().hex[:12]}"


def _format_ruoyi_datetime(value: datetime) -> str:
    """将 datetime 格式化为 RuoYi 后端接受的字符串格式。"""
    normalized = value.astimezone(timezone.utc) if value.tzinfo is not None else value
    return normalized.strftime(RUOYI_DATETIME_FORMAT)


def _parse_source_refs(raw_value: str | None) -> list[SourceReference]:
    """将 JSON 字符串反序列化为 SourceReference 列表。"""
    if not raw_value:
        return []
    loaded = json.loads(raw_value)
    return [SourceReference.model_validate(item) for item in loaded]


def _parse_string_list(raw_value: str | None) -> list[str]:
    """将 JSON 字符串反序列化为字符串列表。"""
    if not raw_value:
        return []
    loaded = json.loads(raw_value)
    return [str(item) for item in loaded]


def _dump_json(value: Any) -> str | None:
    """将值序列化为 JSON 字符串；空值返回 None。"""
    if value in (None, "", [], {}):
        return None
    return json.dumps(value, ensure_ascii=False)


# ── 写入方向：Snapshot / Request → RuoYi payload ─────────────────────

def companion_turn_to_ruoyi_payload(
    snapshot: CompanionTurnSnapshot | CompanionTurnCreateRequest,
) -> dict[str, Any]:
    """将 CompanionTurnSnapshot 或 CompanionTurnCreateRequest 转换为 RuoYi 写入 payload。

    两种入参共享相同的字段名，唯一差异在于 CreateRequest 的
    ``persistence_status`` 可能为 None（此时回退到 COMPLETE_SUCCESS）。
    """
    persistence_status = (
        snapshot.persistence_status or PersistenceStatus.COMPLETE_SUCCESS
    ).value
    anchor = snapshot.anchor

    return {
        "userId": snapshot.user_id,
        "sessionId": snapshot.session_id,
        "contextType": snapshot.context_type.value,
        "anchor": {
            "contextType": anchor.context_type.value,
            "anchorKind": anchor.anchor_kind.value,
            "anchorRef": anchor.anchor_ref,
            "scopeSummary": anchor.scope_summary,
            "scopeWindow": anchor.scope_window,
            "sourceIds": anchor.source_ids,
        },
        "questionText": snapshot.question_text,
        "answerSummary": snapshot.answer_summary,
        "sourceSummary": snapshot.source_summary,
        "sourceRefs": [
            item.model_dump(mode="python") for item in snapshot.source_refs
        ],
        "whiteboardDegraded": snapshot.whiteboard_degraded,
        "referenceMissing": snapshot.reference_missing,
        "overallFailed": snapshot.overall_failed,
        "persistenceStatus": persistence_status,
        "whiteboardActions": [
            {
                "actionType": item.action_type,
                "payload": item.payload,
                "objectRef": item.object_ref,
                "renderUri": item.render_uri,
                "renderState": item.render_state,
            }
            for item in snapshot.whiteboard_actions
        ],
    }


def knowledge_chat_to_ruoyi_payload(
    snapshot: KnowledgeChatSnapshot | KnowledgeChatCreateRequest,
) -> dict[str, Any]:
    """将 KnowledgeChatSnapshot 或 KnowledgeChatCreateRequest 转换为 RuoYi 写入 payload。

    两种入参共享相同的字段名，唯一差异在于 CreateRequest 的
    ``persistence_status`` 可能为 None（此时回退到 COMPLETE_SUCCESS）。
    """
    persistence_status = (
        snapshot.persistence_status or PersistenceStatus.COMPLETE_SUCCESS
    ).value
    retrieval_scope = snapshot.retrieval_scope

    return {
        "userId": snapshot.user_id,
        "sessionId": snapshot.session_id,
        "contextType": snapshot.context_type.value,
        "retrievalScope": {
            "contextType": retrieval_scope.context_type.value,
            "anchorKind": retrieval_scope.anchor_kind.value,
            "anchorRef": retrieval_scope.anchor_ref,
            "scopeSummary": retrieval_scope.scope_summary,
            "scopeWindow": retrieval_scope.scope_window,
            "sourceIds": retrieval_scope.source_ids,
        },
        "questionText": snapshot.question_text,
        "answerSummary": snapshot.answer_summary,
        "sourceSummary": snapshot.source_summary,
        "sourceRefs": [
            item.model_dump(mode="python") for item in snapshot.source_refs
        ],
        "referenceMissing": snapshot.reference_missing,
        "overallFailed": snapshot.overall_failed,
        "persistenceStatus": persistence_status,
    }


# ── 读取方向：RuoYi data → Snapshot ──────────────────────────────────

def whiteboard_action_from_ruoyi_row(
    payload: dict[str, Any],
) -> WhiteboardActionSnapshot:
    """将 RuoYi 返回的单行白板操作数据还原为 WhiteboardActionSnapshot。"""
    return WhiteboardActionSnapshot.model_validate(
        {
            "table_name": payload.get("tableName", WHITEBOARD_ACTION_LOG_TABLE),
            "action_id": payload["actionId"],
            "turn_id": payload["turnId"],
            "session_id": payload["sessionId"],
            "user_id": payload["userId"],
            "action_type": payload["actionType"],
            "payload": payload.get("payload") or {},
            "object_ref": payload.get("objectRef"),
            "render_uri": payload.get("renderUri"),
            "render_state": payload.get("renderState"),
            "created_at": payload["createdAt"],
        }
    )


def companion_turn_from_ruoyi_data(
    payload: dict[str, Any],
) -> CompanionTurnSnapshot:
    """将 RuoYi 返回的伴学轮次数据还原为 CompanionTurnSnapshot。"""
    return CompanionTurnSnapshot.model_validate(
        {
            "table_name": payload.get("tableName", COMPANION_TURN_TABLE),
            "turn_id": payload["turnId"],
            "session_id": payload["sessionId"],
            "user_id": payload["userId"],
            "context_type": payload["contextType"],
            "conversation_domain": payload.get(
                "conversationDomain", ConversationDomain.COMPANION.value
            ),
            "anchor": {
                "context_type": payload["anchor"]["contextType"],
                "anchor_kind": payload["anchor"]["anchorKind"],
                "anchor_ref": payload["anchor"]["anchorRef"],
                "scope_summary": payload["anchor"].get("scopeSummary"),
                "scope_window": payload["anchor"].get("scopeWindow"),
                "source_ids": payload["anchor"].get("sourceIds", []),
            },
            "question_text": payload["questionText"],
            "answer_summary": payload["answerSummary"],
            "source_summary": payload.get("sourceSummary"),
            "source_refs": [
                SourceReference.model_validate(item)
                for item in payload.get("sourceRefs", [])
            ],
            "whiteboard_actions": [
                whiteboard_action_from_ruoyi_row(action)
                for action in payload.get("whiteboardActions", [])
            ],
            "whiteboard_degraded": payload.get("whiteboardDegraded", False),
            "reference_missing": payload.get("referenceMissing", False),
            "overall_failed": payload.get("overallFailed", False),
            "persistence_status": payload["persistenceStatus"],
            "created_at": payload["createdAt"],
        }
    )


def knowledge_chat_from_ruoyi_data(
    payload: dict[str, Any],
) -> KnowledgeChatSnapshot:
    """将 RuoYi 返回的知识检索对话数据还原为 KnowledgeChatSnapshot。"""
    return KnowledgeChatSnapshot.model_validate(
        {
            "table_name": payload.get("tableName", KNOWLEDGE_CHAT_LOG_TABLE),
            "chat_log_id": payload["chatLogId"],
            "session_id": payload["sessionId"],
            "user_id": payload["userId"],
            "context_type": payload["contextType"],
            "conversation_domain": payload.get(
                "conversationDomain", ConversationDomain.EVIDENCE.value
            ),
            "retrieval_scope": {
                "context_type": payload["retrievalScope"]["contextType"],
                "anchor_kind": payload["retrievalScope"]["anchorKind"],
                "anchor_ref": payload["retrievalScope"]["anchorRef"],
                "scope_summary": payload["retrievalScope"].get("scopeSummary"),
                "scope_window": payload["retrievalScope"].get("scopeWindow"),
                "source_ids": payload["retrievalScope"].get("sourceIds", []),
            },
            "question_text": payload["questionText"],
            "answer_summary": payload["answerSummary"],
            "source_summary": payload.get("sourceSummary"),
            "source_refs": [
                SourceReference.model_validate(item)
                for item in payload.get("sourceRefs", [])
            ],
            "reference_missing": payload.get("referenceMissing", False),
            "overall_failed": payload.get("overallFailed", False),
            "persistence_status": payload["persistenceStatus"],
            "created_at": payload["createdAt"],
        }
    )


def session_replay_from_ruoyi_data(
    payload: dict[str, Any],
) -> SessionReplaySnapshot:
    """将 RuoYi 返回的会话回放数据还原为 SessionReplaySnapshot。"""
    return SessionReplaySnapshot(
        session_id=payload["sessionId"],
        storage_tables=payload.get(
            "storageTables",
            [
                COMPANION_TURN_TABLE,
                WHITEBOARD_ACTION_LOG_TABLE,
                KNOWLEDGE_CHAT_LOG_TABLE,
            ],
        ),
        companion_turns=[
            companion_turn_from_ruoyi_data(item)
            for item in payload.get("companionTurns", [])
        ],
        whiteboard_action_logs=[
            whiteboard_action_from_ruoyi_row(item)
            for item in payload.get("whiteboardActionLogs", [])
        ],
        knowledge_chat_logs=[
            knowledge_chat_from_ruoyi_data(item)
            for item in payload.get("knowledgeChatLogs", [])
        ],
    )
