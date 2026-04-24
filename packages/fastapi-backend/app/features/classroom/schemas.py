"""课堂功能域请求与响应 schema。

合并自原 ``app.features.openmaic.schemas``（Wave 1 重构）。包含：
- 任务元数据 CRUD schema（继承 BaseTaskMetadataService 风格）
- 场景大纲、动作、内容 schema（合并自 OpenMAIC port）
- 多智能体 chat schema
- PDF 解析、Web 搜索 schema

注意：``QuizContent`` / ``QuizQuestion`` 等 Quiz 相关结构**保留**给前端类型对齐，
但课堂生成管道已不再产出 quiz 场景（quiz 流程移至 learning_coach）。
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.features.classroom.agent_schemas import AgentProfileBase
from app.features.common import BootstrapStatus
from app.schemas.common import CamelCaseModel
from app.shared.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType,
)


# ─── Bootstrap & Task Metadata ──────────────────────────────────────────────────

class ClassroomBootstrapResponse(BootstrapStatus):
    """课堂功能域 bootstrap 状态数据。"""
    feature: str = "classroom"


class ClassroomTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    """课堂任务元数据创建请求。"""
    task_type: str = TaskType.CLASSROOM.value


ClassroomTaskMetadataSnapshot = TaskMetadataSnapshot
ClassroomTaskMetadataPageResponse = TaskMetadataPageResponse
ClassroomTaskMetadataPreviewResponse = TaskMetadataPreviewResponse


# ─── Scene Types ───────────────────────────────────────────────────────────────

# Quiz / interactive 仍保留为合法 SceneType 取值，避免破坏前端旧数据反序列化；
# 但生成管道（outline_generator + scene_generator）只会产出 slide / pbl / discussion。
SceneType = Literal["slide", "quiz", "interactive", "pbl", "discussion"]


class MediaGeneration(BaseModel):
    """AI media generation request (image or video) within a scene outline."""
    type: Literal["image", "video"]
    prompt: str
    element_id: str = Field(alias="elementId")
    aspect_ratio: str = Field(default="16:9", alias="aspectRatio")
    style: str | None = None

    model_config = {"populate_by_name": True}


class QuizConfig(BaseModel):
    """保留供前端类型对齐——课堂管道不再生成 quiz。"""
    question_count: int = Field(default=2, alias="questionCount")
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_types: list[str] = Field(
        default_factory=lambda: ["single"], alias="questionTypes"
    )

    model_config = {"populate_by_name": True}


class InteractiveConfig(BaseModel):
    concept_name: str = Field(alias="conceptName")
    concept_overview: str = Field(alias="conceptOverview")
    design_idea: str = Field(alias="designIdea")
    subject: str | None = None

    model_config = {"populate_by_name": True}


class PBLConfig(BaseModel):
    project_topic: str = Field(alias="projectTopic")
    project_description: str = Field(alias="projectDescription")
    target_skills: list[str] = Field(default_factory=list, alias="targetSkills")
    issue_count: int = Field(default=3, alias="issueCount")

    model_config = {"populate_by_name": True}


class SceneOutline(BaseModel):
    id: str
    type: SceneType
    title: str
    description: str
    key_points: list[str] = Field(default_factory=list, alias="keyPoints")
    teaching_objective: str | None = Field(default=None, alias="teachingObjective")
    estimated_duration: int | None = Field(default=None, alias="estimatedDuration")
    order: int = 1
    suggested_image_ids: list[str] = Field(default_factory=list, alias="suggestedImageIds")
    media_generations: list[MediaGeneration] = Field(
        default_factory=list, alias="mediaGenerations"
    )
    quiz_config: QuizConfig | None = Field(default=None, alias="quizConfig")
    interactive_config: InteractiveConfig | None = Field(default=None, alias="interactiveConfig")
    widget_type: str | None = Field(default=None, alias="widgetType")
    widget_outline: dict[str, Any] | None = Field(default=None, alias="widgetOutline")
    pbl_config: PBLConfig | None = Field(default=None, alias="pblConfig")
    language_note: str | None = Field(default=None, alias="languageNote")

    model_config = {"populate_by_name": True}


# ─── Actions ───────────────────────────────────────────────────────────────────

class BaseAction(BaseModel):
    id: str
    type: str


class SpeechAction(BaseAction):
    """讲解动作。

    ``audio_url``：后台预合成的音频文件 URL。Wave 1 通过 Edge TTS provider
    在生成阶段同步合成；前端在 ``audio_url`` 缺失时降级到 speechSynthesis。
    """
    type: Literal["speech"] = "speech"
    text: str
    audio_url: str | None = Field(default=None, alias="audioUrl")

    model_config = {"populate_by_name": True}


class SpotlightAction(BaseAction):
    type: Literal["spotlight"] = "spotlight"
    element_id: str = Field(alias="elementId")

    model_config = {"populate_by_name": True}


class LaserPointerAction(BaseAction):
    type: Literal["laser_pointer"] = "laser_pointer"
    x: float
    y: float


class WbDrawTextAction(BaseAction):
    type: Literal["wb_draw_text"] = "wb_draw_text"
    content: str
    x: float
    y: float
    font_size: int | None = Field(default=None, alias="fontSize")

    model_config = {"populate_by_name": True}


class WbDrawLatexAction(BaseAction):
    type: Literal["wb_draw_latex"] = "wb_draw_latex"
    latex: str
    x: float
    y: float
    width: float | None = None


class WbOpenAction(BaseAction):
    type: Literal["wb_open"] = "wb_open"


class WbCloseAction(BaseAction):
    type: Literal["wb_close"] = "wb_close"


class WbClearAction(BaseAction):
    type: Literal["wb_clear"] = "wb_clear"


class DiscussionAction(BaseAction):
    type: Literal["discussion"] = "discussion"
    question: str | None = None


class GenericAction(BaseAction):
    """兜底动作类型，承接前端尚未识别的 action。"""
    params: dict[str, Any] = Field(default_factory=dict)


Action = (
    SpeechAction
    | SpotlightAction
    | LaserPointerAction
    | WbDrawTextAction
    | WbDrawLatexAction
    | WbOpenAction
    | WbCloseAction
    | WbClearAction
    | DiscussionAction
    | GenericAction
)

SLIDE_ONLY_ACTIONS = {"spotlight", "laser_pointer"}


# ─── Agent / Classroom ──────────────────────────────────────────────────────────

class AgentVoiceConfig(BaseModel):
    provider_id: str = Field(alias="providerId")
    voice_id: str = Field(alias="voiceId")
    voice_name: str | None = Field(default=None, alias="voiceName")

    model_config = {"populate_by_name": True}


class AgentProfile(AgentProfileBase):
    """Stage 1.5 / API 层的智能体画像。

    继承 ``AgentProfileBase`` 的公共字段（id / name / role / persona /
    avatar / color），本类额外携带 ``voice_config`` 用于前端 / TTS 配置。

    对应的 Orchestration 层画像见
    ``app.features.classroom.orchestration.schemas.AgentProfile``（额外携带
    ``priority`` / ``allowed_actions``，用于 LangGraph 调度）。
    两层共享基类，公共字段在 ``agent_schemas.AgentProfileBase`` 单点维护。
    """

    voice_config: AgentVoiceConfig | None = Field(default=None, alias="voiceConfig")

    model_config = {"populate_by_name": True, "extra": "ignore"}


# ─── Slide content ─────────────────────────────────────────────────────────────

class SlideElement(BaseModel):
    id: str
    type: str
    left: float
    top: float
    width: float
    height: float
    content: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class SlideBackground(BaseModel):
    type: Literal["solid", "gradient", "image"] = "solid"
    color: str | None = "#ffffff"


class SlideContent(BaseModel):
    background: SlideBackground = Field(default_factory=SlideBackground)
    elements: list[SlideElement] = Field(default_factory=list)


class QuizQuestion(BaseModel):
    """保留供前端类型对齐；课堂管道不再生成 quiz scene。"""
    id: str
    type: Literal["single", "multiple", "short_answer"] = "single"
    stem: str
    options: list[dict[str, str]] = Field(default_factory=list)
    correct_answers: list[str] = Field(default_factory=list, alias="correctAnswers")
    explanation: str | None = None
    points: int = 1

    model_config = {"populate_by_name": True}


class QuizContent(BaseModel):
    """保留供前端类型对齐；课堂管道不再生成 quiz scene。"""
    questions: list[QuizQuestion] = Field(default_factory=list)


class InteractiveContent(BaseModel):
    html: str
    css: str | None = None
    js: str | None = None


class PBLIssue(BaseModel):
    id: str
    title: str
    description: str
    assignee_role: str | None = Field(default=None, alias="assigneeRole")

    model_config = {"populate_by_name": True}


class PBLContent(BaseModel):
    project_title: str = Field(alias="projectTitle")
    project_overview: str = Field(alias="projectOverview")
    issues: list[PBLIssue] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class Scene(BaseModel):
    id: str
    type: SceneType
    title: str
    content: SlideContent | QuizContent | InteractiveContent | PBLContent | None = None
    actions: list[dict[str, Any]] = Field(default_factory=list)
    outline: SceneOutline | None = None


class Classroom(BaseModel):
    id: str
    name: str
    requirement: str
    language_directive: str = Field(default="", alias="languageDirective")
    scenes: list[Scene] = Field(default_factory=list)
    agents: list[AgentProfile] = Field(default_factory=list)
    generated_at: int | None = Field(default=None, alias="generatedAt")

    model_config = {"populate_by_name": True}


# ─── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    agent_id: str | None = Field(default=None, alias="agentId")

    model_config = {"populate_by_name": True}


# ─── Generation Request/Response Schemas ────────────────────────────────────────

class ClassroomCreateRequest(BaseModel):
    requirement: str = Field(..., min_length=1)
    pdf_text: str | None = Field(default=None, alias="pdfText")
    pdf_images: list[dict[str, Any]] = Field(default_factory=list, alias="pdfImages")
    web_search_enabled: bool = Field(default=False, alias="webSearchEnabled")
    interactive_mode: bool = Field(default=False, alias="interactiveMode")
    scene_count: int | None = Field(default=None, ge=1, le=30, alias="sceneCount")
    duration_minutes: int | None = Field(default=None, ge=5, le=120, alias="durationMinutes")

    model_config = {"populate_by_name": True}


class ClassroomCreateResponse(CamelCaseModel):
    """前端期望 camelCase 字段（``taskId`` / ``pollUrl``）。

    Wave 1：``job_id`` 字段重命名为 ``task_id`` 以对齐统一任务体系；
    URL 路径同步从 ``/api/v1/openmaic/classroom/{job_id}`` 切换到
    ``/api/v1/classroom/tasks/{task_id}``。
    """

    task_id: str
    poll_url: str


class JobStatusResponse(CamelCaseModel):
    """旧 OpenMAIC 状态结构，作为 SSE 替代轮询接口的兼容响应保留。"""

    task_id: str
    status: Literal["pending", "generating_outline", "generating_scenes", "ready", "failed"]
    progress: int = Field(default=0, ge=0, le=100)
    message: str | None = None
    classroom: Classroom | None = None
    error: str | None = None

    model_config = {"populate_by_name": True}


class OutlineStreamRequest(BaseModel):
    requirement: str = Field(..., min_length=1)
    pdf_text: str | None = Field(default=None, alias="pdfText")
    language_directive: str | None = Field(default=None, alias="languageDirective")

    model_config = {"populate_by_name": True}


class SceneContentRequest(BaseModel):
    outline: SceneOutline
    course_context: str = Field(default="", alias="courseContext")
    language_directive: str = Field(default="", alias="languageDirective")
    agents: list[AgentProfile] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class SceneContentResponse(BaseModel):
    scene_id: str = Field(alias="sceneId")
    content: SlideContent | QuizContent | InteractiveContent | PBLContent

    model_config = {"populate_by_name": True}


class SceneActionsRequest(BaseModel):
    outline: SceneOutline
    content: dict[str, Any] = Field(default_factory=dict)
    agents: list[AgentProfile] = Field(default_factory=list)
    language_directive: str = Field(default="", alias="languageDirective")

    model_config = {"populate_by_name": True}


class SceneActionsResponse(BaseModel):
    scene_id: str = Field(alias="sceneId")
    actions: list[dict[str, Any]] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class AgentProfilesRequest(BaseModel):
    stage_name: str = Field(alias="stageName")
    stage_description: str | None = Field(default=None, alias="stageDescription")
    scene_outlines: list[dict[str, Any]] = Field(default_factory=list, alias="sceneOutlines")
    language_directive: str = Field(alias="languageDirective")
    available_avatars: list[str] = Field(default_factory=list, alias="availableAvatars")

    model_config = {"populate_by_name": True}


class AgentProfilesResponse(BaseModel):
    agents: list[AgentProfile] = Field(default_factory=list)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    agents: list[AgentProfile] = Field(default_factory=list)
    classroom_context: str = Field(default="", alias="classroomContext")
    language_directive: str = Field(default="", alias="languageDirective")
    task_id: str | None = Field(default=None, alias="taskId")

    # 容忍前端附带 storeState / config 等旧字段
    model_config = {"populate_by_name": True, "extra": "ignore"}


class ParsePdfResponse(BaseModel):
    text: str
    page_count: int = Field(alias="pageCount")

    model_config = {"populate_by_name": True}
