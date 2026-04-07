"""白板动作 schema。"""

from pydantic import BaseModel, Field


class WhiteboardAction(BaseModel):
    """白板动作数据模型。"""
    action: str
    payload: dict[str, object] = Field(default_factory=dict)
