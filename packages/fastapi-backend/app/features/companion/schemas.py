"""伴学功能域 schema。

包含 bootstrap 状态、Ask API 请求/响应模型、上下文来源枚举等。
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.shared.long_term.models import (
    AnchorContext,
    PersistenceStatus,
    WhiteboardActionRecord,
)


# ── 上下文来源枚举 ────────────────────────────────────────────────────


class CompanionContextSource(str, Enum):
    """伴学上下文来源，定义三级降级路径。"""

    REDIS = "redis"
    LOCAL_FILE = "local_file"
    COS = "cos"
    DEGRADED = "degraded"


class CompanionBootstrapData(BaseModel):
    """伴学 bootstrap 返回给前端的实际数据。"""

    task_id: str
    session_id: str
    context_source: CompanionContextSource = CompanionContextSource.REDIS
    knowledge_points: list[str] = Field(default_factory=list)
    topic_summary: str = ""


# ── Ask API Request ───────────────────────────────────────────────────


class AskRequest(BaseModel):
    """伴学提问请求。"""

    session_id: str
    anchor: AnchorContext
    question_text: str
    parent_turn_id: str | None = None
    frame_base64: str | None = None


class AskResponse(BaseModel):
    """伴学提问响应。"""

    turn_id: str
    answer_text: str
    anchor: AnchorContext
    whiteboard_actions: list[WhiteboardActionRecord] = Field(default_factory=list)
    source_refs: list[dict[str, object]] = Field(default_factory=list)
    persistence_status: PersistenceStatus = PersistenceStatus.COMPLETE_SUCCESS
    context_source_hit: CompanionContextSource = CompanionContextSource.REDIS


# ── Companion Context DTO ────────────────────────────────────────────


class SectionContext(BaseModel):
    """单个 section 的上下文摘要。"""

    section_id: str
    title: str
    narration_text: str = ""
    start_time: int | None = None
    end_time: int | None = None


class CompanionContext(BaseModel):
    """视频 Context Adapter 返回的上下文 DTO。"""

    task_id: str
    current_section: SectionContext | None = None
    adjacent_sections: list[SectionContext] = Field(default_factory=list)
    knowledge_points: list[str] = Field(default_factory=list)
    solution_steps: list[dict[str, object]] = Field(default_factory=list)
    topic_summary: str = ""
    context_source_hit: CompanionContextSource = CompanionContextSource.DEGRADED
