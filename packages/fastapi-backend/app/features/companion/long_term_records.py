from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from threading import RLock
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

from app.shared.ruoyi_mapper import RUOYI_DATETIME_FORMAT

COMPANION_TURN_TABLE = "xm_companion_turn"
WHITEBOARD_ACTION_LOG_TABLE = "xm_whiteboard_action_log"
KNOWLEDGE_CHAT_LOG_TABLE = "xm_knowledge_chat_log"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _format_ruoyi_datetime(value: datetime) -> str:
    normalized = value.astimezone(timezone.utc) if value.tzinfo is not None else value
    return normalized.strftime(RUOYI_DATETIME_FORMAT)


def _parse_source_refs(raw_value: str | None) -> list["SourceReference"]:
    if not raw_value:
        return []
    loaded = json.loads(raw_value)
    return [SourceReference.model_validate(item) for item in loaded]


def _parse_string_list(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    loaded = json.loads(raw_value)
    return [str(item) for item in loaded]


def _dump_json(value: Any) -> str | None:
    if value in (None, "", [], {}):
        return None
    return json.dumps(value, ensure_ascii=False)


class ConversationDomain(str, Enum):
    COMPANION = "companion"
    EVIDENCE = "evidence"


class ContextType(str, Enum):
    VIDEO = "video"
    CLASSROOM = "classroom"
    LEARNING = "learning"
    DOCUMENT = "document"
    MIXED = "mixed"


class AnchorKind(str, Enum):
    VIDEO_TIMESTAMP = "video_timestamp"
    SLIDE_ID = "slide_id"
    WHITEBOARD_STEP_ID = "whiteboard_step_id"
    DOCUMENT_RANGE = "document_range"
    TOPIC = "topic"


class PersistenceStatus(str, Enum):
    COMPLETE_SUCCESS = "complete_success"
    WHITEBOARD_DEGRADED = "whiteboard_degraded"
    REFERENCE_MISSING = "reference_missing"
    PARTIAL_FAILURE = "partial_failure"
    OVERALL_FAILURE = "overall_failure"


class SourceReference(BaseModel):
    source_id: str
    source_title: str | None = None
    source_kind: str | None = None
    source_anchor: str | None = None
    source_excerpt: str | None = None
    source_uri: str | None = None
    source_score: float | None = None


class AnchorContext(BaseModel):
    context_type: ContextType
    anchor_kind: AnchorKind
    anchor_ref: str
    scope_summary: str | None = None
    scope_window: str | None = None
    source_ids: list[str] = Field(default_factory=list)


class WhiteboardActionRecord(BaseModel):
    action_type: str
    payload: dict[str, object] = Field(default_factory=dict)
    object_ref: str | None = None
    render_uri: str | None = None
    render_state: str | None = None


class CompanionTurnCreateRequest(BaseModel):
    user_id: str
    session_id: str
    context_type: ContextType
    anchor: AnchorContext
    question_text: str
    answer_summary: str
    source_summary: str | None = None
    source_refs: list[SourceReference] = Field(default_factory=list)
    whiteboard_actions: list[WhiteboardActionRecord] = Field(default_factory=list)
    whiteboard_degraded: bool = False
    reference_missing: bool = False
    overall_failed: bool = False
    persistence_status: PersistenceStatus | None = None

    @model_validator(mode="after")
    def populate_persistence_status(self) -> "CompanionTurnCreateRequest":
        if self.persistence_status is not None:
            return self

        if self.overall_failed:
            self.persistence_status = PersistenceStatus.OVERALL_FAILURE
        elif self.whiteboard_degraded and self.reference_missing:
            self.persistence_status = PersistenceStatus.PARTIAL_FAILURE
        elif self.whiteboard_degraded:
            self.persistence_status = PersistenceStatus.WHITEBOARD_DEGRADED
        elif self.reference_missing:
            self.persistence_status = PersistenceStatus.REFERENCE_MISSING
        else:
            self.persistence_status = PersistenceStatus.COMPLETE_SUCCESS
        return self


class KnowledgeChatCreateRequest(BaseModel):
    user_id: str
    session_id: str
    context_type: ContextType
    retrieval_scope: AnchorContext
    question_text: str
    answer_summary: str
    source_summary: str | None = None
    source_refs: list[SourceReference] = Field(default_factory=list)
    reference_missing: bool = False
    overall_failed: bool = False
    persistence_status: PersistenceStatus | None = None

    @model_validator(mode="after")
    def populate_persistence_status(self) -> "KnowledgeChatCreateRequest":
        if self.persistence_status is not None:
            return self

        if self.overall_failed:
            self.persistence_status = PersistenceStatus.OVERALL_FAILURE
        elif self.reference_missing:
            self.persistence_status = PersistenceStatus.REFERENCE_MISSING
        else:
            self.persistence_status = PersistenceStatus.COMPLETE_SUCCESS
        return self


class WhiteboardActionSnapshot(WhiteboardActionRecord):
    table_name: str = WHITEBOARD_ACTION_LOG_TABLE
    action_id: str
    turn_id: str
    session_id: str
    user_id: str
    created_at: datetime


class CompanionTurnSnapshot(BaseModel):
    table_name: str = COMPANION_TURN_TABLE
    turn_id: str
    session_id: str
    user_id: str
    context_type: ContextType
    conversation_domain: ConversationDomain = ConversationDomain.COMPANION
    anchor: AnchorContext
    question_text: str
    answer_summary: str
    source_summary: str | None = None
    source_refs: list[SourceReference] = Field(default_factory=list)
    whiteboard_actions: list[WhiteboardActionSnapshot] = Field(default_factory=list)
    whiteboard_degraded: bool = False
    reference_missing: bool = False
    overall_failed: bool = False
    persistence_status: PersistenceStatus
    created_at: datetime


class KnowledgeChatSnapshot(BaseModel):
    table_name: str = KNOWLEDGE_CHAT_LOG_TABLE
    chat_log_id: str
    session_id: str
    user_id: str
    context_type: ContextType
    conversation_domain: ConversationDomain = ConversationDomain.EVIDENCE
    retrieval_scope: AnchorContext
    question_text: str
    answer_summary: str
    source_summary: str | None = None
    source_refs: list[SourceReference] = Field(default_factory=list)
    reference_missing: bool = False
    overall_failed: bool = False
    persistence_status: PersistenceStatus
    created_at: datetime


class SessionReplaySnapshot(BaseModel):
    session_id: str
    storage_tables: list[str] = Field(
        default_factory=lambda: [
            COMPANION_TURN_TABLE,
            WHITEBOARD_ACTION_LOG_TABLE,
            KNOWLEDGE_CHAT_LOG_TABLE
        ]
    )
    companion_turns: list[CompanionTurnSnapshot] = Field(default_factory=list)
    whiteboard_action_logs: list[WhiteboardActionSnapshot] = Field(default_factory=list)
    knowledge_chat_logs: list[KnowledgeChatSnapshot] = Field(default_factory=list)


class LongTermConversationRepository:
    """用于 Story 10.5 的内存回写仓库，便于测试长期结构与恢复语义。"""

    def __init__(self) -> None:
        self._lock = RLock()
        self._companion_turns: dict[str, CompanionTurnSnapshot] = {}
        self._whiteboard_action_logs: dict[str, WhiteboardActionSnapshot] = {}
        self._knowledge_chat_logs: dict[str, KnowledgeChatSnapshot] = {}

    def clear(self) -> None:
        with self._lock:
            self._companion_turns.clear()
            self._whiteboard_action_logs.clear()
            self._knowledge_chat_logs.clear()

    def save_companion_turn(self, request: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
        with self._lock:
            turn_id = _new_id("turn")
            created_at = _now()
            whiteboard_actions = [
                WhiteboardActionSnapshot(
                    action_id=_new_id("wb"),
                    turn_id=turn_id,
                    session_id=request.session_id,
                    user_id=request.user_id,
                    created_at=created_at,
                    **action.model_dump()
                )
                for action in request.whiteboard_actions
            ]
            snapshot = CompanionTurnSnapshot(
                turn_id=turn_id,
                session_id=request.session_id,
                user_id=request.user_id,
                context_type=request.context_type,
                anchor=request.anchor,
                question_text=request.question_text,
                answer_summary=request.answer_summary,
                source_summary=request.source_summary,
                source_refs=request.source_refs,
                whiteboard_actions=whiteboard_actions,
                whiteboard_degraded=request.whiteboard_degraded,
                reference_missing=request.reference_missing,
                overall_failed=request.overall_failed,
                persistence_status=request.persistence_status or PersistenceStatus.COMPLETE_SUCCESS,
                created_at=created_at
            )
            self._companion_turns[turn_id] = snapshot
            for action in whiteboard_actions:
                self._whiteboard_action_logs[action.action_id] = action
            return snapshot

    def save_knowledge_chat(self, request: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
        with self._lock:
            chat_log_id = _new_id("chat")
            created_at = _now()
            snapshot = KnowledgeChatSnapshot(
                chat_log_id=chat_log_id,
                session_id=request.session_id,
                user_id=request.user_id,
                context_type=request.context_type,
                retrieval_scope=request.retrieval_scope,
                question_text=request.question_text,
                answer_summary=request.answer_summary,
                source_summary=request.source_summary,
                source_refs=request.source_refs,
                reference_missing=request.reference_missing,
                overall_failed=request.overall_failed,
                persistence_status=request.persistence_status or PersistenceStatus.COMPLETE_SUCCESS,
                created_at=created_at
            )
            self._knowledge_chat_logs[chat_log_id] = snapshot
            return snapshot

    def get_companion_turn(self, turn_id: str) -> CompanionTurnSnapshot | None:
        with self._lock:
            return self._companion_turns.get(turn_id)

    def get_knowledge_chat(self, chat_log_id: str) -> KnowledgeChatSnapshot | None:
        with self._lock:
            return self._knowledge_chat_logs.get(chat_log_id)

    def replay_session(self, session_id: str) -> SessionReplaySnapshot:
        with self._lock:
            companion_turns = sorted(
                (turn for turn in self._companion_turns.values() if turn.session_id == session_id),
                key=lambda turn: turn.created_at
            )
            whiteboard_action_logs = sorted(
                (action for action in self._whiteboard_action_logs.values() if action.session_id == session_id),
                key=lambda action: action.created_at
            )
            knowledge_chat_logs = sorted(
                (chat for chat in self._knowledge_chat_logs.values() if chat.session_id == session_id),
                key=lambda chat: chat.created_at
            )
            return SessionReplaySnapshot(
                session_id=session_id,
                companion_turns=companion_turns,
                whiteboard_action_logs=whiteboard_action_logs,
                knowledge_chat_logs=knowledge_chat_logs
            )


shared_long_term_repository = LongTermConversationRepository()


def build_companion_turn_snapshot(
    request: CompanionTurnCreateRequest,
    *,
    turn_id: str | None = None,
    created_at: datetime | None = None
) -> CompanionTurnSnapshot:
    normalized_created_at = created_at or _now()
    normalized_turn_id = turn_id or _new_id("turn")
    whiteboard_actions = [
        WhiteboardActionSnapshot(
            action_id=_new_id("wb"),
            turn_id=normalized_turn_id,
            session_id=request.session_id,
            user_id=request.user_id,
            created_at=normalized_created_at,
            **action.model_dump()
        )
        for action in request.whiteboard_actions
    ]
    return CompanionTurnSnapshot(
        turn_id=normalized_turn_id,
        session_id=request.session_id,
        user_id=request.user_id,
        context_type=request.context_type,
        anchor=request.anchor,
        question_text=request.question_text,
        answer_summary=request.answer_summary,
        source_summary=request.source_summary,
        source_refs=request.source_refs,
        whiteboard_actions=whiteboard_actions,
        whiteboard_degraded=request.whiteboard_degraded,
        reference_missing=request.reference_missing,
        overall_failed=request.overall_failed,
        persistence_status=request.persistence_status or PersistenceStatus.COMPLETE_SUCCESS,
        created_at=normalized_created_at
    )


def build_knowledge_chat_snapshot(
    request: KnowledgeChatCreateRequest,
    *,
    chat_log_id: str | None = None,
    created_at: datetime | None = None
) -> KnowledgeChatSnapshot:
    normalized_created_at = created_at or _now()
    normalized_chat_log_id = chat_log_id or _new_id("chat")
    return KnowledgeChatSnapshot(
        chat_log_id=normalized_chat_log_id,
        session_id=request.session_id,
        user_id=request.user_id,
        context_type=request.context_type,
        retrieval_scope=request.retrieval_scope,
        question_text=request.question_text,
        answer_summary=request.answer_summary,
        source_summary=request.source_summary,
        source_refs=request.source_refs,
        reference_missing=request.reference_missing,
        overall_failed=request.overall_failed,
        persistence_status=request.persistence_status or PersistenceStatus.COMPLETE_SUCCESS,
        created_at=normalized_created_at
    )


def companion_turn_to_ruoyi_payload(snapshot: CompanionTurnSnapshot | CompanionTurnCreateRequest) -> dict[str, Any]:
    if isinstance(snapshot, CompanionTurnCreateRequest):
        user_id = snapshot.user_id
        session_id = snapshot.session_id
        context_type = snapshot.context_type.value
        anchor = snapshot.anchor
        question_text = snapshot.question_text
        answer_summary = snapshot.answer_summary
        source_summary = snapshot.source_summary
        source_refs = snapshot.source_refs
        whiteboard_actions = snapshot.whiteboard_actions
        whiteboard_degraded = snapshot.whiteboard_degraded
        reference_missing = snapshot.reference_missing
        overall_failed = snapshot.overall_failed
        persistence_status = (snapshot.persistence_status or PersistenceStatus.COMPLETE_SUCCESS).value
    else:
        user_id = snapshot.user_id
        session_id = snapshot.session_id
        context_type = snapshot.context_type.value
        anchor = snapshot.anchor
        question_text = snapshot.question_text
        answer_summary = snapshot.answer_summary
        source_summary = snapshot.source_summary
        source_refs = snapshot.source_refs
        whiteboard_actions = snapshot.whiteboard_actions
        whiteboard_degraded = snapshot.whiteboard_degraded
        reference_missing = snapshot.reference_missing
        overall_failed = snapshot.overall_failed
        persistence_status = snapshot.persistence_status.value

    return {
        "userId": user_id,
        "sessionId": session_id,
        "contextType": context_type,
        "anchor": {
            "contextType": anchor.context_type.value,
            "anchorKind": anchor.anchor_kind.value,
            "anchorRef": anchor.anchor_ref,
            "scopeSummary": anchor.scope_summary,
            "scopeWindow": anchor.scope_window,
            "sourceIds": anchor.source_ids,
        },
        "questionText": question_text,
        "answerSummary": answer_summary,
        "sourceSummary": source_summary,
        "sourceRefs": [item.model_dump(mode="python") for item in source_refs],
        "whiteboardDegraded": whiteboard_degraded,
        "referenceMissing": reference_missing,
        "overallFailed": overall_failed,
        "persistenceStatus": persistence_status,
        "whiteboardActions": [
            {
                "actionType": item.action_type,
                "payload": item.payload,
                "objectRef": item.object_ref,
                "renderUri": item.render_uri,
                "renderState": item.render_state,
            }
            for item in whiteboard_actions
        ],
    }


def knowledge_chat_to_ruoyi_payload(snapshot: KnowledgeChatSnapshot | KnowledgeChatCreateRequest) -> dict[str, Any]:
    if isinstance(snapshot, KnowledgeChatCreateRequest):
        user_id = snapshot.user_id
        session_id = snapshot.session_id
        context_type = snapshot.context_type.value
        retrieval_scope = snapshot.retrieval_scope
        question_text = snapshot.question_text
        answer_summary = snapshot.answer_summary
        source_summary = snapshot.source_summary
        source_refs = snapshot.source_refs
        reference_missing = snapshot.reference_missing
        overall_failed = snapshot.overall_failed
        persistence_status = (snapshot.persistence_status or PersistenceStatus.COMPLETE_SUCCESS).value
    else:
        user_id = snapshot.user_id
        session_id = snapshot.session_id
        context_type = snapshot.context_type.value
        retrieval_scope = snapshot.retrieval_scope
        question_text = snapshot.question_text
        answer_summary = snapshot.answer_summary
        source_summary = snapshot.source_summary
        source_refs = snapshot.source_refs
        reference_missing = snapshot.reference_missing
        overall_failed = snapshot.overall_failed
        persistence_status = snapshot.persistence_status.value

    return {
        "userId": user_id,
        "sessionId": session_id,
        "contextType": context_type,
        "retrievalScope": {
            "contextType": retrieval_scope.context_type.value,
            "anchorKind": retrieval_scope.anchor_kind.value,
            "anchorRef": retrieval_scope.anchor_ref,
            "scopeSummary": retrieval_scope.scope_summary,
            "scopeWindow": retrieval_scope.scope_window,
            "sourceIds": retrieval_scope.source_ids,
        },
        "questionText": question_text,
        "answerSummary": answer_summary,
        "sourceSummary": source_summary,
        "sourceRefs": [item.model_dump(mode="python") for item in source_refs],
        "referenceMissing": reference_missing,
        "overallFailed": overall_failed,
        "persistenceStatus": persistence_status,
    }


def whiteboard_action_from_ruoyi_row(payload: dict[str, Any]) -> WhiteboardActionSnapshot:
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


def companion_turn_from_ruoyi_data(payload: dict[str, Any]) -> CompanionTurnSnapshot:
    return CompanionTurnSnapshot.model_validate(
        {
            "table_name": payload.get("tableName", COMPANION_TURN_TABLE),
            "turn_id": payload["turnId"],
            "session_id": payload["sessionId"],
            "user_id": payload["userId"],
            "context_type": payload["contextType"],
            "conversation_domain": payload.get("conversationDomain", ConversationDomain.COMPANION.value),
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


def knowledge_chat_from_ruoyi_data(payload: dict[str, Any]) -> KnowledgeChatSnapshot:
    return KnowledgeChatSnapshot.model_validate(
        {
            "table_name": payload.get("tableName", KNOWLEDGE_CHAT_LOG_TABLE),
            "chat_log_id": payload["chatLogId"],
            "session_id": payload["sessionId"],
            "user_id": payload["userId"],
            "context_type": payload["contextType"],
            "conversation_domain": payload.get("conversationDomain", ConversationDomain.EVIDENCE.value),
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


def session_replay_from_ruoyi_data(payload: dict[str, Any]) -> SessionReplaySnapshot:
    return SessionReplaySnapshot(
        session_id=payload["sessionId"],
        storage_tables=payload.get(
            "storageTables",
            [COMPANION_TURN_TABLE, WHITEBOARD_ACTION_LOG_TABLE, KNOWLEDGE_CHAT_LOG_TABLE],
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
