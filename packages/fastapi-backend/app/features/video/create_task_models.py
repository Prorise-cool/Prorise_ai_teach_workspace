"""视频任务创建接口模型。"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.features.video.modeling import VideoCamelModel


class CreateVideoTaskRequest(VideoCamelModel):
    input_type: str = Field(pattern="^(text|image)$")
    source_payload: dict[str, object]
    user_profile: dict[str, object] | None = None
    client_request_id: str = Field(
        min_length=1,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
    )

    @field_validator("source_payload")
    @classmethod
    def validate_source_payload(cls, value: dict[str, object]) -> dict[str, object]:
        if not isinstance(value, dict) or not value:
            raise ValueError("sourcePayload 必须是非空对象")
        return value


class CreateVideoTaskAcceptedPayload(VideoCamelModel):
    task_id: str
    task_type: str = "video"
    status: str = "pending"
    created_at: str


class IdempotentConflictPayload(VideoCamelModel):
    task_id: str
    task_type: str = "video"
    status: str
    created_at: str | None = None


class CreateVideoTaskSuccessEnvelope(BaseModel):
    code: int = 202
    msg: str = "任务创建成功"
    data: CreateVideoTaskAcceptedPayload


class IdempotentConflictEnvelope(BaseModel):
    code: int = 409
    msg: str = "任务已存在"
    data: IdempotentConflictPayload
