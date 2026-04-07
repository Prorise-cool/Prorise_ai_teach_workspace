import asyncio

import httpx
import pytest

from app.providers.llm.openai_compatible_provider import OpenAICompatibleLLMProvider
from app.providers.protocols import ProviderRuntimeConfig


def test_openai_compatible_provider_generates_content_from_chat_completions() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer sk-test"
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl_test",
                "model": "gemini-3.1-pro-high",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "{\"topicSummary\":\"勾股定理\"}"},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {"prompt_tokens": 10, "completion_tokens": 12, "total_tokens": 22},
            },
        )

    provider = OpenAICompatibleLLMProvider(
        ProviderRuntimeConfig(
            provider_id="openai-compatible",
            settings={
                "base_url": "https://synai996.space/",
                "api_key": "sk-test",
                "model_name": "gemini-3.1-pro-high",
                "transport": httpx.MockTransport(handler),
            },
        )
    )

    result = asyncio.run(provider.generate("请总结题目"))

    assert result.provider == "openai-compatible"
    assert "topicSummary" in result.content
    assert result.metadata["model"] == "gemini-3.1-pro-high"


def test_openai_compatible_provider_maps_authentication_error_to_value_error() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "invalid api key"}})

    provider = OpenAICompatibleLLMProvider(
        ProviderRuntimeConfig(
            provider_id="openai-compatible",
            settings={
                "base_url": "https://synai996.space/",
                "api_key": "sk-invalid",
                "model_name": "gemini-3.1-pro-high",
                "transport": httpx.MockTransport(handler),
            },
        )
    )

    with pytest.raises(ValueError, match="authentication failed"):
        asyncio.run(provider.generate("请总结题目"))
