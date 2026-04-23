"""智能体画像生成提示词.

Ported from OpenMAIC agent-profiles route prompt.
"""

from __future__ import annotations

AGENT_PROFILES_SYSTEM_PROMPT = """你是一位专业的教学设计师。为多智能体课堂模拟生成智能体画像。
根据课程内容和复杂度，决定合适的智能体数量（通常3-5个）。
仅返回有效JSON，不要markdown或解释。"""


def build_agent_profiles_user_prompt(
    stage_name: str,
    stage_description: str | None,
    scene_outlines_summary: str,
    language_directive: str,
    available_avatars: list[str],
) -> str:
    """Build user prompt for agent profile generation."""
    avatars_text = ", ".join(available_avatars[:10]) if available_avatars else "default_avatar"
    desc_text = f"\n**描述**：{stage_description}" if stage_description else ""

    return f"""请为以下课程生成智能体画像。

## 语言指令
{language_directive}

## 课程信息
- **名称**：{stage_name}{desc_text}

## 场景大纲
{scene_outlines_summary}

## 可用头像（从中选择）
{avatars_text}

## 要求
生成3-5个智能体，包括：
- 1个主教师（role: "teacher"）
- 1-2个助教或学生代表（role: "student" 或 "assistant"）

每个智能体需要：
- 独特的名字（符合课程文化背景）
- 简短的人设描述（2-3句话）
- 从可用头像列表中选择头像路径
- 分配一个专业颜色（如 #4A90D9, #E74C3C, #2ECC71, #F39C12, #9B59B6）

输出格式：
```json
[
  {{
    "id": "agent_teacher",
    "name": "姓名",
    "role": "teacher",
    "persona": "人设描述",
    "avatar": "头像路径",
    "color": "#4A90D9"
  }}
]
```

直接输出JSON数组。
"""
