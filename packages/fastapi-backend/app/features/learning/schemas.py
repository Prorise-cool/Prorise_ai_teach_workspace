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
    path_payload_json: str | None = None
    analysis_summary: str | None = None
    status: LearningResultStatus = LearningResultStatus.COMPLETED
    detail_ref: str | None = None
    version_no: int | None = Field(default=None, ge=1)


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
    path_payload_json: str | None = None
    analysis_summary: str | None = None
    status: LearningResultStatus
    detail_ref: str | None = None
    version_no: int | None = None


class LearningPersistenceResponse(BaseModel):
    """学习结果持久化响应。"""
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    records: list[LearningPersistenceItem]
    table_summary: dict[str, str]
    traceability_rule: str = "version-or-updated-at"
