"""OpenMAIC LLM adapter — thin wrapper over our LLMProvider protocol.

Provides callLLM / streamLLM semantics similar to OpenMAIC's lib/ai/llm.ts,
routing through our existing provider chain without any direct SDK calls.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Sequence

from app.core.config import get_settings
from app.providers.factory import get_provider_factory
from app.providers.protocols import LLMProvider, ProviderError
from app.providers.runtime_config_service import ProviderRuntimeResolver

logger = logging.getLogger(__name__)

# Stage codes must match xm_ai_module rows seeded for openmaic
OPENMAIC_STAGE_CODES = {
    "outline",
    "scene_content",
    "scene_actions",
    "agent_profiles",
    "director",
    "quiz_grade",
}


@dataclass
class LLMCallParams:
    """Mirrors OpenMAIC's callLLM params interface."""

    system: str
    prompt: str
    temperature: float | None = None
    max_tokens: int | None = None


async def call_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> str:
    """One-shot generation with failover through provider chain.

    Raises ProviderError if all providers fail.
    """
    combined = f"{params.system}\n\n---\n\n{params.prompt}" if params.system else params.prompt
    last_error: Exception | None = None

    for provider in provider_chain:
        try:
            result = await provider.generate(combined)
            return result.content
        except ProviderError as exc:
            logger.warning(
                "openmaic.llm_adapter.provider_failed",
                extra={
                    "provider_id": getattr(provider, "provider_id", "unknown"),
                    "error": str(exc),
                },
            )
            last_error = exc
            continue
        except Exception as exc:  # noqa: BLE001 – unexpected provider errors must not bubble
            logger.error(
                "openmaic.llm_adapter.unexpected_error",
                extra={
                    "provider_id": getattr(provider, "provider_id", "unknown"),
                    "error": str(exc),
                },
            )
            last_error = exc
            continue

    raise last_error or ProviderError("No LLM providers configured for OpenMAIC")


async def stream_llm(
    params: LLMCallParams,
    provider_chain: Sequence[LLMProvider],
) -> AsyncIterator[str]:
    """Streaming generation — P0: emits full result as a single chunk.

    P1 upgrade: check if provider exposes true streaming and wire real SSE.
    """
    text = await call_llm(params, provider_chain)
    yield text


async def resolve_openmaic_providers(
    stage_code: str,
    access_token: str | None = None,
    client_id: str | None = None,
) -> tuple[LLMProvider, ...]:
    """Resolve provider chain for a given OpenMAIC stage from DB bindings.

    Reads `xm_ai_module_binding` for module_code='openmaic' filtered by stage_code.
    When a request-side access_token is available, the resolver hits RuoYi
    internal AI runtime for DB-backed bindings; otherwise falls back to
    settings defaults (`FASTAPI_DEFAULT_LLM_PROVIDER`).
    """
    if stage_code not in OPENMAIC_STAGE_CODES:
        raise ValueError(f"Unknown OpenMAIC stage code: {stage_code!r}")

    try:
        resolver = ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=get_provider_factory(),
        )
        assembly = await resolver.resolve_by_module_code(
            module_code="openmaic",
            stage_code=stage_code,
            access_token=access_token,
            client_id=client_id,
        )
        chain = assembly.llm
        if chain:
            logger.info(
                "openmaic.llm_adapter.chain_resolved stage=%s source=%s length=%d",
                stage_code, assembly.source, len(chain),
            )
            return chain
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "openmaic.llm_adapter.resolver_failed stage=%s error=%s",
            stage_code, exc,
        )

    # Fallback: settings default (e.g. stub-llm in dev)
    factory = get_provider_factory()
    try:
        default_provider = factory.get_llm_provider(get_settings().default_llm_provider)
        logger.warning(
            "openmaic.llm_adapter.falling_back_to_default_provider stage=%s provider=%s",
            stage_code, get_settings().default_llm_provider,
        )
        return (default_provider,)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "openmaic.llm_adapter.default_provider_failed error=%s", exc,
        )
        return ()
