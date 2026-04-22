"""
Director prompt builder (Chinese primary).

Ported from references/OpenMAIC/lib/orchestration/director-prompt.ts
The director LLM receives this prompt and decides which agent speaks next.
Output format: JSON { "next_agent": "<agent_id>" | "END" | "USER" }
"""
from __future__ import annotations

import json
import logging

from .schemas import AgentProfile, AgentTurnSummary, WhiteboardActionRecord

log = logging.getLogger(__name__)


# ── Whiteboard helpers ───────────────────────────────────────────────────────

def _summarize_agent_wb_actions(actions: list[WhiteboardActionRecord]) -> str:
    """Compact description of one agent's whiteboard actions."""
    if not actions:
        return ""

    parts: list[str] = []
    for a in actions:
        n = a.action_name
        p = a.params
        if n == "wb_draw_text":
            c = str(p.get("content", ""))[:30]
            ellipsis = "..." if len(str(p.get("content", ""))) >= 30 else ""
            parts.append(f'写文字"{c}{ellipsis}"')
        elif n == "wb_draw_shape":
            parts.append(f"画形状({p.get('shape', 'rectangle')})")
        elif n == "wb_draw_chart":
            ct = p.get("chartType", p.get("type", "bar"))
            parts.append(f"画图表({ct})")
        elif n == "wb_draw_latex":
            latex = str(p.get("latex", ""))[:30]
            parts.append(f"写公式[{latex}]")
        elif n == "wb_draw_table":
            data = p.get("data", [])
            rows = len(data) if isinstance(data, list) else 0
            cols = len(data[0]) if rows and isinstance(data[0], list) else 0
            parts.append(f"画表格({rows}×{cols})")
        elif n == "wb_draw_line":
            parts.append("画线/箭头")
        elif n == "wb_draw_code":
            lang = str(p.get("language", ""))
            parts.append(f"画代码块({lang})")
        elif n == "wb_clear":
            parts.append("清空白板")
        elif n == "wb_delete":
            parts.append(f"删除元素({p.get('elementId', '?')})")

    return "、".join(parts)


def _build_whiteboard_state_section(ledger: list[WhiteboardActionRecord] | None) -> str:
    """Build whiteboard state block for the director prompt."""
    if not ledger:
        return ""

    element_count = 0
    contributors: set[str] = set()

    for rec in ledger:
        if rec.action_name == "wb_clear":
            element_count = 0
        elif rec.action_name == "wb_delete":
            element_count = max(0, element_count - 1)
        elif rec.action_name.startswith("wb_draw_"):
            element_count += 1
            contributors.add(rec.agent_name)

    crowded_warning = (
        "\n⚠ 白板内容较多。建议调度能整理或清空白板的智能体，而非继续添加内容。"
        if element_count > 5
        else ""
    )

    contrib_str = "、".join(sorted(contributors)) if contributors else "无"
    return (
        f"\n# 白板状态\n"
        f"当前元素数：{element_count}\n"
        f"贡献者：{contrib_str}{crowded_warning}\n"
    )


# ── Director system prompt ───────────────────────────────────────────────────

def build_director_prompt(
    agents: list[AgentProfile],
    conversation_summary: str,
    agent_responses: list[AgentTurnSummary],
    turn_count: int,
    discussion_context: dict[str, str] | None = None,
    trigger_agent_id: str | None = None,
    whiteboard_ledger: list[WhiteboardActionRecord] | None = None,
    user_profile: dict[str, str | None] | None = None,
    whiteboard_open: bool = False,
) -> str:
    """Build the system prompt for the director agent (Chinese).

    The director receives this prompt + "Decide which agent speaks next."
    and must output JSON: { "next_agent": "<id>" | "END" | "USER" }
    """
    agent_list = "\n".join(
        f'- id: "{a.id}", 名称: "{a.name}", 角色: {a.role}, 优先级: {a.priority}'
        for a in agents
    )

    if agent_responses:
        responded_lines: list[str] = []
        for r in agent_responses:
            wb_summary = _summarize_agent_wb_actions(r.whiteboard_actions)
            wb_part = f" | 白板操作：{wb_summary}" if wb_summary else ""
            responded_lines.append(
                f'- {r.agent_name}（{r.agent_id}）："{r.content_preview}" '
                f"[{r.action_count}个操作{wb_part}]"
            )
        responded_list = "\n".join(responded_lines)
    else:
        responded_list = "尚无。"

    is_discussion = bool(discussion_context)

    discussion_section = ""
    if is_discussion and discussion_context:
        topic = discussion_context.get("topic", "")
        prompt_text = discussion_context.get("prompt", "")
        initiator = f'\n发起者："{trigger_agent_id}"' if trigger_agent_id else ""
        discussion_section = (
            f"\n# 讨论模式\n"
            f'话题："{topic}"'
            f'{chr(10) + "提示：" + prompt_text if prompt_text else ""}'
            f"{initiator}\n"
            f"这是学生发起的讨论，而非问答环节。\n"
        )

    if is_discussion:
        initiator_label = f'（"{trigger_agent_id}"）' if trigger_agent_id else ""
        rule1 = (
            f"1. 讨论发起者{initiator_label}应首先发言以启动话题，"
            f"随后老师引导讨论，之后其他学生可以补充各自观点。"
        )
    else:
        rule1 = "1. 老师（角色：teacher，最高优先级）通常应首先发言，回应用户的问题或话题。"

    student_profile_section = ""
    if user_profile and (user_profile.get("nickname") or user_profile.get("bio")):
        name = user_profile.get("nickname") or "学生"
        bio_part = f"\n背景：{user_profile['bio']}" if user_profile.get("bio") else ""
        student_profile_section = f"\n# 学生信息\n学生姓名：{name}{bio_part}\n"

    wb_section = _build_whiteboard_state_section(whiteboard_ledger)
    wb_open_text = (
        "已打开（幻灯片画布隐藏——spotlight/laser 无效）"
        if whiteboard_open
        else "已关闭（幻灯片画布可见）"
    )

    return f"""你是多智能体课堂的调度导演。你的职责是决定接下来由哪个智能体发言。

# 可用智能体
{agent_list}

{discussion_section}{student_profile_section}
# 本轮已发言
{responded_list}

# 近期对话摘要
{conversation_summary}

{wb_section}
# 白板状态：{wb_open_text}

# 决策规则
{rule1}
2. 避免同一智能体连续发言超过2次（除非没有其他合适的发言者）。
3. 当话题已充分讨论、学生已获得所需信息，或已达到第 {turn_count + 1} 轮时，选择 END。
4. 如果需要让学生（用户）先回应，则选择 USER。
5. 只有在合理的情况下才切换到其他智能体——不要为了变化而变化。

# 输出格式（必须严格遵守）
只输出一个JSON对象，不要有其他文字：
{{"next_agent": "<智能体id> | END | USER"}}

示例：
{{"next_agent": "teacher-1"}}
{{"next_agent": "END"}}
{{"next_agent": "USER"}}
"""


# ── Decision parser ──────────────────────────────────────────────────────────

def parse_director_decision(content: str) -> dict[str, str | bool]:
    """Parse the director's JSON decision from raw LLM output.

    Returns: { "next_agent_id": str | None, "should_end": bool }
    """
    try:
        import re
        match = re.search(r'\{[\s\S]*?"next_agent"[\s\S]*?\}', content)
        if match:
            parsed = json.loads(match.group(0))
            next_agent = parsed.get("next_agent")
            if not next_agent or next_agent == "END":
                return {"next_agent_id": None, "should_end": True}
            return {"next_agent_id": next_agent, "should_end": False}
    except Exception:
        log.warning("[Director] Failed to parse decision: %s", content[:200])

    return {"next_agent_id": None, "should_end": True}
