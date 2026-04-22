"""学习功能域 schema 定义。"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.features.common import BootstrapStatus


class LearningBootstrapResponse(BootstrapStatus):
    """学习功能域 bootstrap 状态数据。"""
    feature: str = "learning"


class LearningResultType(str, Enum):
    """学习结果类型枚举。"""
    CHECKPOINT = "checkpoint"
    QUIZ = "quiz"
    WRONGBOOK = "wrongbook"
    RECOMMENDATION = "recommendation"
    PATH = "path"


class LearningSourceType(str, Enum):
    """学习结果来源类型枚举。"""
    VIDEO = "video"
    CLASSROOM = "classroom"
    COMPANION = "companion"
    QUIZ = "quiz"
    KNOWLEDGE = "knowledge"
    LEARNING = "learning"
    MANUAL = "manual"


class LearningResultStatus(str, Enum):
    """学习结果状态枚举。"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


LONG_TERM_TABLE_BY_RESULT_TYPE: dict[LearningResultType, str] = {
    LearningResultType.CHECKPOINT: "xm_learning_record",
    LearningResultType.QUIZ: "xm_quiz_result",
    LearningResultType.WRONGBOOK: "xm_learning_wrongbook",
    LearningResultType.RECOMMENDATION: "xm_learning_recommendation",
    LearningResultType.PATH: "xm_learning_path"
}


class LearningResultInput(BaseModel):
    """学习结果输入项。"""
    model_config = ConfigDict(use_enum_values=True)

    result_type: LearningResultType
    source_type: LearningSourceType
    source_session_id: str
    source_task_id: str | None = None
    source_result_id: str | None = None
    occurred_at: datetime | None = None
    updated_at: datetime | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    question_total: int | None = Field(default=None, ge=0)
    correct_total: int | None = Field(default=None, ge=0)
    question_text: str | None = None
    wrong_answer_text: str | None = None
    reference_answer_text: str | None = None
    target_type: str | None = None
    target_ref_id: str | None = None
    path_title: str | None = None
    step_count: int | None = Field(default=None, ge=0)
    analysis_summary: str | None = None
    status: LearningResultStatus = LearningResultStatus.COMPLETED
    detail_ref: str | None = None
    version_no: int | None = Field(default=None, ge=1)
    # quiz 提交时刻的每题答卷明细 JSON 字符串（仅 quiz 记录使用），
    # 由 learning_coach.submit_quiz 写入，RuoYi 侧落 xm_quiz_result.question_items_json。
    question_items_json: str | None = None


class LearningPersistenceRequest(BaseModel):
    """学习结果批量持久化请求。"""
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    records: list[LearningResultInput]


class LearningPersistenceItem(BaseModel):
    """归一化后的学习结果持久化项。"""
    model_config = ConfigDict(use_enum_values=True)

    table_name: str
    user_id: str
    result_type: LearningResultType
    source_type: LearningSourceType
    source_session_id: str
    source_task_id: str | None = None
    source_result_id: str | None = None
    occurred_at: datetime
    updated_at: datetime
    score: int | None = None
    question_total: int | None = None
    correct_total: int | None = None
    question_text: str | None = None
    wrong_answer_text: str | None = None
    reference_answer_text: str | None = None
    target_type: str | None = None
    target_ref_id: str | None = None
    path_title: str | None = None
    step_count: int | None = None
    analysis_summary: str | None = None
    status: LearningResultStatus
    detail_ref: str | None = None
    version_no: int | None = None
    question_items_json: str | None = None


class LearningPersistenceResponse(BaseModel):
    """学习结果持久化响应。"""
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    records: list[LearningPersistenceItem]
    table_summary: dict[str, str]
    traceability_rule: str = "version-or-updated-at"


class LatestRecommendation(BaseModel):
    """学习中心聚合响应 —— 最新推荐项（来自 xm_learning_recommendation）。"""
    model_config = ConfigDict(populate_by_name=True)

    summary: str = Field(alias="summary")
    target_ref_id: str = Field(alias="targetRefId")
    source_time: datetime = Field(alias="sourceTime")


class ActiveLearningPath(BaseModel):
    """学习中心聚合响应 —— 当前活跃的学习路径（来自 xm_learning_path）。"""
    model_config = ConfigDict(populate_by_name=True)

    path_id: str = Field(alias="pathId")
    title: str = Field(alias="title")
    completed_step_count: int = Field(alias="completedStepCount", ge=0)
    total_step_count: int = Field(alias="totalStepCount", ge=0)
    version_no: int = Field(alias="versionNo", ge=1)


class LearningCenterAggregateResponse(BaseModel):
    """学习中心聚合响应（TASK-007）。

    前端学习中心页一次取齐三张 sidebar 卡需要的数据：
    - averageQuizScore：聚合 xm_quiz_result 的平均分
    - latestRecommendation：xm_learning_recommendation 最新 1 条
    - activeLearningPath：xm_learning_path 最新 1 条 + 步骤进度
    上游 RuoYi 未就绪时三字段均为 None，前端按空态渲染，不硬编码占位。
    """
    model_config = ConfigDict(populate_by_name=True)

    average_quiz_score: int | None = Field(default=None, alias="averageQuizScore", ge=0, le=100)
    latest_recommendation: LatestRecommendation | None = Field(default=None, alias="latestRecommendation")
    active_learning_path: ActiveLearningPath | None = Field(default=None, alias="activeLearningPath")
