"""Tests for OpenAI SDK-based OpenAICompatibleLLMProvider."""
from __future__ import annotations

from types import MappingProxyType
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.providers.llm.openai_compatible_provider import OpenAICompatibleLLMProvider
from app.providers.protocols import ProviderConfigurationError, ProviderRuntimeConfig


def _config(**overrides):
    settings = {
        "base_url": "https://api.example.com/v1",
        "api_key": "sk-test-key",
        "model_name": "test-model",
    }
    settings.update(overrides)
    return ProviderRuntimeConfig(
        provider_id="test-llm",
        timeout_seconds=30.0,
        settings=MappingProxyType(settings),
    )


class TestInit:
    def test_missing_base_url_raises(self):
        with pytest.raises(ProviderConfigurationError, match="base_url"):
            OpenAICompatibleLLMProvider(_config(base_url=""))

    def test_missing_api_key_raises(self):
        with pytest.raises(ProviderConfigurationError, match="api_key"):
            OpenAICompatibleLLMProvider(_config(api_key=""))

    def test_non_ascii_key_raises(self):
        with pytest.raises(ProviderConfigurationError, match="ASCII"):
            OpenAICompatibleLLMProvider(_config(api_key="sk-测试密钥"))


class TestGenerate:
    @pytest.mark.asyncio
    async def test_success(self):
        provider = OpenAICompatibleLLMProvider(_config())

        mock_response = MagicMock()
        mock_response.model = "test-model"
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hello world"
        mock_response.choices[0].finish_reason = "stop"
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)

        with patch.object(provider, "_client", create=AsyncMock) as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await provider.generate("say hello")

        assert result.content == "Hello world"
        assert result.provider == "test-llm"
        assert result.metadata["model"] == "test-model"

    @pytest.mark.asyncio
    async def test_empty_content_raises(self):
        provider = OpenAICompatibleLLMProvider(_config())

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = ""

        with patch.object(provider, "_client", create=AsyncMock) as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            with pytest.raises(ValueError, match="missing assistant content"):
                await provider.generate("say hello")
