"""Learning Coach schema 定义（Epic 8）。"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import ConfigDict, Field

from app.schemas.common import CamelCaseModel


class LearningCoachSourceType(str, Enum):
    """Learning Coach 来源会话类型枚举。"""

    VIDEO = "video"
    CLASSROOM = "classroom"
    COMPANION = "companion"
    QUIZ = "quiz"
    KNOWLEDGE = "knowledge"
    LEARNING = "learning"
    MANUAL = "manual"


class LearningCoachSource(CamelCaseModel):
    """Learning Coach 来源上下文。"""

    model_config = ConfigDict(use_enum_values=True)

    source_type: LearningCoachSourceType
    source_session_id: str = Field(min_length=1, max_length=128)
    source_task_id: str | None = Field(default=None, max_length=128)
    source_result_id: str | None = Field(default=None, max_length=128)
    return_to: str | None = Field(default=None, max_length=512)
    topic_hint: str | None = Field(default=None, max_length=200)


class LearningCoachCapability(CamelCaseModel):
    enabled: bool = True


class LearningCoachCheckpointCapability(LearningCoachCapability):
    question_count: int = Field(default=2, ge=1, le=3)


class LearningCoachQuizCapability(LearningCoachCapability):
    question_count: int = Field(default=20, ge=1, le=50)


class LearningCoachPathCapability(LearningCoachCapability):
    enabled: bool = True


class LearningCoachCapabilities(CamelCaseModel):
    checkpoint: LearningCoachCheckpointCapability = Field(default_factory=LearningCoachCheckpointCapability)
    quiz: LearningCoachQuizCapability = Field(default_factory=LearningCoachQuizCapability)
    path: LearningCoachPathCapability = Field(default_factory=LearningCoachPathCapability)


class LearningCoachEntryPayload(CamelCaseModel):
    """Learning Coach 会话后入口数据。"""

    source: LearningCoachSource
    capabilities: LearningCoachCapabilities = Field(default_factory=LearningCoachCapabilities)
    knowledge_points: list[str] = Field(default_factory=list)


class LearningCoachEntryEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "Learning Coach 入口加载成功"
    data: LearningCoachEntryPayload


class LearningCoachOption(CamelCaseModel):
    option_id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=8)
    text: str = Field(min_length=1, max_length=1000)


class LearningCoachQuestion(CamelCaseModel):
    model_config = ConfigDict(use_enum_values=True)

    question_id: str = Field(min_length=1, max_length=128)
    question_type: str = Field(default="single_choice")
    tag: str | None = Field(default=None, max_length=60)
    stem: str = Field(min_length=1, max_length=2000)
    options: list[LearningCoachOption] = Field(min_length=2, max_length=6)


class CheckpointGenerateRequest(CamelCaseModel):
    source: LearningCoachSource
    question_count: int = Field(default=2, ge=1, le=3)


class CheckpointGeneratePayload(CamelCaseModel):
    checkpoint_id: str = Field(min_length=1, max_length=128)
    source: LearningCoachSource
    question_total: int = Field(ge=1, le=3)
    questions: list[LearningCoachQuestion]
    expires_in_seconds: int = Field(ge=60, le=86400)
    generation_source: str = Field(default="llm", pattern="^(llm|fallback)$")


class CheckpointGenerateEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "checkpoint 生成成功"
    data: CheckpointGeneratePayload


class LearningCoachAnswer(CamelCaseModel):
    question_id: str = Field(min_length=1, max_length=128)
    option_id: str = Field(min_length=1, max_length=64)


class CheckpointSubmitRequest(CamelCaseModel):
    checkpoint_id: str = Field(min_length=1, max_length=128)
    answers: list[LearningCoachAnswer] = Field(min_length=1, max_length=3)


class CheckpointJudgeItem(CamelCaseModel):
    question_id: str = Field(min_length=1, max_length=128)
    selected_option_id: str = Field(min_length=1, max_length=64)
    correct_option_id: str = Field(min_length=1, max_length=64)
    is_correct: bool
    explanation: str = Field(min_length=1, max_length=4000)


class CheckpointSubmitPayload(CamelCaseModel):
    checkpoint_id: str = Field(min_length=1, max_length=128)
    question_total: int = Field(ge=1, le=3)
    correct_total: int = Field(ge=0, le=3)
    passed: bool
    items: list[CheckpointJudgeItem]
    persisted: bool = True


class CheckpointSubmitEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "checkpoint 判分成功"
    data: CheckpointSubmitPayload


class QuizGenerateRequest(CamelCaseModel):
    source: LearningCoachSource
    question_count: int = Field(default=20, ge=1, le=50)


class QuizGeneratePayload(CamelCaseModel):
    quiz_id: str = Field(min_length=1, max_length=128)
    source: LearningCoachSource
    question_total: int = Field(ge=1, le=50)
    questions: list[LearningCoachQuestion]
    expires_in_seconds: int = Field(ge=60, le=86400)
    generation_source: str = Field(default="llm", pattern="^(llm|fallback)$")


class QuizGenerateEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "quiz 生成成功"
    data: QuizGeneratePayload


class QuizSubmitRequest(CamelCaseModel):
    quiz_id: str = Field(min_length=1, max_length=128)
    answers: list[LearningCoachAnswer] = Field(min_length=1, max_length=50)


class QuizJudgeItem(CheckpointJudgeItem):
    pass


class QuizSubmitPayload(CamelCaseModel):
    quiz_id: str = Field(min_length=1, max_length=128)
    question_total: int = Field(ge=1, le=50)
    correct_total: int = Field(ge=0, le=50)
    score: int = Field(ge=0, le=100)
    summary: str = Field(min_length=1, max_length=2000)
    items: list[QuizJudgeItem]
    persisted: bool = False


class QuizSubmitEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "quiz 判题成功"
    data: QuizSubmitPayload


class QuizHistoryItem(CamelCaseModel):
    """历史答卷中的单道题记录（只读回看）。"""

    question_id: str = Field(min_length=1, max_length=128)
    stem: str = Field(min_length=1, max_length=2000)
    options: list[LearningCoachOption] = Field(default_factory=list, max_length=6)
    selected_option_id: str | None = Field(default=None, max_length=64)
    correct_option_id: str | None = Field(default=None, max_length=64)
    is_correct: bool = False
    explanation: str | None = Field(default=None, max_length=4000)


class QuizHistoryPayload(CamelCaseModel):
    """测验历史回看 payload，来自 RuoYi xm_quiz_result。"""

    model_config = ConfigDict(use_enum_values=True)

    quiz_id: str = Field(min_length=1, max_length=128)
    source: LearningCoachSourceType | None = None
    question_total: int = Field(default=0, ge=0, le=200)
    correct_total: int = Field(default=0, ge=0, le=200)
    score: int = Field(default=0, ge=0, le=100)
    summary: str | None = Field(default=None, max_length=2000)
    items: list[QuizHistoryItem] = Field(default_factory=list)
    occurred_at: datetime | None = None


class QuizHistoryEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "quiz 历史加载成功"
    data: QuizHistoryPayload


class LearningPathPlanRequest(CamelCaseModel):
    source: LearningCoachSource
    goal: str = Field(min_length=1, max_length=200)
    cycle_days: int = Field(ge=1, le=365)


class LearningPathStep(CamelCaseModel):
    title: str = Field(min_length=1, max_length=200)
    action: str = Field(min_length=1, max_length=500)
    estimated_minutes: int | None = Field(default=None, ge=5, le=600)


class LearningPathStage(CamelCaseModel):
    title: str = Field(min_length=1, max_length=120)
    goal: str = Field(min_length=1, max_length=500)
    steps: list[LearningPathStep] = Field(min_length=1, max_length=30)


class LearningPathPlanPayload(CamelCaseModel):
    path_id: str = Field(min_length=1, max_length=128)
    source: LearningCoachSource
    path_title: str = Field(min_length=1, max_length=255)
    path_summary: str = Field(min_length=1, max_length=2000)
    version_no: int = Field(default=1, ge=1, le=1000)
    stages: list[LearningPathStage] = Field(min_length=1, max_length=20)
    generation_source: str = Field(default="llm", pattern="^(llm|fallback)$")


class LearningPathPlanEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "path 规划成功"
    data: LearningPathPlanPayload


class LearningPathSaveRequest(CamelCaseModel):
    path: LearningPathPlanPayload


class LearningPathSavePayload(CamelCaseModel):
    path_id: str = Field(min_length=1, max_length=128)
    version_no: int = Field(ge=1, le=1000)
    persisted: bool = True
    persisted_at: datetime | None = None


class LearningPathSaveEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "path 保存成功"
    data: LearningPathSavePayload



# ── Coach chat（quiz 侧栏 AI 辅导对话） ─────────────────────────────

class CoachAskMessage(CamelCaseModel):
    role: str = Field(pattern="^(user|coach)$")
    content: str = Field(min_length=1, max_length=4000)


class CoachAskRequest(CamelCaseModel):
    quiz_id: str | None = Field(default=None, max_length=128)
    checkpoint_id: str | None = Field(default=None, max_length=128)
    question_id: str = Field(min_length=1, max_length=128)
    question_stem: str = Field(min_length=1, max_length=4000)
    question_options: list[str] = Field(default_factory=list, max_length=10)
    user_message: str = Field(min_length=1, max_length=1000)
    history: list[CoachAskMessage] = Field(default_factory=list, max_length=20)


class CoachAskPayload(CamelCaseModel):
    reply: str = Field(min_length=1, max_length=4000)
    generation_source: str = Field(default="llm", pattern="^(llm|fallback)$")


class CoachAskEnvelope(CamelCaseModel):
    code: int = 200
    msg: str = "coach 回复成功"
    data: CoachAskPayload
