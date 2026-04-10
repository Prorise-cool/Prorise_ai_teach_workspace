"""Plan D 分镜 Prompt。

两步策略替代单次 LLM 调用：
1. 教学大纲：基于 understanding + solve_result，输出教学步骤列表。
2. 逐场景展开：每次输入 1 个步骤 + 前文上下文，输出 voiceText + imageDesc。

参考 manim-to-video-claw 的 ai_storyboard() 策略。
"""

from __future__ import annotations

OUTLINE_SYSTEM_PROMPT = """你是一位资深数学教师，正在为一道题目设计教学视频的教学大纲。
你已经拿到了题目的参考答案和完整解题步骤。

请将解题过程规划成 4-6 个教学步骤（场景），每个步骤是教学视频中的一个独立片段。

## 输出格式
严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{
  "outline": [
    {{
      "stepIndex": 1,
      "title": "教学步骤标题",
      "teachingGoal": "这个片段要让学生理解什么",
      "keyContent": "涉及的核心公式/概念/推理"
    }}
  ]
}}
```

## 规划原则
1. 第一步：展示题目、明确已知条件和求解目标
2. 中间步骤：逐步推导，每步只讲一个关键知识点或推理步骤
3. 最后一步：总结归纳解法和常见易错点
4. 步骤之间保持逻辑递进关系
5. 每个步骤适合 8-30 秒的视频片段"""

OUTLINE_USER_PROMPT_TEMPLATE = """## 题目信息
题目内容：{source_text}
学科：{subject} | 难度：{difficulty}
知识点：{knowledge_points}

## 参考答案
{reference_answer}

## 解题步骤
{solution_steps_text}

请基于以上参考答案，规划教学视频的教学大纲。"""


SCENE_EXPAND_SYSTEM_PROMPT = """你是一位资深数学教师，正在为教学视频的一个片段撰写旁白和视觉描述。

对于每个教学步骤，你需要输出：
- **voiceText**：面向学生的口语化讲解（数学符号口语化：x² → "x的平方"，∫ → "积分"，≤ → "小于等于"）
- **imageDesc**：Manim 动画场景描述（公式用 LaTeX，用 MathTex 类）

## 输出格式
严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{
  "voiceText": "口语化讲解文字",
  "imageDesc": "Manim 场景视觉描述（公式用 LaTeX）",
  "durationHint": 15
}}
```

## 约束
- voiceText 必须口语化，面向学生讲解，禁止出现 LaTeX 语法
- imageDesc 描述 Manim 能实现的内容，公式用 LaTeX
- durationHint 为建议时长（秒），范围 8-30"""

SCENE_EXPAND_USER_PROMPT_TEMPLATE = """## 前文上下文
{prev_context}

## 当前教学步骤
标题：{step_title}
教学目标：{teaching_goal}
核心内容：{key_content}

## 参考答案片段
{reference_snippet}

请为这个教学步骤撰写旁白和视觉描述。"""


def build_outline_prompt(
    *,
    source_text: str,
    subject: str,
    difficulty: str,
    knowledge_points: list[str],
    reference_answer: str,
    solution_steps_text: str,
) -> str:
    """构建教学大纲生成的完整 prompt。"""
    user_prompt = OUTLINE_USER_PROMPT_TEMPLATE.format(
        source_text=source_text[:2000],
        subject=subject,
        difficulty=difficulty,
        knowledge_points="、".join(knowledge_points),
        reference_answer=reference_answer,
        solution_steps_text=solution_steps_text,
    )
    return f"{OUTLINE_SYSTEM_PROMPT}\n\n{user_prompt}"


def build_scene_expand_prompt(
    *,
    step_title: str,
    teaching_goal: str,
    key_content: str,
    reference_snippet: str,
    prev_context: str,
) -> str:
    """构建单场景展开的完整 prompt。"""
    user_prompt = SCENE_EXPAND_USER_PROMPT_TEMPLATE.format(
        step_title=step_title,
        teaching_goal=teaching_goal,
        key_content=key_content,
        reference_snippet=reference_snippet,
        prev_context=prev_context or "（这是第一个场景，没有前文）",
    )
    return f"{SCENE_EXPAND_SYSTEM_PROMPT}\n\n{user_prompt}"


# ------------------------------------------------------------------
# 单次 LLM 分镜 prompt（Plan D 失败后的回退路径）
# ------------------------------------------------------------------

STORYBOARD_PROMPT = """你是一位资深教师，请为以下题目生成教学视频分镜。

## 题目信息
{understanding_json}

## 要求
生成 4-6 个教学场景，严格按以下 JSON 格式输出（不要输出其他内容）：

```json
{{{{
  "scenes": [
    {{{{
      "title": "场景标题",
      "voiceText": "口语化讲解文字（数学符号口语化：x²→x的平方，∫→积分，≤→小于等于）",
      "imageDesc": "Manim场景描述（要显示什么文本/公式/图形，公式用LaTeX，用MathTex）",
      "durationHint": 12
    }}}}
  ]
}}}}
```

## 场景规划
1. 展示题目 — 展示题目核心条件
2. 分析考点 — 点明关键知识点和解题思路
3-4. 步骤解析 — 逐步讲解解题过程
5. 总结归纳 — 归纳解法和要点

## 约束
- voiceText 必须口语化，面向学生讲解，禁止 LaTeX
- imageDesc 描述 Manim 能实现的内容，公式用 LaTeX
- 每个场景补充 durationHint（秒），单场景建议 8-30 秒，总时长尽量落在 90-180 秒
- 展示题目时不要展示答案"""


def build_single_shot_storyboard_prompt(*, understanding_json: str) -> str:
    """构建单次 LLM 分镜生成的完整 prompt。"""
    return STORYBOARD_PROMPT.format(understanding_json=understanding_json)
