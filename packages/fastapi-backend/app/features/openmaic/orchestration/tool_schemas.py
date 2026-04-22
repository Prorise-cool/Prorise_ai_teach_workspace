"""
Tool schemas for OpenMAIC agents.

Ported from references/OpenMAIC/lib/orchestration/tool-schemas.ts

Tools are parsed from JSON in LLM output (not real function calling).
This module provides text descriptions injected into agent system prompts
so the LLM knows what actions it may emit.
"""
from __future__ import annotations

# Actions that only make sense on the slide canvas (not on whiteboard-only views)
SLIDE_ONLY_ACTIONS = ("spotlight", "laser")


def get_effective_actions(allowed_actions: list[str], scene_type: str | None = None) -> list[str]:
    """Filter allowed actions by scene type.

    Slide-only actions (spotlight, laser) are removed for non-slide scenes.
    """
    if not scene_type or scene_type == "slide":
        return allowed_actions
    return [a for a in allowed_actions if a not in SLIDE_ONLY_ACTIONS]


# Full action description map (mirrors tool-schemas.ts)
_ACTION_DESCRIPTIONS: dict[str, str] = {
    "spotlight": (
        "聚焦单个关键元素，将其他内容变暗。谨慎使用——每次回复最多1-2次。"
        "参数：{ elementId: string, dimOpacity?: number }"
    ),
    "laser": (
        "用激光指示器指向元素。"
        "参数：{ elementId: string, color?: string }"
    ),
    "wb_open": (
        "打开白板，用于手写说明、公式、图表或逐步推导。"
        "在添加元素前先调用此操作。参数：{}"
    ),
    "wb_draw_text": (
        "在白板上添加文字。用于公式、步骤或关键点。"
        "参数：{ content: string, x: number, y: number, width?: number, height?: number, "
        "fontSize?: number, color?: string, elementId?: string }"
    ),
    "wb_draw_shape": (
        "在白板上添加形状。用于图表和视觉说明。"
        "参数：{ shape: 'rectangle'|'circle'|'triangle', x: number, y: number, "
        "width: number, height: number, fillColor?: string, elementId?: string }"
    ),
    "wb_draw_chart": (
        "在白板上添加图表（柱状图、折线图、饼图等）。"
        "参数：{ chartType: 'bar'|'column'|'line'|'pie'|'ring'|'area'|'radar'|'scatter', "
        "x: number, y: number, width: number, height: number, "
        "data: { labels: string[], legends: string[], series: number[][] }, "
        "themeColors?: string[], elementId?: string }"
    ),
    "wb_draw_latex": (
        "在白板上添加LaTeX公式。"
        "参数：{ latex: string, x: number, y: number, width?: number, height?: number, "
        "color?: string, elementId?: string }"
    ),
    "wb_draw_table": (
        "在白板上添加表格。参数：{ x: number, y: number, width: number, height: number, "
        "data: string[][] (第一行为表头), elementId?: string }"
    ),
    "wb_draw_line": (
        "在白板上添加线条或箭头。"
        "参数：{ startX: number, startY: number, endX: number, endY: number, "
        "color?: string, width?: number, style?: 'solid'|'dashed', "
        "points?: [startMarker, endMarker], elementId?: string }"
    ),
    "wb_draw_code": (
        "在白板上添加带语法高亮的代码块。"
        "参数：{ language: string, code: string, x: number, y: number, "
        "width?: number, height?: number, fileName?: string, elementId?: string }"
    ),
    "wb_edit_code": (
        "编辑白板上已有的代码块（逐行插入/删除/替换）。"
        "参数：{ elementId: string, operation: 'insert_after'|'insert_before'|'delete_lines'|'replace_lines', "
        "lineId?: string, lineIds?: string[], content?: string }"
    ),
    "wb_clear": "清空白板所有元素。参数：{}",
    "wb_delete": (
        "按ID删除白板上的特定元素。"
        "参数：{ elementId: string }"
    ),
    "wb_close": "关闭白板，返回幻灯片视图。完成绘制后务必关闭。参数：{}",
    "play_video": (
        "播放当前幻灯片上的视频元素（同步阻塞直到播放完成）。"
        "参数：{ elementId: string }"
    ),
}


def get_action_descriptions(allowed_actions: list[str]) -> str:
    """Return text descriptions of allowed actions for injection into system prompts."""
    if not allowed_actions:
        return "你没有任何可用操作。只能与学生交谈。"

    lines = [
        f"- {action}: {_ACTION_DESCRIPTIONS[action]}"
        for action in allowed_actions
        if action in _ACTION_DESCRIPTIONS
    ]
    return "\n".join(lines)
