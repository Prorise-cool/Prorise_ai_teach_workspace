"""白板动作协议与结构化降级。

定义白板动作类型枚举、payload schema、降级策略。
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class WhiteboardActionType(str, Enum):
    """白板动作类型。"""

    DRAW_FUNCTION = "draw_function"
    HIGHLIGHT_REGION = "highlight_region"
    ANIMATE_STEP = "animate_step"
    DRAW_SHAPE = "draw_shape"
    SHOW_EQUATION = "show_equation"


class WhiteboardActionPayload(BaseModel):
    """白板动作 payload。"""

    action_type: WhiteboardActionType
    payload: dict[str, Any] = Field(default_factory=dict)
    render_uri: str | None = None


class WhiteboardDegradedContent(BaseModel):
    """白板降级内容：分步骤文本说明。"""

    steps: list[str] = Field(default_factory=list)
    fallback_text: str = ""


def build_degraded_content(reason: str) -> WhiteboardDegradedContent:
    """构建白板降级内容。"""
    return WhiteboardDegradedContent(
        steps=[f"白板功能暂时不可用（{reason}），以下是文字说明："],
        fallback_text=reason,
    )
