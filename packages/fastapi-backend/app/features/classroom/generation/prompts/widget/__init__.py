"""Widget HTML 生成提示词 - 按 widget_type 分派。

Phase 5：每一种 widget_type 对应一份 system prompt 与 user_prompt builder，
照搬自 OpenMAIC ``lib/prompts/templates/{widget_type}-content/``。

调用入口：``resolve_widget_prompts(widget_type) -> (system_prompt, builder)``。
未知 widget_type 回退到 simulation，避免生成硬失败。
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .code import CODE_SYSTEM_PROMPT, build_code_user_prompt
from .diagram import DIAGRAM_SYSTEM_PROMPT, build_diagram_user_prompt
from .game import GAME_SYSTEM_PROMPT, build_game_user_prompt
from .simulation import SIMULATION_SYSTEM_PROMPT, build_simulation_user_prompt
from .visualization3d import (
    VISUALIZATION3D_SYSTEM_PROMPT,
    build_visualization3d_user_prompt,
)

UserPromptBuilder = Callable[[str, str, list[str], dict[str, Any], str], str]

_WIDGET_PROMPTS: dict[str, tuple[str, UserPromptBuilder]] = {
    "simulation": (SIMULATION_SYSTEM_PROMPT, build_simulation_user_prompt),
    "diagram": (DIAGRAM_SYSTEM_PROMPT, build_diagram_user_prompt),
    "code": (CODE_SYSTEM_PROMPT, build_code_user_prompt),
    "game": (GAME_SYSTEM_PROMPT, build_game_user_prompt),
    "visualization3d": (VISUALIZATION3D_SYSTEM_PROMPT, build_visualization3d_user_prompt),
}


def resolve_widget_prompts(widget_type: str) -> tuple[str, UserPromptBuilder]:
    """Return (system_prompt, user_prompt_builder) for the widget type.

    未知 widget_type 回退到 simulation（最常见），避免生成硬失败。
    """
    return _WIDGET_PROMPTS.get(widget_type, _WIDGET_PROMPTS["simulation"])


__all__ = ["resolve_widget_prompts", "UserPromptBuilder"]
