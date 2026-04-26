"""OpenAI 兼容 TTS Provider（支持 Edge TTS 等兼容端点）。"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Mapping

import httpx

from app.providers.http_utils import raise_for_provider_status, require_setting
from app.providers.protocols import (
    ProviderConfigurationError,
    ProviderResult,
    ProviderRuntimeConfig,
)

_OPENAI_TTS_PATH = "/audio/speech"

logger = logging.getLogger(__name__)


class OpenAITTSProvider:
    """OpenAI /v1/audio/speech 兼容 TTS Provider。

    适用于 Edge TTS (travisvn/openai-edge-tts) 等提供 OpenAI 兼容接口的服务。

    base_url 支持逗号分隔多个候选地址（例如
    ``http://edge-tts:5050,http://localhost:5050``），调用时按顺序探测，
    首个成功的端点会被 pin 住供后续请求复用。这样同一条 provider 配置
    可同时覆盖容器网络（生产）与宿主机端口直连（本地开发）两种场景。
    """

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

        raw_base_url = require_setting(config, "base_url")
        endpoints = [
            url.strip().rstrip("/") + _OPENAI_TTS_PATH
            for url in raw_base_url.split(",")
            if url.strip()
        ]
        if not endpoints:
            raise ProviderConfigurationError(
                f"{config.provider_id} base_url 为空"
            )
        self._endpoints: list[str] = endpoints
        self._active_endpoint: str | None = (
            endpoints[0] if len(endpoints) == 1 else None
        )

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
        payload = {"model": self._model, "voice": voice, "input": text}
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        if self._active_endpoint is not None:
            candidates = [self._active_endpoint]
        else:
            candidates = list(self._endpoints)

        last_exc: Exception | None = None
        for endpoint in candidates:
            try:
                resp = await client.post(endpoint, headers=headers, json=payload)
                raise_for_provider_status(self.provider_id, resp)
            except (httpx.RequestError, ConnectionError) as exc:
                last_exc = exc
                if self._active_endpoint == endpoint:
                    # pinned endpoint 挂了，重置以便下次重新探测
                    self._active_endpoint = None
                logger.warning(
                    "TTS endpoint unreachable, trying next  provider=%s endpoint=%s error=%s",
                    self.provider_id,
                    endpoint,
                    exc,
                )
                continue

            content_type = resp.headers.get("content-type", "")
            if "audio" not in content_type:
                raise ConnectionError(
                    f"{self.provider_id} returned non-audio response: {content_type}"
                )

            if self._active_endpoint != endpoint:
                logger.info(
                    "TTS endpoint pinned  provider=%s endpoint=%s",
                    self.provider_id,
                    endpoint,
                )
                self._active_endpoint = endpoint

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

        assert last_exc is not None
        raise ConnectionError(
            f"{self.provider_id} all base_url candidates failed: {last_exc}"
        ) from last_exc

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
