"""布局修复 Prompt -- 对标 manim4ai 的 build_prompt(issues)。

当 layout_check 检测到布局问题时，构造修复指令让 LLM 重写代码。
参考：manim4ai/_prompts.py 的 build_prompt() 模式。
"""

from __future__ import annotations

LAYOUT_FIX_PROMPT_TEMPLATE = """你生成的 Manim 代码存在以下布局问题，请修复：

## 检测到的问题
{issues}

## 修复要求
1. **坐标越界** -- 所有元素必须在安全区内：X ∈ [-6.5, 6.5]，Y ∈ [-3.5, 3.5]
   - 调整 move_to/shift/next_to/to_edge 的参数
   - 缩小元素或减少位移距离
   - 大位移拆成多步动画

2. **物体过多** -- 每场景建议不超过 20 个 Mobject
   - 合并相关元素到 VGroup
   - 分步展示，不要一次性全部创建

3. **位置重叠** -- 元素之间保持足够间距
   - 调整起始位置，错开布局
   - 使用 arrange() 或 next_to() 自动排列

请输出修正后的完整代码，不要解释。

## 原始代码
```python
{code}
```"""


def build_layout_fix_prompt(issues_text: str, code: str) -> str:
    """构造布局修复 prompt。

    Args:
        issues_text: format_layout_issues() 的输出。
        code: 原始 Manim 代码。

    Returns:
        可直接送 LLM 的修复 prompt。
    """
    return LAYOUT_FIX_PROMPT_TEMPLATE.format(issues=issues_text, code=code)
