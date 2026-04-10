"""独立解题 Prompt。

参考 manim-to-video-claw 的 solve_problem() 策略：
将题目单独发给推理模型（R1），要求输出完整解答过程和参考答案。
"""

from __future__ import annotations

SOLVE_SYSTEM_PROMPT = """你是一位数学教育专家，擅长逻辑推理和严谨解题。
请独立解答用户给出的题目，输出完整的解题过程和最终答案。

## 输出格式
严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{
  "referenceAnswer": "最终答案（简洁明确）",
  "solutionSteps": [
    {"stepId": "step_1", "title": "步骤标题", "explanation": "详细推理过程"},
    {"stepId": "step_2", "title": "步骤标题", "explanation": "详细推理过程"}
  ],
  "reasoningTrace": "整体解题思路概述（1-2句话）"
}
```

## 要求
- 每个步骤的 explanation 必须包含完整的数学推理，不要省略
- 数学符号使用 LaTeX 格式（如 $x^2$、$\\frac{a}{b}$）
- 确保最终答案正确无误
- 如果题目有多种解法，选择最直观易懂的一种"""

SOLVE_USER_PROMPT_TEMPLATE = """## 题目信息
题目内容：{source_text}

## 题目理解（供参考）
摘要：{topic_summary}
学科：{subject}
难度：{difficulty}
知识点：{knowledge_points}

请独立解答这道题，给出完整的解题过程和参考答案。"""


def build_solve_prompt(
    *,
    source_text: str,
    topic_summary: str,
    subject: str,
    difficulty: str,
    knowledge_points: list[str],
) -> str:
    """构建独立解题的完整 prompt（system + user）。"""
    user_prompt = SOLVE_USER_PROMPT_TEMPLATE.format(
        source_text=source_text,
        topic_summary=topic_summary,
        subject=subject,
        difficulty=difficulty,
        knowledge_points="、".join(knowledge_points),
    )
    return f"{SOLVE_SYSTEM_PROMPT}\n\n{user_prompt}"
