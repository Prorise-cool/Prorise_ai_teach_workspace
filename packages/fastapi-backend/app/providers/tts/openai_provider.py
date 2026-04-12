"""OpenAI 兼容 TTS Provider（支持 Edge TTS 等兼容端点）。"""

from __future__ import annotations

import asyncio
import base64
from typing import Mapping

import httpx

from app.providers.http_utils import raise_for_provider_status, require_setting
from app.providers.protocols import (
    ProviderConfigurationError,
    ProviderResult,
    ProviderRuntimeConfig,
)

_OPENAI_TTS_PATH = "/audio/speech"


class OpenAITTSProvider:
    """OpenAI /v1/audio/speech 兼容 TTS Provider。

    适用于 Edge TTS (travisvn/openai-edge-tts) 等提供 OpenAI 兼容接口的服务。
    """

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

        base_url = require_setting(config, "base_url")
        self._endpoint = base_url.rstrip("/") + _OPENAI_TTS_PATH

        self._api_key = require_setting(config, "api_key")
        if not self._api_key.isascii():
            raise ProviderConfigurationError(
                f"{config.provider_id} api_key 包含非 ASCII 字符"
            )

        self._model = config.settings.get("model_name") or "tts-1"
        self._default_voice = config.settings.get("voice_code") or "alloy"

        self._client: httpx.AsyncClient | None = None
        self._client_lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        async with self._client_lock:
            if self._client is not None:
                return self._client
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.timeout_seconds, connect=10.0),
            )
            return self._client

    async def synthesize(
        self, text: str, voice_config: object | None = None
    ) -> ProviderResult:
        voice = self._resolve_voice(voice_config)

        client = await self._get_client()
        resp = await client.post(
            self._endpoint,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self._model,
                "voice": voice,
                "input": text,
            },
        )
        raise_for_provider_status(self.provider_id, resp)

        content_type = resp.headers.get("content-type", "")
        if "audio" not in content_type:
            raise ConnectionError(
                f"{self.provider_id} returned non-audio response: {content_type}"
            )

        audio_format = "mp3"
        if "ogg" in content_type:
            audio_format = "ogg"
        elif "wav" in content_type:
            audio_format = "wav"

        return ProviderResult(
            provider=self.provider_id,
            content=text,
            metadata={
                "audioBase64": base64.b64encode(resp.content).decode("ascii"),
                "audioFormat": audio_format,
                "voice": voice,
                "model": self._model,
                "priority": self.config.priority,
            },
        )

    def _resolve_voice(self, voice_config: object | None) -> str:
        if voice_config is None:
            return self._default_voice
        if isinstance(voice_config, Mapping):
            v = (
                voice_config.get("voice_id")
                or voice_config.get("voiceId")
                or voice_config.get("voice_code")
            )
            if v:
                return str(v)
        v = getattr(voice_config, "voice_id", None) or getattr(
            voice_config, "voice_code", None
        )
        return str(v) if v else self._default_voice

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
