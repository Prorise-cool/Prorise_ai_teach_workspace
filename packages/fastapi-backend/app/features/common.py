"""功能域公共模型。"""

from typing import Literal

from pydantic import BaseModel, Field


class BootstrapStatus(BaseModel):
    """功能域 bootstrap 基线状态。"""
    feature: str
    status: Literal["scaffolded"] = "scaffolded"
    mode: Literal["epic-0"] = "epic-0"


class FeatureBootstrapResponseEnvelope(BaseModel):
    """功能域 bootstrap 响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: BootstrapStatus
