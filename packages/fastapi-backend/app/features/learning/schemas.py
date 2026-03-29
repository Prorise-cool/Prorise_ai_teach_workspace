from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.features.common import BootstrapStatus


class LearningBootstrapResponse(BootstrapStatus):
    feature: str = "learning"


class LearningResultType(str, Enum):
    CHECKPOINT = "checkpoint"
    QUIZ = "quiz"
    WRONGBOOK = "wrongbook"
    RECOMMENDATION = "recommendation"
    PATH = "path"


class LearningSourceType(str, Enum):
    VIDEO = "video"
    CLASSROOM = "classroom"
    COMPANION = "companion"
    QUIZ = "quiz"
    KNOWLEDGE = "knowledge"
    LEARNING = "learning"
    MANUAL = "manual"


class LearningResultStatus(str, Enum):
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
    model_config = ConfigDict(use_enum_values=True)

    result_type: LearningResultType
    source_type: LearningSourceType
    source_session_id: str
    source_task_id: str | None = None
    source_result_id: str | None = None
    occurred_at: datetime | None = None
    updated_at: datetime | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    analysis_summary: str | None = None
    status: LearningResultStatus = LearningResultStatus.COMPLETED
    detail_ref: str | None = None
    version_no: int | None = Field(default=None, ge=1)


class LearningPersistenceRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    records: list[LearningResultInput]


class LearningPersistenceItem(BaseModel):
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
    analysis_summary: str | None = None
    status: LearningResultStatus
    detail_ref: str | None = None
    version_no: int | None = None


class LearningPersistenceResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    user_id: str
    records: list[LearningPersistenceItem]
    table_summary: dict[str, str]
    traceability_rule: str = "version-or-updated-at"
