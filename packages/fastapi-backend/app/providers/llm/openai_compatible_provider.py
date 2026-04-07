from __future__ import annotations

import json
from typing import Any, Mapping

import httpx

from app.providers.protocols import ProviderConfigurationError, ProviderResult, ProviderRuntimeConfig


def _extract_message_content(message: Any) -> str:
    if isinstance(message, str):
        return message
    if isinstance(message, list):
        chunks: list[str] = []
        for item in message:
            if isinstance(item, str):
                chunks.append(item)
                continue
            if isinstance(item, Mapping):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    chunks.append(text)
        return "\n".join(chunk for chunk in chunks if chunk).strip()
    if isinstance(message, Mapping):
        content = message.get("content")
        if isinstance(content, str):
            return content
        return _extract_message_content(content)
    return ""


class OpenAICompatibleLLMProvider:
    """对接 OpenAI compatible chat completions 的 LLM Provider。"""

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

        self._base_url = self._require_setting("base_url")
        self._api_key = self._require_setting("api_key")
        self._model_name = self._require_setting("model_name")
        self._request_path = str(config.settings.get("request_path", "/v1/chat/completions"))
        self._temperature = float(config.settings.get("temperature", 0.2))
        self._transport = config.settings.get("transport")
        extra_headers = config.settings.get("headers", {})
        extra_body = config.settings.get("extra_body", {})

        self._headers = {"Authorization": f"Bearer {self._api_key}"}
        if isinstance(extra_headers, Mapping):
            self._headers.update({str(key): str(value) for key, value in extra_headers.items()})
        self._extra_body = dict(extra_body) if isinstance(extra_body, Mapping) else {}

    async def generate(self, prompt: str) -> ProviderResult:
        payload = {
            "model": self._model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._temperature,
            **self._extra_body,
        }

        try:
            async with httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self.config.timeout_seconds,
                headers=self._headers,
                transport=self._transport,
            ) as client:
                response = await client.post(self._request_path, json=payload)
        except httpx.TimeoutException as exc:
            raise TimeoutError(f"{self.provider_id} request timed out") from exc
        except httpx.RequestError as exc:
            raise ConnectionError(f"{self.provider_id} request failed: {exc}") from exc

        if response.status_code in {401, 403}:
            raise ValueError(f"authentication failed: {response.text[:200]}")
        if response.status_code == 429 or response.status_code >= 500:
            raise ConnectionError(f"{self.provider_id} upstream status={response.status_code}: {response.text[:200]}")
        if response.status_code >= 400:
            raise ValueError(f"{self.provider_id} bad request status={response.status_code}: {response.text[:200]}")

        try:
            payload = response.json()
        except json.JSONDecodeError as exc:
            raise ValueError(f"{self.provider_id} returned invalid json") from exc

        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ValueError(f"{self.provider_id} response missing choices")

        first_choice = choices[0] if isinstance(choices[0], Mapping) else {}
        message = first_choice.get("message", {})
        content = _extract_message_content(message)
        if not content:
            raise ValueError(f"{self.provider_id} response missing assistant content")

        return ProviderResult(
            provider=self.provider_id,
            content=content,
            metadata={
                "model": payload.get("model", self._model_name),
                "finishReason": first_choice.get("finish_reason"),
                "usage": payload.get("usage"),
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source,
            },
        )

    def _require_setting(self, key: str) -> str:
        value = self.config.settings.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ProviderConfigurationError(f"{self.provider_id} 缺少配置项：{key}")
        return value.strip()
