"""视频图片预处理接口模型。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel_case(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(segment.capitalize() for segment in tail)


class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel_case,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class VideoPreprocessResult(CamelCaseModel):
    image_ref: str = Field(min_length=1)
    ocr_text: str | None = None
    confidence: float = Field(ge=0, le=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    format: Literal["jpeg", "png", "webp"]
    suggestions: list[str] = Field(default_factory=list)
    error_code: str | None = None


class VideoPreprocessSuccessEnvelope(BaseModel):
    code: int = 200
    msg: str = "预处理完成"
    data: VideoPreprocessResult
