"""Tests for openmaic llm_adapter — stub provider calls."""

from __future__ import annotations

import pytest

from app.features.openmaic.llm_adapter import LLMCallParams, call_llm, stream_llm
from app.providers.protocols import ProviderError, ProviderResult, ProviderRuntimeConfig
from app.providers.llm.stub_provider import StubLLMProvider


def _make_stub() -> StubLLMProvider:
    config = ProviderRuntimeConfig(
        provider_id="stub-llm",
        priority=100,
        timeout_seconds=5.0,
        retry_attempts=0,
        health_source="unconfigured",
        settings={},
    )
    return StubLLMProvider(config=config)


@pytest.mark.asyncio
async def test_call_llm_returns_content():
    stub = _make_stub()
    params = LLMCallParams(system="System prompt", prompt="Hello")
    result = await call_llm(params, [stub])
    assert "Hello" in result


@pytest.mark.asyncio
async def test_call_llm_failover_to_second_provider():
    """First provider raises ProviderError → second provider used."""

    class FailingProvider:
        provider_id = "fail-provider"

        async def generate(self, _prompt: str) -> ProviderResult:
            raise ProviderError("simulated failure")

    stub = _make_stub()
    params = LLMCallParams(system="", prompt="test")
    result = await call_llm(params, [FailingProvider(), stub])
    assert result  # stub returns something


@pytest.mark.asyncio
async def test_call_llm_raises_when_all_fail():
    class FailingProvider:
        provider_id = "fail-provider"

        async def generate(self, _prompt: str) -> ProviderResult:
            raise ProviderError("simulated failure")

    params = LLMCallParams(system="", prompt="test")
    with pytest.raises(ProviderError):
        await call_llm(params, [FailingProvider()])


@pytest.mark.asyncio
async def test_call_llm_empty_chain_raises():
    params = LLMCallParams(system="", prompt="test")
    with pytest.raises(Exception):
        await call_llm(params, [])


@pytest.mark.asyncio
async def test_stream_llm_yields_text():
    stub = _make_stub()
    params = LLMCallParams(system="", prompt="stream test")
    chunks = []
    async for chunk in stream_llm(params, [stub]):
        chunks.append(chunk)
    assert len(chunks) >= 1
    assert "stream test" in "".join(chunks)
