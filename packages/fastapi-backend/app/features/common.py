"""功能域公共模型。"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BootstrapStatus(BaseModel):
    """功能域 bootstrap 基线状态。

    各功能域可在 ``feature/status/mode`` 之外附加扩展字段（如伴学的
    ``task_id`` / ``knowledge_points``），通过 ``extra='allow'`` 透传。
    """

    model_config = ConfigDict(extra="allow")

    feature: str
    status: Literal["scaffolded"] = "scaffolded"
    mode: Literal["epic-0"] = "epic-0"


class FeatureBootstrapResponseEnvelope(BaseModel):
    """功能域 bootstrap 响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: BootstrapStatus
