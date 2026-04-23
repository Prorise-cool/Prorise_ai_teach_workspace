"""
AI SDK adapter — bridges our LLMProvider chain to LangGraph nodes.

Ported from references/OpenMAIC/lib/orchestration/ai-sdk-adapter.ts

In the JS version, this adapts Vercel AI SDK to LangChain's BaseChatModel.
In Python, we bridge our `LLMProvider.generate(prompt) -> ProviderResult`
to what LangGraph nodes need.

Key responsibilities:
- Accept an injected provider_chain (list of LLMProvider)
- On each call, try providers in order until one succeeds (failover)
- Provide both one-shot `call` and chunked `stream` interfaces
"""
from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator, Sequence

from app.providers.protocols import LLMProvider, ProviderError

log = logging.getLogger(__name__)

# Number of text chunks to split a full response into (simulated streaming)
_STREAM_CHUNK_COUNT = 3


async def _call_with_failover(
    prompt: str,
    provider_chain: Sequence[LLMProvider],
) -> str:
    """Call LLM with automatic failover across the provider chain.

    Args:
        prompt: The combined system+user prompt string.
        provider_chain: Ordered list of providers to try.

    Returns:
        The generated text content.

    Raises:
        ProviderError: If all providers fail.
    """
    last_error: Exception | None = None

    for provider in provider_chain:
        try:
            result = await provider.generate(prompt)
            log.debug("[Adapter] Provider %s succeeded", provider.provider_id)
            return result.content
        except ProviderError as exc:
            log.warning("[Adapter] Provider %s failed: %s", provider.provider_id, exc)
            last_error = exc
            continue
        except Exception as exc:  # noqa: BLE001
            log.warning("[Adapter] Provider %s unexpected error: %s", provider.provider_id, exc)
            last_error = exc
            continue

    raise last_error or ProviderError("no providers configured")


async def call_llm(
    system: str,
    user: str,
    provider_chain: Sequence[LLMProvider],
) -> str:
    """One-shot LLM call combining system + user prompts.

    Returns the full generated text.
    """
    combined = f"{system}\n\n---\n\n{user}"
    return await _call_with_failover(combined, provider_chain)


async def stream_llm(
    system: str,
    user: str,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[str]:
    """Simulated streaming: fetches full response then yields in chunks.

    P0 implementation: our providers return full completions.
    P1 can add real token streaming if providers expose it.
    """
    full_text = await call_llm(system, user, provider_chain)

    if not full_text:
        return

    # Split into N roughly equal chunks for realistic streaming feel
    chunk_size = max(1, len(full_text) // _STREAM_CHUNK_COUNT)
    for i in range(0, len(full_text), chunk_size):
        yield full_text[i : i + chunk_size]
        # Tiny sleep allows event loop to breathe between chunks
        await asyncio.sleep(0)
