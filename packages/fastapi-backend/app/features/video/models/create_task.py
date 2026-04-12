"""视频任务创建接口模型。"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.features.video.models.base import VideoCamelModel
from app.features.video.models.voice import VideoVoicePreference


class CreateVideoTaskRequest(VideoCamelModel):
    """视频任务创建请求体。"""

    input_type: str = Field(pattern="^(text|image)$")
    source_payload: dict[str, object]
    user_profile: dict[str, object] | None = None
    voice_preference: VideoVoicePreference | None = None
    client_request_id: str = Field(
        min_length=1,
        max_length=128,
        pattern=r"^[a-zA-Z0-9_\-]+$",
    )

    @field_validator("source_payload")
    @classmethod
    def validate_source_payload(cls, value: dict[str, object]) -> dict[str, object]:
        """校验 sourcePayload 必须为非空对象。"""
        if not isinstance(value, dict) or not value:
            raise ValueError("sourcePayload 必须是非空对象")
        return value


class CreateVideoTaskAcceptedPayload(VideoCamelModel):
    """视频任务创建成功的响应数据。"""

    task_id: str
    task_type: str = "video"
    status: str = "pending"
    created_at: str


class IdempotentConflictPayload(VideoCamelModel):
    """幂等键冲突时返回的已有任务数据。"""

    task_id: str
    task_type: str = "video"
    status: str
    created_at: str | None = None


class CreateVideoTaskSuccessEnvelope(BaseModel):
    """视频任务创建成功响应信封。"""

    code: int = 202
    msg: str = "任务创建成功"
    data: CreateVideoTaskAcceptedPayload


class IdempotentConflictEnvelope(BaseModel):
    """幂等键冲突响应信封。"""

    code: int = 409
    msg: str = "任务已存在"
    data: IdempotentConflictPayload
