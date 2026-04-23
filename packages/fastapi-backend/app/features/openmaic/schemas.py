"""OpenMAIC Pydantic schemas — port of OpenMAIC /lib/types/*.ts."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ─── Scene Types ───────────────────────────────────────────────────────────────

SceneType = Literal["slide", "quiz", "interactive", "pbl"]


class MediaGeneration(BaseModel):
    """AI media generation request (image or video) within a scene outline."""
    type: Literal["image", "video"]
    prompt: str
    element_id: str = Field(alias="elementId")
    aspect_ratio: str = Field(default="16:9", alias="aspectRatio")
    style: str | None = None

    model_config = {"populate_by_name": True}


class QuizConfig(BaseModel):
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
    type: Literal["speech"] = "speech"
    text: str


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


# Generic action for any unsupported types
class GenericAction(BaseAction):
    params: dict[str, Any] = Field(default_factory=dict)


# Union type for all actions
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


class AgentProfile(BaseModel):
    id: str
    name: str
    role: Literal["teacher", "student", "assistant"] = "teacher"
    persona: str = ""
    avatar: str | None = None
    color: str | None = None
    voice_config: AgentVoiceConfig | None = Field(default=None, alias="voiceConfig")

    model_config = {"populate_by_name": True, "extra": "ignore"}


# ─── Slide content (simplified for generation) ─────────────────────────────────

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
    id: str
    type: Literal["single", "multiple", "short_answer"] = "single"
    stem: str
    options: list[dict[str, str]] = Field(default_factory=list)
    correct_answers: list[str] = Field(default_factory=list, alias="correctAnswers")
    explanation: str | None = None
    points: int = 1

    model_config = {"populate_by_name": True}


class QuizContent(BaseModel):
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

    model_config = {"populate_by_name": True}


class ClassroomCreateResponse(BaseModel):
    job_id: str = Field(alias="jobId")
    poll_url: str = Field(alias="pollUrl")

    model_config = {"populate_by_name": True}


class JobStatusResponse(BaseModel):
    job_id: str = Field(alias="jobId")
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

    # 容忍前端附带 storeState / config 等旧字段 —— Team B 遗留兼容
    model_config = {"populate_by_name": True, "extra": "ignore"}


class QuizGradeRequest(BaseModel):
    question: str
    user_answer: str = Field(alias="userAnswer")
    points: float = 10.0
    comment_prompt: str | None = Field(default=None, alias="commentPrompt")
    language: str | None = None

    model_config = {"populate_by_name": True}


class QuizGradeResponse(BaseModel):
    score: float
    comment: str


class ParsePdfRequest(BaseModel):
    # File is sent as multipart upload; this schema covers the JSON metadata part
    pass


class ParsePdfResponse(BaseModel):
    text: str
    page_count: int = Field(alias="pageCount")

    model_config = {"populate_by_name": True}


class BootstrapResponse(BaseModel):
    feature: str = "openmaic"
    status: str = "ready"
    version: str = "0.1.0"
