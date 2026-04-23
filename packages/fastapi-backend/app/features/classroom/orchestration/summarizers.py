"""
Conversation summarization utilities.

Ported from references/OpenMAIC/lib/orchestration/summarizers/
(conversation-summary.ts, message-converter.ts, peer-context.ts,
state-context.ts, whiteboard-ledger.ts)
"""
from __future__ import annotations

from typing import Any

from .schemas import (
    ChatMessage,
    AgentTurnSummary,
    WhiteboardActionRecord,
    ClassroomContext,
)


# ── Summary limits ───────────────────────────────────────────────────────────
DEFAULT_MAX_CONVERSATION_MESSAGES = 10
DEFAULT_MAX_MESSAGE_CONTENT_LENGTH = 200
ACTION_RESULT_PREVIEW_LIMIT = 100
PEER_PREVIEW_LIMIT = 120
SLIDE_CONTENT_PREVIEW_LIMIT = 300
WHITEBOARD_ACTION_TAIL_LIMIT = 5


# ── Conversation summary (director context) ──────────────────────────────────

def summarize_conversation(
    messages: list[dict[str, str]],
    max_messages: int = DEFAULT_MAX_CONVERSATION_MESSAGES,
    max_content_length: int = DEFAULT_MAX_MESSAGE_CONTENT_LENGTH,
) -> str:
    """Condense recent conversation history into a plain-text summary.

    Args:
        messages: List of {'role': ..., 'content': ...} dicts.
    """
    if not messages:
        return "暂无对话记录。"

    recent = messages[-max_messages:]
    lines: list[str] = []
    for msg in recent:
        role_label = {
            "user": "学生",
            "assistant": "助手",
            "system": "系统",
        }.get(msg["role"], msg["role"])
        content = msg["content"]
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."
        lines.append(f"[{role_label}] {content}")

    return "\n".join(lines)


# ── Message format conversion ────────────────────────────────────────────────

def convert_messages_to_openai(
    messages: list[ChatMessage],
    current_agent_id: str | None = None,
) -> list[dict[str, str]]:
    """Convert UI ChatMessage objects to OpenAI-format dicts.

    Mirrors message-converter.ts: converts parts → content string,
    attributes other-agent messages as user role when current_agent_id is set.
    """
    result: list[dict[str, str]] = []

    for msg in messages:
        if msg.role not in ("user", "assistant"):
            continue

        if msg.role == "assistant":
            # Build JSON-array-style content from parts (few-shot format)
            items: list[dict[str, Any]] = []
            if msg.parts:
                for part in msg.parts:
                    if part.type == "text" and part.text:
                        items.append({"type": "text", "content": part.text})
                    elif part.type.startswith("action-") and part.state == "result":
                        action_name = part.action_name or part.type.replace("action-", "")
                        output = part.output or {}
                        is_success = output.get("success") is True
                        result_summary = (
                            f"result: {str(output.get('data', ''))[:ACTION_RESULT_PREVIEW_LIMIT]}"
                            if is_success and output.get("data")
                            else ("success" if is_success else output.get("error", "failed"))
                        )
                        items.append({"type": "action", "name": action_name, "result": result_summary})

            content = str(items) if items else ""
            msg_agent_id = msg.metadata.agent_id if msg.metadata else None

            # If another agent's message, show as user with attribution
            if current_agent_id and msg_agent_id and msg_agent_id != current_agent_id:
                sender = (msg.metadata.sender_name if msg.metadata else None) or msg_agent_id
                attributed = f"[{sender}]: {content}" if content else ""
                raw: dict[str, str] = {"role": "user", "content": attributed}
            else:
                raw = {"role": "assistant", "content": content}

        else:
            # user message
            parts_text: list[str] = []
            if msg.parts:
                for part in msg.parts:
                    if part.type == "text" and part.text:
                        parts_text.append(part.text)
                    elif part.type.startswith("action-") and part.state == "result":
                        action_name = part.action_name or part.type.replace("action-", "")
                        output = part.output or {}
                        is_success = output.get("success") is True
                        r = (
                            f"result: {str(output.get('data', ''))[:ACTION_RESULT_PREVIEW_LIMIT]}"
                            if is_success and output.get("data")
                            else ("success" if is_success else output.get("error", "failed"))
                        )
                        parts_text.append(f"[Action {action_name}: {r}]")

            content = "\n".join(parts_text)
            sender_name = msg.metadata.sender_name if msg.metadata else None
            if sender_name:
                content = f"[{sender_name}]: {content}"

            # Mark interrupted messages
            interrupted = msg.metadata.interrupted if msg.metadata else False
            if interrupted:
                content += "\n[此回复已被中断——请勿继续，开始新的JSON数组回复。]"

            raw = {"role": "user", "content": content}

        # Filter empty / whitespace-only messages
        stripped = raw["content"].replace(".", "").replace(" ", "").replace("…", "").strip()
        if stripped:
            result.append(raw)

    return result


# ── Peer context (what other agents already said) ────────────────────────────

def build_peer_context_section(
    agent_responses: list[AgentTurnSummary] | None,
    current_agent_name: str,
) -> str:
    """Summarise what other agents have said in this turn."""
    if not agent_responses:
        return ""

    others = [r for r in agent_responses if r.agent_name != current_agent_name]
    if not others:
        return ""

    lines = [f"\n# 已发言的同伴（本轮）"]
    for r in others:
        preview = (
            r.content_preview[:PEER_PREVIEW_LIMIT] + "..."
            if len(r.content_preview) > PEER_PREVIEW_LIMIT
            else r.content_preview
        )
        lines.append(f'- {r.agent_name}: "{preview}" [{r.action_count}个操作]')
    lines.append(
        "\n不要重复他们已经说过的内容——从独特的角度、后续问题或反驳意见切入。\n"
    )
    return "\n".join(lines)


# ── Classroom state context ──────────────────────────────────────────────────

def build_state_context(ctx: ClassroomContext) -> str:
    """Build a brief description of the classroom state for the agent prompt."""
    parts: list[str] = []

    if ctx.current_scene_type:
        scene_label = {
            "slide": "幻灯片",
            "quiz": "测验",
            "interactive": "互动模拟",
            "pbl": "项目式学习",
        }.get(ctx.current_scene_type, ctx.current_scene_type)
        parts.append(f"当前场景类型：{scene_label}")

    if ctx.slide_content:
        parts.append(f"当前幻灯片内容：{ctx.slide_content[:SLIDE_CONTENT_PREVIEW_LIMIT]}")

    wb_state = "已打开" if ctx.whiteboard_open else "已关闭"
    parts.append(f"白板状态：{wb_state}")

    return "\n".join(parts) if parts else "暂无场景信息。"


# ── Whiteboard ledger context ────────────────────────────────────────────────

def build_virtual_whiteboard_context(
    ctx: ClassroomContext,
    ledger: list[WhiteboardActionRecord] | None,
) -> str:
    """Replay the whiteboard ledger to summarise what's currently on the board."""
    if not ledger:
        return ""

    element_count = 0
    contributors: set[str] = set()
    action_summaries: list[str] = []

    for rec in ledger:
        name = rec.action_name
        if name == "wb_clear":
            element_count = 0
            action_summaries.append("（白板已清空）")
        elif name == "wb_delete":
            element_count = max(0, element_count - 1)
        elif name.startswith("wb_draw_"):
            element_count += 1
            contributors.add(rec.agent_name)
            action_summaries.append(f"{rec.agent_name} 绘制了 {name.replace('wb_draw_', '')}")
        elif name in ("wb_open", "wb_close", "wb_edit_code"):
            pass  # Skip structural actions

    if not action_summaries and element_count == 0:
        return ""

    lines = ["\n# 白板当前状态"]
    lines.append(f"元素数量：{element_count}")
    if contributors:
        lines.append(f"贡献者：{', '.join(sorted(contributors))}")
    if action_summaries:
        lines.append("近期操作记录：")
        for s in action_summaries[-WHITEBOARD_ACTION_TAIL_LIMIT:]:
            lines.append(f"  - {s}")
    lines.append("")
    return "\n".join(lines)
