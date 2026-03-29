from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from threading import RLock
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

COMPANION_TURN_TABLE = "xm_companion_turn"
WHITEBOARD_ACTION_LOG_TABLE = "xm_whiteboard_action_log"
KNOWLEDGE_CHAT_LOG_TABLE = "xm_knowledge_chat_log"


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

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _new_id(prefix: str) -> str:
        return f"{prefix}_{uuid4().hex[:12]}"

    def clear(self) -> None:
        with self._lock:
            self._companion_turns.clear()
            self._whiteboard_action_logs.clear()
            self._knowledge_chat_logs.clear()

    def save_companion_turn(self, request: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
        with self._lock:
            turn_id = self._new_id("turn")
            created_at = self._now()
            whiteboard_actions = [
                WhiteboardActionSnapshot(
                    action_id=self._new_id("wb"),
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
            chat_log_id = self._new_id("chat")
            created_at = self._now()
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
