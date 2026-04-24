"""
Pydantic types for OpenMAIC orchestration module.

Defines the public data contracts used by Team A's /chat endpoint.
"""
from __future__ import annotations

from typing import Any, Literal, Union
from pydantic import BaseModel, Field

from app.features.classroom.agent_schemas import AgentProfileBase


# ── Chat message format ──────────────────────────────────────────────────────

class MessagePart(BaseModel):
    """A single part of a chat message (text or action result)."""
    type: str
    text: str | None = None
    action_name: str | None = None
    state: str | None = None
    output: dict[str, Any] | None = None


class MessageMetadata(BaseModel):
    """Optional metadata attached to a chat message."""
    agent_id: str | None = None
    sender_name: str | None = None
    interrupted: bool = False


class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: Literal["user", "assistant", "system"]
    parts: list[MessagePart] | None = None
    metadata: MessageMetadata | None = None


# ── Agent profile ────────────────────────────────────────────────────────────

class AgentProfile(AgentProfileBase):
    """LangGraph 编排层的智能体画像。

    继承 ``AgentProfileBase`` 的公共字段（id / name / role / persona /
    avatar / color），本类额外携带 ``priority`` / ``allowed_actions``
    用于多 Agent 调度。

    对应的 API 层画像见 ``app.features.classroom.schemas.AgentProfile``
    （额外携带 ``voice_config``，用于前端 / TTS 配置）。
    两层共享基类，公共字段在 ``agent_schemas.AgentProfileBase`` 单点维护。
    """

    priority: int = 1
    allowed_actions: list[str] = Field(default_factory=list)


# ── Whiteboard / turn ledger ─────────────────────────────────────────────────

class WhiteboardActionRecord(BaseModel):
    """A single whiteboard action recorded in the ledger."""
    action_name: str
    agent_id: str
    agent_name: str
    params: dict[str, Any] = Field(default_factory=dict)


class AgentTurnSummary(BaseModel):
    """Summary of one agent turn for the director's context."""
    agent_id: str
    agent_name: str
    content_preview: str
    action_count: int
    whiteboard_actions: list[WhiteboardActionRecord] = Field(default_factory=list)


# ── Director state (passed client→server to continue a session) ──────────────

class DirectorState(BaseModel):
    """Accumulated state from previous turns in this discussion."""
    turn_count: int = 0
    agent_responses: list[AgentTurnSummary] = Field(default_factory=list)
    whiteboard_ledger: list[WhiteboardActionRecord] = Field(default_factory=list)


# ── Discussion request ───────────────────────────────────────────────────────

class ClassroomContext(BaseModel):
    """Snapshot of the current classroom state (scene + whiteboard).

    Phase 4: 新增结构化字段 scene_title / scene_body / key_points /
    recent_speech / canvas_summary。老字段 slide_content 保留作为兼容位
    （旧前端传一条字符串时我们把它塞到 slide_content）。
    """
    current_scene_id: str | None = None
    current_scene_type: str | None = None  # "slide" | "quiz" | "interactive"
    slide_content: str | None = None       # brief description of current slide (legacy/fallback)
    whiteboard_open: bool = False
    language_directive: str | None = None  # e.g. "Respond in Chinese"

    # Phase 4: structured context fields
    scene_title: str | None = None
    scene_body: str | None = None
    key_points: list[str] = Field(default_factory=list)
    recent_speech: str | None = None
    canvas_summary: str | None = None


class UserProfile(BaseModel):
    """Student profile for personalisation."""
    nickname: str | None = None
    bio: str | None = None


class DiscussionRequest(BaseModel):
    """Full request for one discussion turn."""
    messages: list[ChatMessage]
    agents: list[AgentProfile]
    classroom_context: ClassroomContext = Field(default_factory=ClassroomContext)
    max_turns: int = 10
    # which agent should trigger first (optional)
    trigger_agent_id: str | None = None
    # for discussion mode (student-initiated topic)
    discussion_topic: str | None = None
    discussion_prompt: str | None = None
    # resume state from a prior turn
    director_state: DirectorState | None = None
    user_profile: UserProfile | None = None


# ── Chat events (SSE) ────────────────────────────────────────────────────────

class AgentSwitchEvent(BaseModel):
    type: Literal["agent_switch"] = "agent_switch"
    agent_id: str
    agent_name: str
    agent_avatar: str | None = None
    agent_color: str | None = None
    message_id: str


class TextDeltaEvent(BaseModel):
    type: Literal["text_delta"] = "text_delta"
    content: str
    message_id: str


class ToolCallEvent(BaseModel):
    type: Literal["tool_call"] = "tool_call"
    action_id: str
    name: str
    args: dict[str, Any]
    agent_id: str
    message_id: str


class AgentTurnEndEvent(BaseModel):
    type: Literal["agent_turn_end"] = "agent_turn_end"
    message_id: str
    agent_id: str


class SummaryEvent(BaseModel):
    type: Literal["summary"] = "summary"
    text: str


class ThinkingEvent(BaseModel):
    type: Literal["thinking"] = "thinking"
    stage: str
    agent_id: str | None = None


class CueUserEvent(BaseModel):
    type: Literal["cue_user"] = "cue_user"
    from_agent_id: str | None = None


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    message: str


class EndEvent(BaseModel):
    type: Literal["end"] = "end"
    total_actions: int = 0
    total_agents: int = 0
    director_state: DirectorState | None = None


ChatEvent = Union[
    AgentSwitchEvent,
    TextDeltaEvent,
    ToolCallEvent,
    AgentTurnEndEvent,
    SummaryEvent,
    ThinkingEvent,
    CueUserEvent,
    ErrorEvent,
    EndEvent,
]
