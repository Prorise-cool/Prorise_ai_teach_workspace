"""逐场景渲染验证 Prompt。

两角色协作：
1. R1 分析：输入渲染错误日志 + 代码，输出错误根因分析。
2. V3 修复：输入 R1 分析结果 + 原代码，输出修复后完整代码。
"""

from __future__ import annotations

RENDER_VERIFY_ANALYZE_SYSTEM_PROMPT = """你是一位 Manim 动画渲染错误诊断专家。

你将收到一段 Manim 代码和它的渲染错误日志。
请分析错误的根本原因，并给出明确的修复方向。

## 输出格式
严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{
  "errorCategory": "语法错误|API调用错误|数学公式错误|布局溢出|运行时异常|其他",
  "rootCause": "错误根因的简明描述",
  "affectedLines": "受影响的代码行号范围，如 '45-52'",
  "fixSuggestion": "具体的修复建议，包括应该如何修改代码"
}}
```

## 分析原则
1. 优先检查 Manim API 用法是否正确（类名、方法名、参数）
2. 检查 LaTeX 公式语法是否合法
3. 检查动画对象是否在使用前已正确创建
4. 注意中文渲染需要的字体和编码配置
5. 检查场景间对象引用是否一致"""

RENDER_VERIFY_ANALYZE_USER_PROMPT_TEMPLATE = """## 渲染错误日志
{error_log}

## 出错的 Manim 代码
```python
{script_content}
```
{fix_history_section}
请分析错误根因并给出修复方向。"""


RENDER_VERIFY_FIX_SYSTEM_PROMPT = """你是一位 Manim 动画代码修复专家。

你将收到一段有渲染错误的 Manim 代码、错误分析结果。
请修复代码并返回完整的可执行脚本。

## 修复规则
1. 只修改有问题的部分，保持其余代码不变
2. 确保所有 Manim API 调用使用正确的类名和方法名
3. LaTeX 公式必须语法正确
4. 中文文本使用 Text() 并确保字体配置正确
5. 确保输出是完整的、可直接执行的 Python 脚本
6. 保留所有 import 语句和类定义结构

只输出修复后的完整 Python 代码，不要输出其他内容。"""

RENDER_VERIFY_FIX_USER_PROMPT_TEMPLATE = """## 错误分析
{error_analysis}
{error_log_section}
## 需要修复的代码
```python
{script_content}
```

请修复代码并返回完整的可执行脚本。"""


def build_render_verify_analyze_prompt(
    *,
    error_log: str,
    script_content: str,
    fix_history: list[str] | None = None,
) -> str:
    """构建渲染错误分析 prompt（R1 角色）。"""
    history_section = ""
    if fix_history:
        history_lines = "\n".join(f"- {entry}" for entry in fix_history[-3:])
        history_section = (
            f"\n## 之前的修复尝试（请避免重复同样的修复方向）\n{history_lines}\n"
        )
    user_prompt = RENDER_VERIFY_ANALYZE_USER_PROMPT_TEMPLATE.format(
        error_log=error_log[:3000],
        script_content=script_content[:8000],
        fix_history_section=history_section,
    )
    return f"{RENDER_VERIFY_ANALYZE_SYSTEM_PROMPT}\n\n{user_prompt}"


def build_render_verify_fix_prompt(
    *,
    error_analysis: str,
    script_content: str,
    error_log: str = "",
) -> str:
    """构建渲染修复 prompt（V3 角色）。"""
    error_log_section = ""
    if error_log:
        tail_lines = error_log.strip().splitlines()[-50:]
        error_log_section = (
            f"\n## 原始渲染错误日志（最后 {len(tail_lines)} 行）\n"
            f"```\n{''.join(line + chr(10) for line in tail_lines)}```\n"
        )
    user_prompt = RENDER_VERIFY_FIX_USER_PROMPT_TEMPLATE.format(
        error_analysis=error_analysis[:2000],
        script_content=script_content[:8000],
        error_log_section=error_log_section,
    )
    return f"{RENDER_VERIFY_FIX_SYSTEM_PROMPT}\n\n{user_prompt}"
