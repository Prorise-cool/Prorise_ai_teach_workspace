"""代码修复 Prompt — 四层修复管道各层提示。

Layer 1: AST 参数注入（无 Prompt，纯规则）
Layer 2: 静态分析（无 Prompt，纯规则）
Layer 3: AI 修复（分析 + 应用）
Layer 4: 渲染验证修复
"""

from __future__ import annotations

AI_FIX_ANALYSIS_PROMPT_TEMPLATE = """代码片段：{code_snippet}
报错提示：{error_msg}
哪一行代码出的问题，并检查其它地方是否有相同的问题；
{color_tip}
注：已导入这些库 from manim import *
import numpy as np
import math
元素添加方法就是 self.add_elements()"""

AI_FIX_APPLY_PROMPT = """请将你做的修改应用到代码片段中：并输出代码片段：
```python
{{这里写修复后的完整代码片段，务必完整，不要省略！}}
```"""

RENDER_FIX_PROMPT_TEMPLATE = """代码片段：{code_snippet}
报错提示：{error_msg}
哪一行代码出的问题，并检查其它地方是否有相同的问题
{color_tip}
元素标准添加方法就是 self.add_elements()"""

VISUAL_CHECK_PROMPT_TEMPLATE = """请分析这张 Manim 渲染的最后一帧截图，检查以下问题：
1. 元素是否重叠
2. 元素是否超出画面边界
3. 文字是否清晰可读
4. 布局是否合理

如果发现问题，请描述具体问题并给出修复建议。
如果没有问题，请回复"视觉检查通过"。"""


def build_ai_fix_prompt(error_msg: str, code_snippet: str) -> str:
    """构建 AI 修复分析提示。

    Args:
        error_msg: 渲染错误信息。
        code_snippet: 出错的代码片段。

    Returns:
        分析提示字符串。
    """
    color_tip = ""
    if "NameError" in error_msg:
        color_tip = "设置的颜色若不存在，则使用十六进制颜色代码，且写到 ManimColor 类中，如 ManimColor('#90B134')"
    return AI_FIX_ANALYSIS_PROMPT_TEMPLATE.format(
        code_snippet=code_snippet,
        error_msg=error_msg,
        color_tip=color_tip,
    )


def build_ai_apply_prompt() -> str:
    """返回 AI 应用修复的提示模板。"""
    return AI_FIX_APPLY_PROMPT


def build_render_fix_prompt(error_msg: str, code_snippet: str) -> str:
    """构建渲染时修复提示。

    Args:
        error_msg: 渲染错误信息。
        code_snippet: 出错的代码片段。

    Returns:
        渲染修复提示字符串。
    """
    color_tip = ""
    if "NameError" in error_msg:
        color_tip = "设置的颜色若不存在，则使用十六进制颜色代码，且写到 ManimColor 类中，如 ManimColor('#90B134')"
    return RENDER_FIX_PROMPT_TEMPLATE.format(
        code_snippet=code_snippet,
        error_msg=error_msg,
        color_tip=color_tip,
    )


def build_visual_check_prompt() -> str:
    """返回视觉验证提示模板。"""
    return VISUAL_CHECK_PROMPT_TEMPLATE
