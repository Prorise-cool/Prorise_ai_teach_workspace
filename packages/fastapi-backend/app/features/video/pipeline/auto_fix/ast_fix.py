"""AST/正则参数注入层 -- 为 Manim 对象自动补全中文渲染所需的参数。

本模块通过正则扫描 ``Text`` / ``MathTex`` / ``Tex`` 构造调用，
在不覆盖已有参数的前提下追加缺失的字体与模板参数，
确保中文内容在 Manim 渲染时能正确显示。
"""

from __future__ import annotations

import re
from typing import Any

from app.features.video.pipeline.manim_runtime_prelude import (
    MANIM_RUNTIME_TEX_TEMPLATE_NAME,
    normalize_tex_template_refs,
)


# ---------------------------------------------------------------------------
# 默认参数注入表
# ---------------------------------------------------------------------------

DEFAULT_INJECT_PARAMS: dict[str, dict[str, str]] = {
    "Text": {"font_size": "20", "font": '"Noto Sans CJK SC"'},
    "MathTex": {"tex_template": MANIM_RUNTIME_TEX_TEMPLATE_NAME},
    "Tex": {"tex_template": MANIM_RUNTIME_TEX_TEMPLATE_NAME},
}


# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------


def _find_closing_bracket(code: str, start: int) -> int:
    """从 *start* 位置的左括号开始，找到匹配的右括号索引。

    Args:
        code: 完整代码字符串。
        start: 左括号 ``(`` 所在的字符索引。

    Returns:
        匹配的右括号 ``)`` 索引；未匹配时返回 ``-1``。
    """
    depth = 1
    pos = start + 1
    length = len(code)
    while depth > 0 and pos < length:
        char = code[pos]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        pos += 1
    return (pos - 1) if depth == 0 else -1


# ---------------------------------------------------------------------------
# 核心逻辑
# ---------------------------------------------------------------------------


def regex_fix_code(code: str, params: dict[str, dict[str, str]] | None = None) -> str:
    """通过正则表达式为 Manim 构造调用补全缺失参数。

    逐个查找 ``Text(...)`` / ``MathTex(...)`` / ``Tex(...)`` 构造调用，
    如果目标参数（如 ``font_size``）不存在于已有参数列表中则追加。
    **不会覆盖**已有参数值。

    Args:
        code: Manim 脚本源码。
        params: 对象类型到 ``{参数名: 默认值}`` 的映射；为 ``None`` 时
                使用 :data:`DEFAULT_INJECT_PARAMS`。

    Returns:
        补全参数后的脚本源码。
    """
    if params is None:
        params = DEFAULT_INJECT_PARAMS

    modified_parts: list[str] = []
    pos = 0

    while pos < len(code):
        # 在所有目标类型中，选择距离 pos 最近的匹配。
        best_match: dict[str, Any] | None = None
        for obj_type, inject_params in params.items():
            pattern = re.compile(r"(?<!\w)" + re.escape(obj_type) + r"\s*\(", re.MULTILINE)
            match = pattern.search(code, pos)
            if match and (best_match is None or match.start() < best_match["start"]):
                best_match = {
                    "start": match.start(),
                    "obj_type": obj_type,
                    "params": inject_params,
                    "paren_pos": match.end() - 1,
                }

        if best_match is None:
            modified_parts.append(code[pos:])
            break

        # 保留匹配位置之前的代码。
        modified_parts.append(code[pos : best_match["start"]])

        paren_pos = best_match["paren_pos"]
        close_pos = _find_closing_bracket(code, paren_pos)

        if close_pos == -1:
            # 括号不匹配，保留剩余代码并退出。
            modified_parts.append(code[best_match["start"] :])
            break

        # 提取括号内已有参数文本。
        existing_text = code[paren_pos + 1 : close_pos]

        # 逐个检查需要注入的参数是否已存在。
        new_params: list[str] = []
        for param_name, param_value in best_match["params"].items():
            if not re.search(rf"\b{re.escape(param_name)}\s*=", existing_text):
                new_params.append(f"{param_name}={param_value}")

        if new_params:
            # 保证已有参数末尾有逗号。
            stripped = existing_text.rstrip()
            if stripped and stripped[-1] != ",":
                existing_text += ","
            existing_text += "\n" if "\n" in existing_text else " "
            existing_text += ", ".join(new_params)

        obj_type = best_match["obj_type"]
        modified_parts.append(f"{obj_type}({existing_text})")
        pos = close_pos + 1

    return normalize_tex_template_refs("".join(modified_parts))


def ast_fix_code(code: str, params: dict[str, dict[str, str]] | None = None) -> str:
    """基于 AST/正则的参数注入入口。

    此函数是第 1 层修复（参数注入）的主入口。默认注入中文渲染所需的字体
    和 TeX 模板参数，也可通过 *params* 自定义注入表。

    Args:
        code: Manim 脚本源码（通常是 ``construct`` 方法体）。
        params: 自定义注入参数映射；为 ``None`` 时使用默认配置。

    Returns:
        参数补全后的脚本源码。
    """
    if params is None:
        params = DEFAULT_INJECT_PARAMS
    return regex_fix_code(code, params)
