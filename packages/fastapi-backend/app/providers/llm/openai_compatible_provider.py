"""OpenAI Compatible LLM Provider — now uses official OpenAI Python SDK."""
from __future__ import annotations

import logging
from typing import Any, Mapping

from openai import AsyncOpenAI

from app.providers.http_utils import handle_openai_request_error, require_setting
from app.providers.llm.openai_client_factory import _normalize_base_url, create_async_client
from app.providers.protocols import ProviderConfigurationError, ProviderResult, ProviderRuntimeConfig

logger = logging.getLogger("app.providers.llm.openai_compatible_provider")


class OpenAICompatibleLLMProvider:
    """对接 OpenAI compatible chat completions 的 LLM Provider（SDK 版本）。"""

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

        self._base_url = require_setting(config, "base_url")
        self._api_key = require_setting(config, "api_key")
        if not self._api_key.isascii():
            raise ProviderConfigurationError(
                f"{config.provider_id} api_key 包含非 ASCII 字符，请检查后台 Provider 配置"
            )
        self._model_name = require_setting(config, "model_name")
        self._temperature = float(config.settings.get("temperature", 0.2))
        extra_headers = config.settings.get("headers", {})
        extra_body = config.settings.get("extra_body", {})

        self._extra_body = dict(extra_body) if isinstance(extra_body, Mapping) else {}
        request_path = config.settings.get("request_path", "/v1/chat/completions")
        normalized_url = _normalize_base_url(self._base_url, request_path)
        self._client = create_async_client(
            base_url=normalized_url,
            api_key=self._api_key,
            timeout=max(config.timeout_seconds, 600.0),
            extra_headers=dict(extra_headers) if isinstance(extra_headers, Mapping) else None,
        )

    async def generate(self, prompt: str) -> ProviderResult:
        """调用 OpenAI compatible API 生成文本（via SDK）。"""
        messages = [{"role": "user", "content": prompt}]
        return await self._chat(messages)

    async def generate_vision(
        self,
        prompt: str,
        *,
        image_base64: str,
        image_media_type: str = "image/jpeg",
    ) -> ProviderResult:
        """调用 OpenAI compatible API 进行多模态生成（图像 + 文本）。"""
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{image_media_type};base64,{image_base64}",
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ]
        return await self._chat(messages)

    async def _chat(self, messages: list[dict[str, object]]) -> ProviderResult:
        """通用 chat completions 调用。"""
        payload = {
            "temperature": self._temperature,
            **self._extra_body,
        }

        prompt_len = sum(
            len(str(m.get("content", ""))) for m in messages
        )
        logger.info(
            "LLM request  provider=%s  base_url=%s  model=%s  prompt_len=%d",
            self.provider_id, self._base_url[:50], self._model_name, prompt_len,
        )

        try:
            response = await self._client.chat.completions.create(
                model=self._model_name,
                messages=messages,
                **payload,
            )
        except Exception as exc:
            handle_openai_request_error(self.provider_id, exc)

        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise ValueError(f"{self.provider_id} response missing assistant content")

        return ProviderResult(
            provider=self.provider_id,
            content=content,
            metadata={
                "model": getattr(response, "model", self._model_name),
                "finishReason": response.choices[0].finish_reason if response.choices else None,
                "usage": {
                    "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                    "total_tokens": getattr(response.usage, "total_tokens", 0),
                } if response.usage else None,
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source,
            },
        )
