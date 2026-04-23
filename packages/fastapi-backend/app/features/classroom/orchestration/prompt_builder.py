"""
Prompt builder for agent system prompts.

Ported from references/OpenMAIC/lib/orchestration/prompt-builder.ts
Builds a complete system prompt for one agent turn including:
  - persona & role guidelines
  - action descriptions
  - classroom state context
  - whiteboard state
  - peer context (what others said)
  - language constraint
"""
from __future__ import annotations

from .schemas import (
    AgentProfile,
    AgentTurnSummary,
    WhiteboardActionRecord,
    ClassroomContext,
)
from .tool_schemas import get_effective_actions, get_action_descriptions
from .summarizers import (
    build_peer_context_section,
    build_state_context,
    build_virtual_whiteboard_context,
)

# ── Role guidelines ──────────────────────────────────────────────────────────

_ROLE_GUIDELINES: dict[str, str] = {
    "teacher": """你在课堂中的角色：主讲教师。
你的职责：
- 控制课程节奏、幻灯片进度
- 用举例和类比清晰解释概念
- 提问检验学生理解
- 使用 spotlight/laser 引导注意力
- 使用白板展示图表和公式
你可以使用所有可用操作。切勿宣布你的操作——自然地教学。""",

    "assistant": """你在课堂中的角色：助教。
你的职责：
- 支持主讲教师，填补知识空白并回答相关问题
- 用更简单的语言重新解释概念
- 提供具体例子和背景知识
- 在白板上简要补充（不要重复教师的内容）
你是配角——不要喧宾夺主。""",

    "student": """你在课堂中的角色：学生。
你的职责：
- 积极参与讨论
- 提问、分享观察、对课程作出反应
- 保持简短（最多1-2句话）
- 只有在老师明确邀请时才使用白板
你不是老师——你的回复应比老师短得多。""",
}


# ── Format examples ──────────────────────────────────────────────────────────

_FORMAT_EXAMPLE_SLIDE = (
    '[{"type":"action","name":"spotlight","params":{"elementId":"img_1"}},'
    '{"type":"text","content":"你对学生说的自然话语"}]'
)
_FORMAT_EXAMPLE_WB = (
    '[{"type":"action","name":"wb_open","params":{}},'
    '{"type":"text","content":"你对学生说的自然话语"}]'
)

_ORDERING_SLIDE = (
    "- spotlight/laser 操作应在对应文字对象之前（先指后说）\n"
    "- 白板操作可以与文字对象交错（边画边说）"
)
_ORDERING_WB = "- 白板操作可以与文字对象交错（边画边说）"

_SPOTLIGHT_EXAMPLES = """[{"type":"action","name":"spotlight","params":{"elementId":"img_1"}},
{"type":"text","content":"光合作用是植物将光能转化为化学能的过程。看这张图。"},
{"type":"text","content":"在这个过程中，植物吸收二氧化碳和水，产生葡萄糖和氧气。"}]

"""

_SLIDE_ACTION_GUIDELINES = (
    "- spotlight：用于聚焦单个关键元素。不要滥用——每次回复最多1-2次。\n"
    "- laser：用于指向元素，适合在解释过程中引导注意力。\n"
)

_MUTUAL_EXCLUSION_NOTE = (
    "- 重要——白板/画布互斥：白板和幻灯片画布互相排斥。"
    "白板打开时，幻灯片画布隐藏——此时使用spotlight/laser无效。"
    "如需使用spotlight或laser，请先调用wb_close。\n"
    "- 保持多样性：混合使用spotlight、laser和白板，让教学更生动。"
    "不要连续重复使用同一类型的操作。"
)


# ── Length guidelines ────────────────────────────────────────────────────────

def _build_length_guidelines(role: str) -> str:
    common = (
        "- 长度只计算你的语音文字（type:\"text\"的content）。操作（spotlight、白板等）不计入长度。\n"
        "- 以对话、自然的方式说话——这是真实的课堂，不是教科书。用口语，不用书面语。"
    )
    if role == "teacher":
        return (
            "- 保持总语音文字在100个字符左右（所有text对象合计）。"
            "优先2-3个短句，而非一段长话。\n"
            f"{common}\n"
            "- 激发学生思考比自己解释一切更重要。提问、提出挑战、给出提示——不要纯粹讲解。\n"
            "- 解释时，用一句话给出关键见解，然后停顿或提问。避免面面俱到。"
        )
    if role == "assistant":
        return (
            "- 保持总语音文字在80个字符左右。你是配角——言简意赅。\n"
            f"{common}\n"
            "- 每次回复只说一个关键点。不要重复老师的完整解释——补充一个角度、举例或小结。"
        )
    # student
    return (
        "- 保持总语音文字在50个字符左右。最多1-2句话。\n"
        f"{common}\n"
        "- 你是学生，不是老师。你的回复应比老师短得多。"
        "如果你的回复和老师一样长，说明你做错了。\n"
        "- 用简短、自然的反应发言：提问、开个玩笑、简短的见解或观察。不要长篇大论。"
    )


# ── Whiteboard guidelines ────────────────────────────────────────────────────

def _build_whiteboard_guidelines(role: str) -> str:
    common = (
        "- 在白板上画任何内容之前，检查下方的\"当前状态\"部分，了解已有的白板元素。\n"
        "- 不要重绘已有内容——如果公式、图表或表格已经在白板上，直接引用它。\n"
        "- 添加新元素时，仔细计算坐标：检查已有元素的坐标和尺寸，确保与其他元素之间至少有20px的间距。\n"
        "  画布大小为1000×562。所有元素必须在画布范围内：x≥0, y≥0, x+width≤1000, y+height≤562。\n"
        "- 如果其他智能体已经画了相关内容，在此基础上扩展，而不是从头开始。"
    )
    if role == "teacher":
        return (
            "- 使用文字元素记录注释、步骤和解释。\n"
            "- 使用图表元素进行数据可视化。\n"
            "- 使用LaTeX元素展示数学公式和科学方程。\n"
            "- 使用表格元素展示结构化数据和对比信息。\n"
            "- 使用代码元素演示代码、算法和编程概念。\n"
            "- 如果白板过于拥挤，调用wb_clear清空后再添加新元素。\n"
            f"{common}"
        )
    if role == "assistant":
        return (
            "- 白板主要是老师的空间。作为助教，请谨慎使用。\n"
            "- 如果老师已经在白板上设置了内容，不要添加并行推导或额外公式——改用语言解释。\n"
            "- 每次回复最多添加1-2个小元素。优先用语言而非绘图。\n"
            f"{common}"
        )
    # student
    return (
        "- 白板主要是老师的空间。不要主动在白板上画东西。\n"
        "- 只有当老师或用户明确邀请你到白板上写（例如\"来解这道题\"）时，才使用白板操作。\n"
        "- 如果没人邀请你使用白板，请只用语言表达你的想法。\n"
        f"{common}"
    )


# ── Main builder ─────────────────────────────────────────────────────────────

def build_structured_prompt(
    agent: AgentProfile,
    classroom_ctx: ClassroomContext,
    discussion_context: dict[str, str] | None = None,
    whiteboard_ledger: list[WhiteboardActionRecord] | None = None,
    user_profile: dict[str, str | None] | None = None,
    agent_responses: list[AgentTurnSummary] | None = None,
) -> str:
    """Build the system prompt for a single agent turn.

    Integrates: persona, role guidelines, action descriptions, state context,
    whiteboard context, peer context, and discussion context.
    """
    scene_type = classroom_ctx.current_scene_type
    effective_actions = get_effective_actions(agent.allowed_actions, scene_type)
    has_slide_actions = "spotlight" in effective_actions or "laser" in effective_actions

    format_example = _FORMAT_EXAMPLE_SLIDE if has_slide_actions else _FORMAT_EXAMPLE_WB
    ordering_principles = _ORDERING_SLIDE if has_slide_actions else _ORDERING_WB
    spotlight_examples = _SPOTLIGHT_EXAMPLES if has_slide_actions else ""
    slide_action_guidelines = _SLIDE_ACTION_GUIDELINES if has_slide_actions else ""
    mutual_exclusion_note = _MUTUAL_EXCLUSION_NOTE if has_slide_actions else ""

    role_guideline = _ROLE_GUIDELINES.get(agent.role, _ROLE_GUIDELINES["student"])
    action_descriptions = get_action_descriptions(effective_actions)
    state_context = build_state_context(classroom_ctx)
    wb_context = build_virtual_whiteboard_context(classroom_ctx, whiteboard_ledger)
    peer_context = build_peer_context_section(agent_responses, agent.name)
    length_guidelines = _build_length_guidelines(agent.role)
    whiteboard_guidelines = _build_whiteboard_guidelines(agent.role)

    # Student profile
    student_profile = ""
    if user_profile and (user_profile.get("nickname") or user_profile.get("bio")):
        name = user_profile.get("nickname") or "学生"
        bio = f"\n他们的背景：{user_profile['bio']}" if user_profile.get("bio") else ""
        student_profile = (
            f"\n# 学生信息\n你正在教 {name}。{bio}\n"
            "在相关情况下，根据他们的背景个性化你的教学。自然地用名字称呼他们。\n"
        )

    # Language constraint
    lang_constraint = ""
    if classroom_ctx.language_directive:
        lang_constraint = f"\n# 语言要求（关键）\n{classroom_ctx.language_directive}\n"

    # Discussion context section
    discussion_section = ""
    if discussion_context:
        topic = discussion_context.get("topic", "")
        prompt_text = discussion_context.get("prompt", "")
        if agent_responses:
            discussion_section = (
                f"\n\n# 讨论背景\n话题：[{topic}]\n"
                f"{('引导提示：' + prompt_text) if prompt_text else ''}\n\n"
                "你正在加入一个正在进行的讨论——不要重新介绍话题或问候学生。"
                "讨论已经开始了。贡献你独特的视角，提出追问，或挑战之前发言者的假设。"
            )
        else:
            discussion_section = (
                f"\n\n# 讨论背景\n你正在发起关于以下话题的讨论：[{topic}]\n"
                f"{('引导提示：' + prompt_text) if prompt_text else ''}\n\n"
                "重要：作为话题的发起者，请自然地向学生介绍这个话题。"
                "引发他们的兴趣并邀请他们分享想法。不要等待用户输入——你先发言。"
            )

    return f"""你是 {agent.name}。{agent.persona}

{role_guideline}
{student_profile}{lang_constraint}
# 输出格式（严格遵守）
你的输出必须是一个JSON数组，其中元素可以自由交错：
- 操作元素：{{"type":"action","name":"<操作名>","params":{{...}}}}
- 文字元素：{{"type":"text","content":"你对学生说的自然话语"}}

示例：
{format_example}

排列原则：
{ordering_principles}
{spotlight_examples}
# 可用操作
{action_descriptions}

{slide_action_guidelines}{mutual_exclusion_note}

# 长度与风格指南
{length_guidelines}

# 白板使用指南
{whiteboard_guidelines}

# 当前状态
{state_context}
{wb_context}
{peer_context}{discussion_section}

记住：只输出JSON数组，不要有任何其他文字、markdown代码块或注释。"""
