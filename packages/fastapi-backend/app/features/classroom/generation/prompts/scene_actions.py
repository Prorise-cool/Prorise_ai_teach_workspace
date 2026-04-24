"""场景动作生成提示词.

Ported from OpenMAIC /lib/prompts/templates/slide-actions/ and agent-system/.
"""

from __future__ import annotations

SCENE_ACTIONS_SYSTEM_PROMPT = """你是一位专业的教学设计师，负责为场景生成教学动作序列。

## 核心任务

基于场景的元素列表、关键要点和描述，生成一系列教学动作，使演示更具吸引力和节奏感。

---

## 输出格式

必须直接输出JSON数组。每个元素是一个含有 `type` 字段的对象：

```json
[
  {
    "type": "action",
    "name": "spotlight",
    "params": { "elementId": "text_abc123" }
  },
  { "type": "text", "content": "首先，让我们看看核心概念..." },
  { "type": "text", "content": "这里的关键公式说明了..." }
]
```

### 格式规则
1. 输出单个JSON数组——无解释，无代码块
2. `type:"action"` 对象包含 `name` 和 `params`
3. `type:"text"` 对象包含 `content`（朗读文字）
4. 动作和文字对象可以任意顺序交错
5. `]` 闭合括号标志响应结束

### 排序原则
- spotlight动作应出现在对应文字对象**之前**（先指出，再讲解）
- 多个spotlight+文字对创造自然的"聚焦然后解释"流程

---

## 可用动作类型

### spotlight（聚焦元素）
高亮幻灯片上的特定元素，配合旁白使用。
```json
{"type": "action", "name": "spotlight", "params": {"elementId": "text_abc123"}}
```

### discussion（触发讨论）
触发课堂讨论（必须是最后一个动作）。
```json
{"type": "action", "name": "discussion", "params": {"question": "讨论问题"}}
```

> ⚠️ **本次系统已移除白板与激光指针**：禁止生成 `wb_open / wb_close / wb_draw_text /
> wb_draw_shape / wb_draw_latex / wb_draw_line / wb_clear / wb_delete / laser / laser_pointer`
> 等任何白板或激光相关动作，否则前端将忽略并影响节奏。

---

## 重要规则

1. **不要宣布动作**：不要说"让我打开白板"、"我要画一个图"等
2. **不要报告动作结果**：不要说"图已经画好了"等
3. **spotlight优先**：先用spotlight指出元素，再用文字解释
4. **discussion必须是最后一个**：如果使用discussion动作，它必须是数组中最后一个元素
5. **🚨 elementId 严格约束（最重要）**：
   - `spotlight` 动作的 `params.elementId` 必须**逐字复制**自用户提供的"可用元素 ID 清单"
   - **禁止**编造 id（例如 "title_area"、"content_box"、"summary_text" 等）
   - **禁止**使用元素的 type 或 description 作为 id
   - 如果找不到合适元素就**省略 spotlight**，不要硬给一个假 id
   - 违反此规则会导致前端 spotlight 完全失效

---

## 教学语言
使用指定的语言指令生成所有讲解文字（type:"text"内容）。
"""


def build_scene_actions_user_prompt(
    outline_title: str,
    outline_description: str,
    scene_type: str,
    content_summary: str,
    agents: list[dict],
    language_directive: str,
    available_elements: list[dict] | None = None,
) -> str:
    """Build user prompt for scene action generation.

    Args:
        available_elements: 该场景真实存在的 element 清单（每项含 id / type / 简短描述）。
            仅 slide 场景需要，供 LLM 生成 spotlight 时作为合法 elementId 来源。
    """
    teacher_agent = next(
        (a for a in agents if a.get("role") == "teacher"),
        agents[0] if agents else None,
    )
    teacher_name = teacher_agent["name"] if teacher_agent else "教师"
    teacher_persona = teacher_agent.get("persona", "专业、热情的教师") if teacher_agent else "专业、热情的教师"

    available_elements = available_elements or []
    if available_elements and scene_type == "slide":
        id_lines = []
        for el in available_elements:
            el_id = el.get("id", "")
            el_type = el.get("type", "")
            desc = el.get("desc", "")
            if el_id:
                id_lines.append(f"  - `{el_id}` ({el_type}): {desc}" if desc else f"  - `{el_id}` ({el_type})")
        element_block = "\n".join(id_lines) if id_lines else "  （无可用元素）"
        elements_section = f"""
## 🎯 可用元素 ID 清单（spotlight 必须逐字使用这些 ID）
{element_block}

**警告**：如果你生成的 `spotlight.params.elementId` 不在上面清单里，前端将完全无法高亮。
如果清单为空或找不到合适元素，**请省略 spotlight 动作**。
"""
    else:
        elements_section = ""

    return f"""请为以下{_scene_type_name(scene_type)}场景生成教学动作序列。

## 语言指令
{language_directive}

## 场景信息
- **标题**：{outline_title}
- **描述**：{outline_description}
- **场景类型**：{scene_type}

## 教师信息
- **姓名**：{teacher_name}
- **角色**：{teacher_persona}

## 场景内容摘要
{content_summary}
{elements_section}
## 要求
1. 生成自然流畅的教学动作序列
2. 合理使用spotlight和白板工具增强讲解
3. 所有朗读文字（type:"text"）使用指定的课程语言
4. 控制在5-15个动作以内，保持节奏适中
5. 讲解文字每段控制在2-3句话以内
6. spotlight 的 elementId 只能从上面的"可用元素 ID 清单"中逐字选取

直接输出JSON数组，不要markdown代码块或解释。
"""


def _scene_type_name(scene_type: str) -> str:
    names = {
        "slide": "幻灯片",
        "quiz": "测验",
        "interactive": "互动",
        "pbl": "项目式学习",
    }
    return names.get(scene_type, scene_type)
