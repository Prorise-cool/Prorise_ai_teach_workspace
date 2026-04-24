"""课堂多智能体讨论 chat 路由。

合并自原 ``app.features.openmaic.routes:chat``。Wave 1 路径：
``POST /api/v1/classroom/chat`` —— SSE 推送 director graph 事件。
对话轮次完成后 best-effort 写入 ``LongTermConversationRepository``。
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse

from app.core.security import AccessContext, get_access_context
from app.features.classroom.chat_sse_broker import ChatSseBroker, get_chat_sse_broker
from app.features.classroom.schemas import ChatContextPayload, ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter()


def _sse_event(data: str, event: str | None = None, event_id: str | None = None) -> str:
    """组装 SSE 帧；``event_id`` 对应 ``id:`` 字段，驱动浏览器 Last-Event-ID。"""
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {data}")
    lines.append("")
    return "\n".join(lines) + "\n"


def _sse_done() -> str:
    return _sse_event("[DONE]")


def _channel_key(task_id: str | None) -> str:
    """固定格式：``classroom_chat_{task_id or anon_<uuid>}``。"""
    return f"classroom_chat_{task_id or f'anon_{uuid.uuid4().hex}'}"


@router.post("/chat")
async def classroom_chat(
    payload: ChatRequest,
    access_context: AccessContext = Depends(get_access_context),
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
    broker: ChatSseBroker = Depends(get_chat_sse_broker),
) -> StreamingResponse:
    """多智能体讨论 SSE 流。

    委托给 ``app.features.classroom.orchestration.run_discussion``（LangGraph）。
    事件映射（后端 ChatEvent → 前端）：
      agent_switch  → ``{type:"agent_start", data:{agentId,agentName,agentColor}}``
      text_delta    → ``{type:"text_delta",  data:{content,messageId}}``
      agent_turn_end → ``{type:"agent_turn_end", data:{agentId,messageId}}``
      tool_call     → ``{type:"tool_call",   data:{actionId,name,args,agentId}}``
      summary       → ``{type:"summary",     data:{text}}``
      end           → ``{type:"done"}``
      error         → ``{type:"error",       data:{message}}``
    """
    from app.features.classroom.llm_adapter import resolve_classroom_providers
    from app.features.classroom.orchestration import run_discussion as _run_discussion
    from app.features.classroom.orchestration.schemas import (
        AgentProfile as OrchAgentProfile,
    )
    from app.features.classroom.orchestration.schemas import (
        ChatMessage as OrchChatMessage,
    )
    from app.features.classroom.orchestration.schemas import (
        ClassroomContext as OrchClassroomContext,
    )
    from app.features.classroom.orchestration.schemas import (
        DiscussionRequest as OrchDiscussionRequest,
    )
    from app.features.classroom.orchestration.schemas import (
        MessageMetadata as OrchMessageMetadata,
    )
    from app.features.classroom.orchestration.schemas import (
        MessagePart as OrchMessagePart,
    )

    provider_chain = await resolve_classroom_providers(
        "director",
        access_token=access_context.token,
        client_id=access_context.client_id,
    )

    orch_messages = [
        OrchChatMessage(
            role=m.role,
            parts=[OrchMessagePart(type="text", text=m.content or "")],
            metadata=(OrchMessageMetadata(agent_id=m.agent_id) if m.agent_id else None),
        )
        for m in payload.messages
    ]
    _valid_roles = {"teacher", "assistant", "student"}
    orch_agents = [
        OrchAgentProfile(
            id=a.id,
            name=a.name,
            persona=getattr(a, "persona", "") or "",
            role=(a.role if a.role in _valid_roles else "teacher"),  # type: ignore[arg-type]
            avatar=getattr(a, "avatar", None),
            color=getattr(a, "color", None),
        )
        for a in payload.agents
    ]
    orch_context = _to_orch_context(
        payload.classroom_context,
        payload.language_directive,
        OrchClassroomContext,
    )
    orch_request = OrchDiscussionRequest(
        messages=orch_messages,
        agents=orch_agents,
        classroom_context=orch_context,
        max_turns=6,
    )

    user_question = _extract_last_user_text(payload)
    answer_buffer: list[str] = []
    channel = _channel_key(payload.task_id)
    # 若 channel 已有缓存（断线重连场景），新事件序号从缓存末尾续接，避免 id 冲突
    seq = len(broker.replay(channel))

    def _emit(event_name: str, payload_dict: dict) -> str:
        nonlocal seq
        seq += 1
        data = json.dumps(payload_dict, ensure_ascii=False)
        event_id = f"{channel}:{seq}"
        broker.publish(channel, event_id=event_id, event_name=event_name, data=data)
        return _sse_event(data, event=event_name, event_id=event_id)

    async def _chat_stream() -> AsyncIterator[str]:
        # 断线重连：先回放 Last-Event-ID 之后的缓存（若未知 ID 则全量）
        if last_event_id:
            for replayed in broker.replay(channel, after_event_id=last_event_id):
                yield _sse_event(
                    replayed.data,
                    event=replayed.event_name,
                    event_id=replayed.event_id,
                )

        try:
            async for event in _run_discussion(orch_request, provider_chain):
                payload_dict = _translate_chat_event(event)
                if payload_dict is None:
                    continue
                event_name = str(payload_dict.get("type") or "message")
                if event_name == "text_delta":
                    answer_buffer.append(
                        str((payload_dict.get("data") or {}).get("content") or "")
                    )
                yield _emit(event_name, payload_dict)

            yield _emit("done", {"type": "done"})
            yield _sse_done()
        except Exception as exc:  # noqa: BLE001
            logger.error("classroom.routes_chat.error %s", exc, exc_info=exc)
            yield _emit("error", {"type": "error", "data": {"message": str(exc)}})
            yield _sse_done()
        finally:
            _persist_chat_turn(
                payload=payload,
                access_context=access_context,
                question=user_question,
                answer="".join(answer_buffer),
            )
            broker.drop(channel)

    return StreamingResponse(
        _chat_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _to_orch_context(
    raw: "str | ChatContextPayload",
    language_directive: str,
    ctx_cls: type,
) -> Any:
    """把 Phase 4 的新结构或旧 str 统一映射到 orchestration ``ClassroomContext``。

    - 旧 ``str`` 直接塞到 ``slide_content`` 字段（保留既有 prompt 行为）。
    - 新 ``ChatContextPayload`` 全量映射结构化字段，并把 ``canvas_summary``
      拼进 ``slide_content`` 让不感知新字段的 prompt 片段仍然拿到摘要。
    """

    lang = language_directive or None

    if isinstance(raw, ChatContextPayload):
        parts: list[str] = []
        if raw.scene_title:
            parts.append(f"场景：{raw.scene_title}")
        if raw.scene_body:
            parts.append(f"正文：{raw.scene_body}")
        if raw.canvas_summary:
            parts.append(f"画布：\n{raw.canvas_summary}")
        legacy_slide = "\n".join(parts) if parts else None
        return ctx_cls(
            current_scene_id=raw.scene_id,
            slide_content=legacy_slide,
            language_directive=lang,
            scene_title=raw.scene_title,
            scene_body=raw.scene_body,
            key_points=list(raw.key_points or []),
            recent_speech=raw.recent_speech,
            canvas_summary=raw.canvas_summary,
        )

    # 旧字符串路径：保持 pre-Phase-4 行为
    return ctx_cls(
        slide_content=(raw or None),
        language_directive=lang,
    )


def _context_scope_summary(raw: "str | ChatContextPayload") -> str | None:
    """把 classroom_context 压成 long_term 记忆的 scope_summary（单行）。"""
    if isinstance(raw, ChatContextPayload):
        bits: list[str] = []
        if raw.scene_title:
            bits.append(raw.scene_title)
        if raw.scene_body:
            bits.append(raw.scene_body[:160])
        return " / ".join(bits) if bits else None
    return raw or None


def _extract_last_user_text(payload: ChatRequest) -> str:
    for msg in reversed(payload.messages):
        if msg.role == "user" and msg.content:
            return msg.content
    return ""


def _translate_chat_event(event: Any) -> dict | None:
    """把 orchestration ChatEvent 映射到前端友好结构。"""
    t = getattr(event, "type", None)
    if t == "agent_switch":
        return {
            "type": "agent_start",
            "data": {
                "agentId": event.agent_id,
                "agentName": event.agent_name,
                "agentColor": event.agent_color,
                "agentAvatar": event.agent_avatar,
                "messageId": event.message_id,
            },
        }
    if t == "text_delta":
        return {
            "type": "text_delta",
            "data": {"content": event.content, "messageId": event.message_id},
        }
    if t == "agent_turn_end":
        return {
            "type": "agent_turn_end",
            "data": {"agentId": event.agent_id, "messageId": event.message_id},
        }
    if t == "tool_call":
        return {
            "type": "tool_call",
            "data": {
                "actionId": event.action_id,
                "name": event.name,
                "args": event.args,
                "agentId": event.agent_id,
            },
        }
    if t == "summary":
        return {"type": "summary", "data": {"text": event.text}}
    if t == "end":
        return {"type": "done"}
    if t == "error":
        return {"type": "error", "data": {"message": event.message}}
    # thinking / cue_user / unknown 直接 drop
    return None


def _persist_chat_turn(
    *,
    payload: ChatRequest,
    access_context: AccessContext,
    question: str,
    answer: str,
) -> None:
    """把一轮 chat 结果落到 LongTermConversationRepository（best-effort）。"""
    if not (question or answer):
        return
    try:
        from app.shared.long_term import (
            AnchorContext,
            AnchorKind,
            CompanionTurnCreateRequest,
            ContextType,
            shared_long_term_repository,
        )

        anchor_ref = payload.task_id or "classroom"
        request = CompanionTurnCreateRequest(
            user_id=access_context.user_id or "anonymous",
            session_id=payload.task_id or "classroom-default",
            context_type=ContextType.CLASSROOM,
            anchor=AnchorContext(
                context_type=ContextType.CLASSROOM,
                anchor_kind=AnchorKind.TOPIC,
                anchor_ref=anchor_ref,
                scope_summary=_context_scope_summary(payload.classroom_context),
            ),
            question_text=question or "(no user input)",
            answer_summary=answer[:1000] or "(empty answer)",
        )
        shared_long_term_repository.save_companion_turn(request)
    except Exception as exc:  # noqa: BLE001
        logger.warning("classroom.routes_chat.persist_turn_failed error=%s", exc)
