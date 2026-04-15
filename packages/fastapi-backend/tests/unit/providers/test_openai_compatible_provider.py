"""Tests for OpenAI SDK-based OpenAICompatibleLLMProvider (legacy test file, updated for SDK)."""
from __future__ import annotations

import asyncio
from types import MappingProxyType
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.providers.llm.openai_compatible_provider import OpenAICompatibleLLMProvider
from app.providers.protocols import ProviderRuntimeConfig


def _config(**overrides):
    settings = {
        "base_url": "https://synai996.space/",
        "api_key": "sk-test",
        "model_name": "gemini-3.1-pro-high",
    }
    settings.update(overrides)
    return ProviderRuntimeConfig(
        provider_id="openai-compatible",
        timeout_seconds=30.0,
        settings=MappingProxyType(settings),
    )


def _mock_response(content: str, model: str = "gemini-3.1-pro-high", **usage_kw):
    mock_resp = MagicMock()
    mock_resp.model = model
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = content
    mock_resp.choices[0].finish_reason = "stop"
    mock_resp.usage = MagicMock(
        prompt_tokens=usage_kw.get("prompt_tokens", 10),
        completion_tokens=usage_kw.get("completion_tokens", 12),
        total_tokens=usage_kw.get("total_tokens", 22),
    )
    return mock_resp


def test_openai_compatible_provider_generates_content_from_chat_completions() -> None:
    provider = OpenAICompatibleLLMProvider(_config())

    mock_resp = _mock_response('{"topicSummary":"勾股定理"}')

    with patch.object(provider, "_client", create=True) as mock_client:
        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

        result = asyncio.run(provider.generate("请总结题目"))

    assert result.provider == "openai-compatible"
    assert "topicSummary" in result.content
    assert result.metadata["model"] == "gemini-3.1-pro-high"


def test_openai_compatible_provider_maps_authentication_error_to_value_error() -> None:
    from openai import AuthenticationError
    import httpx

    provider = OpenAICompatibleLLMProvider(_config(api_key="sk-invalid"))

    mock_request = httpx.Request("POST", "https://synai996.space/v1/chat/completions")
    mock_http_resp = httpx.Response(
        401,
        json={"error": {"message": "invalid api key"}},
        request=mock_request,
    )

    with patch.object(provider, "_client", create=True) as mock_client:
        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=AuthenticationError(
                message="invalid api key",
                response=mock_http_resp,
                body=None,
            )
        )

        with pytest.raises(ValueError, match="authentication failed"):
            asyncio.run(provider.generate("请总结题目"))


def test_openai_compatible_provider_reuses_async_client_for_same_instance() -> None:
    provider = OpenAICompatibleLLMProvider(_config())

    mock_resp = _mock_response("ok")

    with patch.object(provider, "_client", create=True) as mock_client:
        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

        async def run_case() -> None:
            await provider.generate("第一次")
            cached_client = provider._client
            await provider.generate("第二次")
            assert provider._client is cached_client

        asyncio.run(run_case())
