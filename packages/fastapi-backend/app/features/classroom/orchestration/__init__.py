"""
OpenMAIC orchestration — public API.

Team A imports:
    from app.features.classroom.orchestration import run_discussion
    from app.features.classroom.orchestration import DirectorGraph

Integration contract:
    async def run_discussion(
        request: DiscussionRequest,
        provider_chain: Sequence[LLMProvider],
    ) -> AsyncIterator[ChatEvent]: ...
"""
from __future__ import annotations

from typing import AsyncIterator, Sequence

from app.providers.protocols import LLMProvider

from .director_graph import DirectorGraph
from .schemas import (
    ChatEvent,
    DiscussionRequest,
    # Re-export types Team A needs
    AgentProfile,
    ChatMessage,
    ClassroomContext,
    DirectorState,
    UserProfile,
    MessagePart,
    MessageMetadata,
)

__all__ = [
    "run_discussion",
    "DirectorGraph",
    "ChatEvent",
    "DiscussionRequest",
    "AgentProfile",
    "ChatMessage",
    "ClassroomContext",
    "DirectorState",
    "UserProfile",
    "MessagePart",
    "MessageMetadata",
]


async def run_discussion(
    request: DiscussionRequest,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[ChatEvent]:
    """Main entry point for the /chat endpoint.

    Creates a fresh DirectorGraph per request (stateless design — all state
    is carried in the request body).

    Args:
        request: Full DiscussionRequest including message history, agent profiles,
                 classroom context, and optional director state from prior turns.
        provider_chain: Ordered list of LLMProvider instances to use (with failover).

    Yields:
        ChatEvent stream: agent_switch → text_delta* → tool_call* → agent_turn_end → end
    """
    graph = DirectorGraph()
    async for event in graph.run(request, provider_chain):
        yield event
