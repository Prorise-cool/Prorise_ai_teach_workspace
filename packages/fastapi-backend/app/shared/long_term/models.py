"""伴学 / 知识检索长期记录的共享数据模型。

本模块定义了伴学（companion）与知识检索（evidence / knowledge）两条
对话链路在长期持久化中使用的所有枚举、值对象与 Pydantic 模型，包括：

- 领域枚举：ConversationDomain, ContextType, AnchorKind, PersistenceStatus
- 值对象：SourceReference, AnchorContext, WhiteboardActionRecord
- 创建请求：CompanionTurnCreateRequest, KnowledgeChatCreateRequest
- 快照模型：WhiteboardActionSnapshot, CompanionTurnSnapshot,
             KnowledgeChatSnapshot, SessionReplaySnapshot

本模块不包含任何 I/O 操作或副作用，仅定义纯数据结构。
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator

# ── 表名常量 ──────────────────────────────────────────────────────────

COMPANION_TURN_TABLE = "xm_companion_turn"
"""伴学对话轮次的 RuoYi 业务表名。"""

WHITEBOARD_ACTION_LOG_TABLE = "xm_whiteboard_action_log"
"""白板操作日志的 RuoYi 业务表名。"""

KNOWLEDGE_CHAT_LOG_TABLE = "xm_knowledge_chat_log"
"""知识检索对话日志的 RuoYi 业务表名。"""


# ── 枚举 ──────────────────────────────────────────────────────────────

class ConversationDomain(str, Enum):
    """对话所属的业务领域。"""

    COMPANION = "companion"
    EVIDENCE = "evidence"


class ContextType(str, Enum):
    """锚点关联的上下文类型。"""

    VIDEO = "video"
    CLASSROOM = "classroom"
    LEARNING = "learning"
    DOCUMENT = "document"
    MIXED = "mixed"


class AnchorKind(str, Enum):
    """锚点的具体种类，标识对话定位到的资源片段类型。"""

    VIDEO_TIMESTAMP = "video_timestamp"
    SLIDE_ID = "slide_id"
    WHITEBOARD_STEP_ID = "whiteboard_step_id"
    DOCUMENT_RANGE = "document_range"
    TOPIC = "topic"


class PersistenceStatus(str, Enum):
    """单次持久化操作的综合状态。"""

    COMPLETE_SUCCESS = "complete_success"
    WHITEBOARD_DEGRADED = "whiteboard_degraded"
    REFERENCE_MISSING = "reference_missing"
    PARTIAL_FAILURE = "partial_failure"
    OVERALL_FAILURE = "overall_failure"


# ── 值对象 ────────────────────────────────────────────────────────────

class SourceReference(BaseModel):
    """引用来源的元数据。"""

    source_id: str
    source_title: str | None = None
    source_kind: str | None = None
    source_anchor: str | None = None
    source_excerpt: str | None = None
    source_uri: str | None = None
    source_score: float | None = None


class AnchorContext(BaseModel):
    """锚点上下文，描述一次对话关联的资源位置与范围。"""

    context_type: ContextType
    anchor_kind: AnchorKind
    anchor_ref: str
    scope_summary: str | None = None
    scope_window: str | None = None
    source_ids: list[str] = Field(default_factory=list)


class WhiteboardActionRecord(BaseModel):
    """白板操作的基础记录，不含 ID 等持久化字段。"""

    action_type: str
    payload: dict[str, object] = Field(default_factory=dict)
    object_ref: str | None = None
    render_uri: str | None = None
    render_state: str | None = None


# ── 创建请求 ──────────────────────────────────────────────────────────

class CompanionTurnCreateRequest(BaseModel):
    """伴学对话轮次的创建请求。

    ``persistence_status`` 如果不显式设置，会由
    ``populate_persistence_status`` 验证器根据降级标记自动推导。
    """

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
        """根据降级 / 缺失 / 失败标记自动填充 persistence_status。"""
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
    """知识检索对话的创建请求。

    ``persistence_status`` 如果不显式设置，会由
    ``populate_persistence_status`` 验证器根据降级标记自动推导。
    """

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
        """根据缺失 / 失败标记自动填充 persistence_status。"""
        if self.persistence_status is not None:
            return self

        if self.overall_failed:
            self.persistence_status = PersistenceStatus.OVERALL_FAILURE
        elif self.reference_missing:
            self.persistence_status = PersistenceStatus.REFERENCE_MISSING
        else:
            self.persistence_status = PersistenceStatus.COMPLETE_SUCCESS
        return self


# ── 快照模型 ──────────────────────────────────────────────────────────

class WhiteboardActionSnapshot(WhiteboardActionRecord):
    """已持久化的白板操作快照，在基础记录之上补充 ID 与时间戳。"""

    table_name: str = WHITEBOARD_ACTION_LOG_TABLE
    action_id: str
    turn_id: str
    session_id: str
    user_id: str
    created_at: datetime


class CompanionTurnSnapshot(BaseModel):
    """已持久化的伴学对话轮次快照。"""

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
    """已持久化的知识检索对话快照。"""

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
    """会话回放快照，聚合单次会话中的所有伴学、白板与知识检索记录。"""

    session_id: str
    storage_tables: list[str] = Field(
        default_factory=lambda: [
            COMPANION_TURN_TABLE,
            WHITEBOARD_ACTION_LOG_TABLE,
            KNOWLEDGE_CHAT_LOG_TABLE,
        ]
    )
    companion_turns: list[CompanionTurnSnapshot] = Field(default_factory=list)
    whiteboard_action_logs: list[WhiteboardActionSnapshot] = Field(default_factory=list)
    knowledge_chat_logs: list[KnowledgeChatSnapshot] = Field(default_factory=list)
