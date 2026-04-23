"""
Director Graph — LangGraph StateGraph for multi-agent orchestration.

Ported from references/OpenMAIC/lib/orchestration/director-graph.ts

Graph topology (same as reference):

    START → director ──(should_end)──→ END
               │
               └─(continue)→ agent_generate ──→ director (loop)

Director strategy:
  - Single agent: code-only (no LLM). Turn 0 → dispatch agent. Turn 1+ → cue user.
  - Multi-agent: LLM-based decision with code fast-paths for turn 0 + trigger agent.

Events are emitted via a shared asyncio.Queue so callers can stream them.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, AsyncIterator, Sequence, TypedDict

from langgraph.graph import StateGraph, START, END
from app.providers.protocols import LLMProvider

from .schemas import (
    AgentProfile,
    AgentTurnSummary,
    ChatMessage,
    ClassroomContext,
    DirectorState,
    DiscussionRequest,
    WhiteboardActionRecord,
    ChatEvent,
    AgentSwitchEvent,
    TextDeltaEvent,
    ToolCallEvent,
    AgentTurnEndEvent,
    ThinkingEvent,
    CueUserEvent,
    ErrorEvent,
    EndEvent,
)
from .director_prompt import build_director_prompt, parse_director_decision
from .prompt_builder import build_structured_prompt
from .summarizers import convert_messages_to_openai, summarize_conversation
from .ai_sdk_adapter import call_llm, stream_llm

log = logging.getLogger(__name__)


# ── State definition ─────────────────────────────────────────────────────────

class OrchestratorState(TypedDict):
    """State carried through the LangGraph graph."""
    # Input (set once at graph entry)
    messages: list[ChatMessage]
    agents: list[AgentProfile]
    classroom_context: ClassroomContext
    max_turns: int
    provider_chain: list[LLMProvider]  # injected; not serialised
    discussion_context: dict[str, str] | None
    trigger_agent_id: str | None
    user_profile: dict[str, str | None] | None

    # Mutable (updated per node)
    current_agent_id: str | None
    turn_count: int
    agent_responses: list[AgentTurnSummary]
    whiteboard_ledger: list[WhiteboardActionRecord]
    should_end: bool
    total_actions: int

    # Event queue — nodes push ChatEvent objects here
    _event_queue: asyncio.Queue[ChatEvent | None]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_agent(state: OrchestratorState, agent_id: str) -> AgentProfile | None:
    for a in state["agents"]:
        if a.id == agent_id:
            return a
    return None


def _push(state: OrchestratorState, event: ChatEvent) -> None:
    try:
        state["_event_queue"].put_nowait(event)
    except asyncio.QueueFull:
        log.warning("[Graph] Event queue full, dropping event: %s", event)


# ── JSON array parser (ported from stateless-generate.ts) ────────────────────

def _parse_agent_output(text: str) -> list[dict[str, Any]]:
    """Parse the agent's structured JSON array output.

    The LLM is expected to produce:
    [{"type":"action","name":"...","params":{...}},
     {"type":"text","content":"natural speech"},...]

    Falls back to a single text item if parsing fails.
    """
    if not text:
        return []

    # Find the opening `[`
    bracket_idx = text.find("[")
    if bracket_idx == -1:
        return [{"type": "text", "content": text.strip()}]

    json_str = text[bracket_idx:]

    # Try standard JSON parse first
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try partial-json fallback
    try:
        from partial_json_parser import loads as partial_loads, Allow
        parsed = partial_loads(
            json_str,
            Allow.ARR | Allow.OBJ | Allow.STR | Allow.NUM | Allow.BOOL | Allow.NULL,
        )
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass

    # Last resort: return raw text
    raw = json_str.lstrip("[").strip().rstrip("]").strip()
    if raw:
        return [{"type": "text", "content": raw}]
    return []


# ── Director node ────────────────────────────────────────────────────────────

async def _director_node(state: OrchestratorState) -> dict[str, Any]:
    """Decide which agent speaks next (or end the round)."""
    agents = state["agents"]
    is_single = len(agents) <= 1

    # Turn limit
    if state["turn_count"] >= state["max_turns"]:
        log.info("[Director] Turn limit (%d/%d), ending", state["turn_count"], state["max_turns"])
        return {"should_end": True}

    # Guard: no agents at all → cannot dispatch anyone; end immediately to avoid
    # a loop where director repeatedly picks a nonexistent fallback ID.
    if not agents:
        log.warning("[Director] No agents in request, ending")
        return {"should_end": True}

    # Single agent: pure code logic
    if is_single:
        agent_id = agents[0].id
        if state["turn_count"] == 0:
            log.info("[Director] Single agent: dispatching %s", agent_id)
            _push(state, ThinkingEvent(stage="agent_loading", agent_id=agent_id))
            return {"current_agent_id": agent_id, "should_end": False}
        log.info("[Director] Single agent: cueing user after %s", agent_id)
        _push(state, CueUserEvent(from_agent_id=agent_id))
        return {"should_end": True}

    # Multi-agent: fast-path for first turn with trigger
    if state["turn_count"] == 0 and state.get("trigger_agent_id"):
        trigger_id = state["trigger_agent_id"]
        if any(a.id == trigger_id for a in agents):
            log.info("[Director] First turn: dispatching trigger %s", trigger_id)
            _push(state, ThinkingEvent(stage="agent_loading", agent_id=trigger_id))
            return {"current_agent_id": trigger_id, "should_end": False}
        log.warning("[Director] Trigger %s not found, falling through to LLM", trigger_id)

    # Multi-agent: LLM-based decision
    if not agents:
        return {"should_end": True}

    _push(state, ThinkingEvent(stage="director"))

    openai_msgs = convert_messages_to_openai(state["messages"])
    conv_summary = summarize_conversation(openai_msgs)

    system_prompt = build_director_prompt(
        agents=agents,
        conversation_summary=conv_summary,
        agent_responses=state["agent_responses"],
        turn_count=state["turn_count"],
        discussion_context=state.get("discussion_context"),
        trigger_agent_id=state.get("trigger_agent_id"),
        whiteboard_ledger=state.get("whiteboard_ledger", []),
        user_profile=state.get("user_profile"),
        whiteboard_open=state["classroom_context"].whiteboard_open,
    )

    try:
        content = await call_llm(
            system=system_prompt,
            user="请决定接下来由哪个智能体发言。",
            provider_chain=state["provider_chain"],
        )
        log.info("[Director] Raw decision: %s", content[:200])

        decision = parse_director_decision(content)

        if decision["should_end"] or not decision["next_agent_id"]:
            log.info("[Director] Decision: END")
            return {"should_end": True}

        next_id = str(decision["next_agent_id"])

        if next_id == "USER":
            log.info("[Director] Decision: cue USER")
            _push(state, CueUserEvent(from_agent_id=state.get("current_agent_id")))
            return {"should_end": True}

        if not any(a.id == next_id for a in agents):
            log.warning("[Director] Unknown agent %s, ending", next_id)
            return {"should_end": True}

        _push(state, ThinkingEvent(stage="agent_loading", agent_id=next_id))
        log.info("[Director] Decision: dispatch %s", next_id)
        return {"current_agent_id": next_id, "should_end": False}

    except Exception as exc:  # noqa: BLE001
        log.error("[Director] Error: %s", exc)
        return {"should_end": True}


def _director_edge(state: OrchestratorState) -> str:
    return END if state["should_end"] else "agent_generate"


# ── Agent generate node ──────────────────────────────────────────────────────

async def _agent_generate_node(state: OrchestratorState) -> dict[str, Any]:
    """Run one agent turn: stream its response and emit events."""
    agent_id = state.get("current_agent_id")
    if not agent_id:
        return {"should_end": True}

    agent = _resolve_agent(state, agent_id)
    if not agent:
        log.error("[AgentGenerate] Agent not found: %s", agent_id)
        return {"should_end": True}

    message_id = f"assistant-{agent_id}-{int(time.time() * 1000)}"

    _push(state, AgentSwitchEvent(
        agent_id=agent_id,
        agent_name=agent.name,
        agent_avatar=agent.avatar,
        agent_color=agent.color,
        message_id=message_id,
    ))

    system_prompt = build_structured_prompt(
        agent=agent,
        classroom_ctx=state["classroom_context"],
        discussion_context=state.get("discussion_context"),
        whiteboard_ledger=state.get("whiteboard_ledger"),
        user_profile=state.get("user_profile"),
        agent_responses=state.get("agent_responses"),
    )

    openai_msgs = convert_messages_to_openai(state["messages"], agent_id)

    # Build the user portion (conversation history condensed)
    history_str = "\n".join(
        f"[{m['role'].upper()}] {m['content']}"
        for m in openai_msgs[-6:]  # last 6 messages for context
        if m["content"]
    )
    user_content = history_str or "请开始发言。"

    full_text = ""
    action_count = 0
    wb_actions: list[WhiteboardActionRecord] = []

    try:
        # Stream the agent response chunk by chunk
        async for chunk in stream_llm(system_prompt, user_content, state["provider_chain"]):
            full_text += chunk

        # Parse the complete structured output
        items = _parse_agent_output(full_text)
        from .tool_schemas import get_effective_actions

        scene_type = state["classroom_context"].current_scene_type
        effective_actions = get_effective_actions(agent.allowed_actions, scene_type)

        for item in items:
            if not isinstance(item, dict):
                continue

            if item.get("type") == "text":
                text_content = str(item.get("content", "")).replace("\n>", "\n").strip()
                # Strip blockquote markers
                text_content = re.sub(r"^>+\s?", "", text_content, flags=re.MULTILINE)
                if text_content:
                    _push(state, TextDeltaEvent(content=text_content, message_id=message_id))

            elif item.get("type") == "action":
                action_name = str(item.get("name") or item.get("tool_name", ""))
                if not action_name:
                    continue
                if action_name not in effective_actions:
                    log.warning("[AgentGenerate] Disallowed action %s by %s, skipping",
                                action_name, agent.name)
                    continue

                action_id = str(
                    item.get("action_id")
                    or f"action-{int(time.time() * 1000)}-{action_count}"
                )
                params = dict(item.get("params") or item.get("parameters") or {})
                action_count += 1

                if action_name.startswith("wb_"):
                    wb_actions.append(WhiteboardActionRecord(
                        action_name=action_name,
                        agent_id=agent_id,
                        agent_name=agent.name,
                        params=params,
                    ))

                _push(state, ToolCallEvent(
                    action_id=action_id,
                    name=action_name,
                    args=params,
                    agent_id=agent_id,
                    message_id=message_id,
                ))

    except Exception as exc:  # noqa: BLE001
        log.error("[AgentGenerate] Error for %s: %s", agent.name, exc)
        _push(state, ErrorEvent(message=str(exc)))

    _push(state, AgentTurnEndEvent(message_id=message_id, agent_id=agent_id))

    content_preview = full_text[:300] if full_text else ""
    new_response = AgentTurnSummary(
        agent_id=agent_id,
        agent_name=agent.name,
        content_preview=content_preview,
        action_count=action_count,
        whiteboard_actions=wb_actions,
    )

    return {
        "turn_count": state["turn_count"] + 1,
        "total_actions": state["total_actions"] + action_count,
        "agent_responses": state["agent_responses"] + [new_response],
        "whiteboard_ledger": state["whiteboard_ledger"] + wb_actions,
        "current_agent_id": None,
    }


# ── Graph construction ───────────────────────────────────────────────────────

def _build_graph() -> Any:
    """Build and compile the LangGraph StateGraph."""
    graph: StateGraph = StateGraph(OrchestratorState)
    graph.add_node("director", _director_node)
    graph.add_node("agent_generate", _agent_generate_node)
    graph.add_edge(START, "director")
    graph.add_conditional_edges("director", _director_edge, {
        "agent_generate": "agent_generate",
        END: END,
    })
    graph.add_edge("agent_generate", "director")
    return graph.compile()


class DirectorGraph:
    """Compiled orchestration graph (singleton per request — stateless)."""

    def __init__(self) -> None:
        self._graph = _build_graph()

    async def run(
        self,
        request: DiscussionRequest,
        provider_chain: Sequence[LLMProvider],
    ) -> AsyncIterator[ChatEvent]:
        """Execute the director graph and stream ChatEvent objects.

        This is an async generator: yields events as each node runs.
        """
        queue: asyncio.Queue[ChatEvent | None] = asyncio.Queue(maxsize=1000)

        # Build incoming director state
        incoming = request.director_state or DirectorState()
        prev_turn_count = incoming.turn_count

        discussion_context: dict[str, str] | None = None
        if request.discussion_topic:
            discussion_context = {"topic": request.discussion_topic}
            if request.discussion_prompt:
                discussion_context["prompt"] = request.discussion_prompt

        user_profile: dict[str, str | None] | None = None
        if request.user_profile:
            user_profile = {
                "nickname": request.user_profile.nickname,
                "bio": request.user_profile.bio,
            }

        initial_state: OrchestratorState = {
            "messages": request.messages,
            "agents": request.agents,
            "classroom_context": request.classroom_context,
            "max_turns": prev_turn_count + 1,  # one director→agent cycle per call
            "provider_chain": list(provider_chain),
            "discussion_context": discussion_context,
            "trigger_agent_id": request.trigger_agent_id,
            "user_profile": user_profile,
            "current_agent_id": None,
            "turn_count": prev_turn_count,
            "agent_responses": list(incoming.agent_responses),
            "whiteboard_ledger": list(incoming.whiteboard_ledger),
            "should_end": False,
            "total_actions": 0,
            "_event_queue": queue,
        }

        total_agents = 0
        total_actions = 0
        final_responses: list[AgentTurnSummary] = list(incoming.agent_responses)
        final_ledger: list[WhiteboardActionRecord] = list(incoming.whiteboard_ledger)

        async def _run_graph() -> None:
            """Execute the graph in a background task."""
            try:
                # Each loop "director → agent_generate → director" counts as 2 nodes,
                # so recursion_limit must cover max_turns * 2 + epsilon.
                turn_budget = max(initial_state.get("max_turns", 6), 1)
                recursion_limit = turn_budget * 2 + 4
                final_state = await self._graph.ainvoke(
                    initial_state,
                    config={"recursion_limit": recursion_limit},
                )
                # Extract final state counts
                nonlocal total_actions, final_responses, final_ledger
                total_actions = final_state.get("total_actions", 0)
                final_responses = final_state.get("agent_responses", final_responses)
                final_ledger = final_state.get("whiteboard_ledger", final_ledger)
            except Exception as exc:  # noqa: BLE001
                log.error("[DirectorGraph] Graph execution error: %s", exc)
                queue.put_nowait(ErrorEvent(message=str(exc)))
            finally:
                queue.put_nowait(None)  # sentinel

        task = asyncio.create_task(_run_graph())

        # Drain events from the queue
        while True:
            event = await queue.get()
            if event is None:
                break
            if isinstance(event, AgentSwitchEvent):
                total_agents += 1
            yield event

        await task  # ensure any exceptions are propagated

        # Build updated director state
        new_turn_count = prev_turn_count + (1 if total_agents > 0 else 0)
        updated_director_state = DirectorState(
            turn_count=new_turn_count,
            agent_responses=final_responses,
            whiteboard_ledger=final_ledger,
        )

        yield EndEvent(
            total_actions=total_actions,
            total_agents=total_agents,
            director_state=updated_director_state,
        )
