"""视频音色偏好与音色目录模型。"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.features.video.modeling import VideoCamelModel


class VideoVoicePreference(VideoCamelModel):
    voice_code: str = Field(min_length=1, max_length=128)
    provider_id: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("voice_code", "provider_id")
    @classmethod
    def strip_string(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class VideoVoiceOption(VideoCamelModel):
    voice_code: str
    voice_name: str
    provider_id: str
    provider_name: str
    resource_code: str
    language_code: str | None = None
    is_default: bool = False


class VideoVoiceListPayload(VideoCamelModel):
    voices: list[VideoVoiceOption]


class VideoVoiceListResponseEnvelope(BaseModel):
    code: int = 200
    msg: str = "查询成功"
    data: VideoVoiceListPayload
