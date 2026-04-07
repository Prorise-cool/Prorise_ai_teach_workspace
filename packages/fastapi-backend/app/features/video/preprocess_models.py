"""视频图片预处理接口模型。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import CamelCaseModel


class VideoPreprocessResult(CamelCaseModel):
    """图片预处理结果数据。"""
    image_ref: str = Field(min_length=1)
    ocr_text: str | None = None
    confidence: float = Field(ge=0, le=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    format: Literal["jpeg", "png", "webp"]
    suggestions: list[str] = Field(default_factory=list)
    error_code: str | None = None


class VideoPreprocessSuccessEnvelope(BaseModel):
    """图片预处理成功响应信封。"""
    code: int = 200
    msg: str = "预处理完成"
    data: VideoPreprocessResult
