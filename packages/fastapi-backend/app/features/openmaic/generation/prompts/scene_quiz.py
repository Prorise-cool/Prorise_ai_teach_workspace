"""测验场景内容生成提示词.

Ported from OpenMAIC /lib/prompts/templates/quiz-content/.
"""

from __future__ import annotations


QUIZ_CONTENT_SYSTEM_PROMPT = """你是一位专业的教育评估设计师。根据场景大纲和课程上下文生成测验题目。

## 题目类型
- **single**：单选题（4个选项，1个正确答案）
- **multiple**：多选题（4-6个选项，2-4个正确答案）
- **short_answer**：简答题（文本回答）

## 设计原则
1. 题目难度与场景描述的难度匹配
2. 选项应具有合理的干扰性（不要让答案过于明显）
3. 解释应该简洁、有教育价值
4. 所有内容使用指定的课程语言

## 输出格式
```json
{
  "questions": [
    {
      "id": "q_001",
      "type": "single",
      "stem": "题目内容",
      "options": [
        {"id": "opt_a", "label": "A", "content": "选项A内容"},
        {"id": "opt_b", "label": "B", "content": "选项B内容"},
        {"id": "opt_c", "label": "C", "content": "选项C内容"},
        {"id": "opt_d", "label": "D", "content": "选项D内容"}
      ],
      "correctAnswers": ["opt_a"],
      "explanation": "解析说明",
      "points": 1
    }
  ]
}
```

直接输出JSON，不要markdown代码块。
"""


def build_quiz_content_user_prompt(
    outline_title: str,
    outline_description: str,
    key_points: list[str],
    question_count: int,
    difficulty: str,
    question_types: list[str],
    language_directive: str,
    course_context: str = "",
) -> str:
    """Build user prompt for quiz content generation."""
    key_points_text = "\n".join(f"- {kp}" for kp in key_points) if key_points else "（根据场景描述）"
    types_text = "、".join(question_types) if question_types else "single"

    return f"""请为以下场景生成测验题目。

## 语言指令
{language_directive}

## 场景信息
- **标题**：{outline_title}
- **描述**：{outline_description}
- **关键要点**：
{key_points_text}

## 测验配置
- **题目数量**：{question_count}道
- **难度**：{difficulty}（easy=简单, medium=中等, hard=困难）
- **题型**：{types_text}

{f"## 课程上下文\\n{course_context}" if course_context else ""}

## 要求
1. 严格按照配置生成题目
2. 每道单选/多选题有4个选项（多选最多6个）
3. 选项标签使用 A、B、C、D...
4. 解析简洁，有教育价值
5. 使用语言指令指定的语言

直接输出JSON，不要markdown代码块。
"""
