# Team C — Orchestration Port Report

**Branch:** `feature/openmaic-orchestration`
**Commit:** `2ea1a4d`
**Date:** 2026-04-23
**Status:** COMPLETE — 22/22 tests green

---

## Files Created (LOC)

| File | LOC | Description |
|------|-----|-------------|
| `orchestration/__init__.py` | 68 | Public API: `run_discussion()`, `DirectorGraph`, re-exports |
| `orchestration/schemas.py` | 182 | Pydantic types: `ChatEvent`, `DiscussionRequest`, `AgentProfile`, `DirectorState`, all event types |
| `orchestration/tool_schemas.py` | 105 | Agent action descriptions (Chinese) + `get_effective_actions()` + `get_action_descriptions()` |
| `orchestration/summarizers.py` | 223 | `summarize_conversation`, `convert_messages_to_openai`, `build_peer_context_section`, `build_state_context`, `build_virtual_whiteboard_context` |
| `orchestration/director_prompt.py` | 215 | Chinese director system prompt builder + `parse_director_decision()` |
| `orchestration/prompt_builder.py` | 261 | Per-agent system prompt builder with role guidelines (teacher/assistant/student) |
| `orchestration/ai_sdk_adapter.py` | 97 | `LLMProvider` failover bridge: `call_llm()`, `stream_llm()` |
| `orchestration/director_graph.py` | 475 | LangGraph `StateGraph`: director node + agent_generate node + `DirectorGraph` class |
| `orchestration/tests/__init__.py` | 1 | Package init |
| `orchestration/tests/test_director_graph.py` | ~430 | 22 tests covering all critical paths |
| **Total** | **~2057** | |

---

## What Works

### Graph Runs End-to-End
- `run_discussion(request, provider_chain)` → `AsyncIterator[ChatEvent]`
- Single agent: dispatches agent on turn 0, cues user on subsequent turns
- Multi-agent: LLM director picks next agent, with code fast-path for turn 0 + trigger agent
- Turn limit enforced (via `max_turns = prev_turn_count + 1` per call)
- Events emitted in correct order: `thinking` → `agent_switch` → `text_delta`* → `tool_call`* → `agent_turn_end` → `end`

### Tool Calls Parsed
- Agent LLM output is parsed as JSON array: `[{"type":"action","name":"...","params":{...}}, {"type":"text","content":"..."}]`
- Disallowed actions (not in `agent.allowed_actions`) are filtered before emission
- Slide-only actions (`spotlight`, `laser`) stripped for non-slide scene types
- `wb_*` actions recorded to whiteboard ledger for director context

### Provider Failover
- `ai_sdk_adapter.py` iterates `provider_chain` in order
- On `ProviderError` or unexpected exception, tries next provider
- Only raises if all providers fail

### Chinese Director Prompt
- System prompt is Chinese-first with clear JSON output format requirement
- `parse_director_decision()` extracts `{"next_agent": "..."}` from anywhere in LLM response
- Handles: valid agent ID, `END`, `USER`, embedded JSON, and malformed output (defaults to END)

### Whiteboard Ledger Tracking
- All `wb_*` actions accumulated in `whiteboard_ledger` on the state
- Summarized for director context (element count, contributors, crowded warning at >5 elements)
- Passed to subsequent agent prompts as "Current Whiteboard State"

---

## What's Stubbed / Deferred

### Simulated Streaming (not real token streaming)
`stream_llm()` in `ai_sdk_adapter.py` calls `provider.generate()` (full completion) then splits the result into 3 chunks. Real token streaming requires provider protocol extension (P1 work).

### No LangGraph Custom Stream Mode
The JS version uses LangGraph's `streamMode: 'custom'` with `config.writer()` to push events mid-node. The Python port uses an `asyncio.Queue` as the event bus instead — semantically equivalent but implemented without `streamMode: 'custom'` (the Python LangGraph API surface differs). Events are emitted from node functions via `_push(state, event)` which enqueues them, then drained by `DirectorGraph.run()`.

### Summarizers Deferred
The `summarizers.py` module ports all context-building functions. The original JS has LLM-based summarization for very long histories; the Python port uses rule-based truncation (`summarize_conversation` takes last N messages). LLM-based compaction can be added at the `run_discussion()` level when history > threshold.

### No Agent Registry
The JS version has a global agent registry store (Zustand). Python version resolves agents purely from `request.agents` — all agent configs travel with the request (stateless, no server-side registry). This is architecturally simpler and fine for P0.

### `play_video` Action
Defined in tool schemas but rarely used. Client-side only — the server just emits the `tool_call` event; frontend handles playback.

---

## Integration Contract for Team A

### Import
```python
from app.features.openmaic.orchestration import run_discussion, DirectorGraph
from app.features.openmaic.orchestration import (
    DiscussionRequest, ChatEvent, AgentProfile, ChatMessage,
    ClassroomContext, DirectorState, UserProfile, MessagePart, MessageMetadata,
)
```

### Signature
```python
async def run_discussion(
    request: DiscussionRequest,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[ChatEvent]: ...
```

### DiscussionRequest fields
```python
class DiscussionRequest(BaseModel):
    messages: list[ChatMessage]
    agents: list[AgentProfile]
    classroom_context: ClassroomContext = ClassroomContext()
    max_turns: int = 10
    trigger_agent_id: str | None = None
    discussion_topic: str | None = None
    discussion_prompt: str | None = None
    director_state: DirectorState | None = None  # from prior turn
    user_profile: UserProfile | None = None
```

### ChatEvent types (discriminated by `.type`)
```
"thinking"      → ThinkingEvent(stage: str, agent_id: str | None)
"agent_switch"  → AgentSwitchEvent(agent_id, agent_name, message_id, ...)
"text_delta"    → TextDeltaEvent(content: str, message_id: str)
"tool_call"     → ToolCallEvent(action_id, name, args, agent_id, message_id)
"agent_turn_end"→ AgentTurnEndEvent(message_id, agent_id)
"cue_user"      → CueUserEvent(from_agent_id: str | None)
"error"         → ErrorEvent(message: str)
"end"           → EndEvent(total_actions, total_agents, director_state)
```

### Stateless multi-turn pattern
Each call to `run_discussion()` does exactly one agent turn. To continue the discussion:
1. Extract `end_event.director_state` from the last `EndEvent`
2. Pass it as `request.director_state` in the next request

### SSE rendering
```python
# In the FastAPI /chat route (Team A):
async def chat_endpoint(body: DiscussionRequest, ...):
    provider_chain = [...]  # from factory
    async def event_generator():
        async for event in run_discussion(body, provider_chain):
            yield f"data: {event.model_dump_json()}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### Provider chain
Inject from the standard factory. Suggested module binding: `openmaic.director`.
```python
from app.providers.factory import build_provider_chain
provider_chain = await build_provider_chain("openmaic.director")
```

---

## Test Coverage

| Test | What it covers |
|------|----------------|
| `test_single_agent_smoke` | Full graph run, event stream shape |
| `test_single_agent_text_content` | Text extraction from JSON array |
| `test_multi_agent_trigger_dispatch` | Turn 0 trigger fast-path (no director LLM) |
| `test_director_ends_when_max_turns_exceeded` | Turn limit + cue_user flow |
| `test_tool_call_event_emitted` | spotlight action → ToolCallEvent |
| `test_disallowed_action_filtered` | play_video filtered (not in allowed_actions) |
| `test_provider_failover` | First provider fails → second succeeds |
| `test_parse_director_decision_*` (5 tests) | Valid, END, USER, malformed, embedded JSON |
| `test_summarize_conversation_*` (3 tests) | Empty, truncation, recency window |
| `test_convert_messages_*` (4 tests) | Empty, user, filter, system-ignored |
| `test_build_director_prompt_*` (3 tests) | Basic, discussion mode, crowded whiteboard |

**Result: 22/22 passed in 0.22s**
