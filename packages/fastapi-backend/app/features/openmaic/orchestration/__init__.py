"""OpenMAIC orchestration package.

Team C owns director_graph.py — this stub exists so Team A's routes.py
can wire the /chat endpoint without waiting for Team C's branch.

TODO: replaced on merge from Team C branch (feature/openmaic-orchestration).
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

logger = logging.getLogger(__name__)


async def run_discussion(
    messages: list[dict],
    agents: list[dict],
    classroom_context: str = "",
    language_directive: str = "",
) -> AsyncIterator[str]:
    """Stub: multi-agent discussion SSE stream.

    Team C's real director_graph replaces this on merge.
    """
    logger.warning("openmaic.orchestration: running Team C stub — real impl not merged yet")
    # Yield a minimal but valid SSE-formatted JSON response
    yield (
        '{"type":"message","agentId":"agent_teacher",'
        '"content":"[Team C orchestration not yet merged — using stub response. '
        "The real multi-agent director graph will be implemented by Team C.]"
        '"}'
    )
