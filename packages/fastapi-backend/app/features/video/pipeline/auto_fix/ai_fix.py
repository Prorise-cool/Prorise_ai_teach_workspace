"""AI 修复层 -- 基于 LLM 的 Manim 代码错误修复。

本模块是第 3 层修复，利用 LLM Provider 对渲染报错的 Manim 代码
进行智能分析与修复。特殊处理了 ``NameError`` 场景下颜色不存在的问题，
引导 LLM 使用十六进制颜色码 + ``ManimColor`` 包装。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.features.video.pipeline._helpers import extract_code

if TYPE_CHECKING:
    from app.providers.protocols import LLMProvider, ProviderResult


# ---------------------------------------------------------------------------
# Prompt 构建
# ---------------------------------------------------------------------------

_COLOR_TIP = (
    "设置的颜色若不存在，则使用十六进制颜色代码，"
    "且写到 ManimColor 类中，如 ManimColor('#90B134')。"
)

_STANDARD_IMPORTS = (
    "注：已导入这些库 from manim import * ; import numpy as np ; import math"
)


def _build_diagnosis_prompt(code: str, error_msg: str) -> str:
    """构建第 1 轮诊断 prompt。

    Args:
        code: 报错的代码片段。
        error_msg: 渲染/执行时的错误信息。

    Returns:
        完整的诊断 prompt 文本。
    """
    color_tip = ""
    if "NameError" in error_msg:
        color_tip = _COLOR_TIP

    return (
        f"代码片段：{code}\n"
        f"报错提示：{error_msg}\n"
        f"哪一行代码出的问题，并检查其它地方是否有相同的问题。\n"
        f"{color_tip}\n"
        f"{_STANDARD_IMPORTS}\n"
        "元素添加方法就是 self.add_elements()"
    )


def _build_apply_prompt() -> str:
    """构建第 2 轮应用修改 prompt。

    Returns:
        要求 LLM 输出完整修复代码的 prompt 文本。
    """
    return (
        "请将你做的修改应用到代码片段中，并输出代码片段：\n"
        "```python\n"
        "{这里写修复后的完整代码片段，务必完整，不要省略！}\n"
        "```"
    )


# ---------------------------------------------------------------------------
# construct 方法体提取
# ---------------------------------------------------------------------------


def extract_construct_method(code: str) -> str | None:
    """从完整的 Manim 脚本中提取 ``construct`` 方法体。

    找到 ``def construct(self):`` 后，剥离方法签名和基缩进，
    仅返回方法体内的代码文本。

    Args:
        code: 完整的 Manim Python 脚本。

    Returns:
        ``construct`` 方法体文本；找不到时返回 ``None``。
    """
    lines = code.split("\n")

    construct_line_idx = -1
    for idx, line in enumerate(lines):
        if "def construct(self):" in line:
            construct_line_idx = idx
            break

    if construct_line_idx == -1:
        return None

    base_indent = len(lines[construct_line_idx]) - len(lines[construct_line_idx].lstrip())
    method_indent = base_indent + 4  # Python 标准缩进

    method_body: list[str] = []
    idx = construct_line_idx + 1
    while idx < len(lines):
        line = lines[idx]
        if not line.strip():
            method_body.append("")
            idx += 1
            continue
        current_indent = len(line) - len(line.lstrip())
        if current_indent <= base_indent:
            break
        # 移除一级缩进。
        method_body.append(line[method_indent:])
        idx += 1

    return "\n".join(method_body)


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------


async def ai_fix_code(code: str, error_msg: str, llm_provider: LLMProvider) -> str:
    """基于 LLM 的 Manim 代码修复（第 3 层）。

    两轮 LLM 调用流程：
    1. 诊断轮：分析报错行与原因。
    2. 应用轮：将修改应用到代码中，输出完整修复代码。

    Args:
        code: 报错的 Manim 代码片段。
        error_msg: 渲染/执行时的错误信息。
        llm_provider: 满足 :class:`~app.providers.protocols.LLMProvider` 协议的实例。

    Returns:
        修复后的代码片段（``construct`` 方法体或完整脚本）。
    """
    # 第 1 轮：诊断。
    diagnosis_prompt = _build_diagnosis_prompt(code, error_msg)
    diagnosis_result: ProviderResult = await llm_provider.generate(diagnosis_prompt)

    # 第 2 轮：应用修改。
    apply_prompt = _build_apply_prompt()
    combined_prompt = f"{diagnosis_prompt}\n\n诊断结果：{diagnosis_result.content}\n\n{apply_prompt}"
    apply_result: ProviderResult = await llm_provider.generate(combined_prompt)

    # 从 LLM 响应中提取代码。
    new_code = extract_code(apply_result.content) or apply_result.content

    # 尝试提取 construct 方法体。
    method_body = extract_construct_method(new_code)
    return method_body if method_body is not None else new_code
