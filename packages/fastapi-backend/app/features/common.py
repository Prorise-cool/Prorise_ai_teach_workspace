from typing import Literal

from pydantic import BaseModel, Field


class BootstrapStatus(BaseModel):
    feature: str
    status: Literal["scaffolded"] = "scaffolded"
    mode: Literal["epic-0"] = "epic-0"


class FeatureBootstrapResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    data: BootstrapStatus
