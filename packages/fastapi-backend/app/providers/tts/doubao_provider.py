"""豆包 / 火山引擎 TTS Provider 实现。"""
from __future__ import annotations

import asyncio

import json
from typing import Any, Mapping
from uuid import uuid4

import httpx

from app.providers.http_utils import handle_provider_request_error, raise_for_provider_status, require_setting
from app.providers.protocols import ProviderConfigurationError, ProviderResult, ProviderRuntimeConfig

_SUCCESS_CODES = {0, 3000}


def _coerce_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _read_mapping_value(mapping: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in mapping:
            value = mapping[key]
            if value is not None:
                return value
    return None


def _read_voice_value(voice_config: Any | None, *keys: str) -> Any:
    if voice_config is None:
        return None
    if isinstance(voice_config, Mapping):
        return _read_mapping_value(voice_config, *keys)
    for key in keys:
        value = getattr(voice_config, key, None)
        if value is not None:
            return value
    return None


class DoubaoTTSProvider:
    """对接豆包 / 火山引擎 OpenSpeech TTS 的 Provider。"""

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        """初始化豆包 TTS Provider。"""
        self.config = config
        self.provider_id = config.provider_id

        self._endpoint_url = require_setting(config, "base_url")
        self._api_key = require_setting(config, "api_key")
        self._cluster = self._read_setting("cluster", default="volcano_tts")
        self._default_voice_code = self._read_setting("voice_code", "voiceCode")
        self._default_encoding = self._read_setting("encoding", default="mp3")
        self._default_uid = self._read_setting("uid")
        self._request_operation = self._read_setting("operation", default="query")
        self._auth_header = self._read_setting("auth_header", "authHeader", default="x-api-key")
        self._transport = config.settings.get("transport")
        extra_headers = config.settings.get("headers", {})

        self._headers = {"Content-Type": "application/json", self._auth_header: self._api_key}
        if isinstance(extra_headers, Mapping):
            self._headers.update({str(key): str(value) for key, value in extra_headers.items()})
        self._client: httpx.AsyncClient | None = None
        self._client_lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        """复用同一 provider 实例的 HTTP client，避免多段 TTS 重复建连。"""
        if self._client is not None:
            return self._client

        async with self._client_lock:
            if self._client is None:
                self._client = httpx.AsyncClient(
                    timeout=self.config.timeout_seconds,
                    transport=self._transport,
                )
        return self._client

    async def synthesize(self, text: str, voice_config: Any | None = None) -> ProviderResult:
        """调用豆包 OpenSpeech API 合成语音。"""
        normalized_text = text.strip() if isinstance(text, str) else ""
        if not normalized_text:
            raise ValueError(f"{self.provider_id} synthesize text is empty")

        voice_code = _read_voice_value(voice_config, "voice_id", "voiceId") or self._default_voice_code
        if not isinstance(voice_code, str) or not voice_code.strip():
            raise ProviderConfigurationError(f"{self.provider_id} 缺少音色配置：voice_code")
        voice_code = voice_code.strip()

        encoding = _read_voice_value(voice_config, "format", "audio_format", "audioFormat") or self._default_encoding
        if not isinstance(encoding, str) or not encoding.strip():
            encoding = "mp3"
        encoding = encoding.strip().lower()

        payload = {
            "app": {"cluster": self._cluster},
            "user": {"uid": self._default_uid or str(uuid4())},
            "audio": {
                "voice_type": voice_code,
                "encoding": encoding,
                "speed_ratio": _coerce_float(
                    _read_voice_value(voice_config, "speed", "speed_ratio", "speedRatio")
                    or self._read_setting("speed_ratio", "speedRatio"),
                    1.0,
                ),
                "volume_ratio": _coerce_float(
                    _read_voice_value(voice_config, "volume_ratio", "volumeRatio")
                    or self._read_setting("volume_ratio", "volumeRatio"),
                    1.0,
                ),
                "pitch_ratio": _coerce_float(
                    _read_voice_value(voice_config, "pitch_ratio", "pitchRatio")
                    or self._read_setting("pitch_ratio", "pitchRatio"),
                    1.0,
                ),
            },
            "request": {
                "reqid": str(uuid4()),
                "text": normalized_text,
                "operation": self._request_operation,
            },
        }

        app_id = self._read_setting("app_id", "appId")
        if app_id:
            payload["app"]["appid"] = app_id
        app_token = self._read_setting("app_token", "appToken", "token")
        if app_token:
            payload["app"]["token"] = app_token

        try:
            client = await self._get_client()
            response = await client.post(self._endpoint_url, json=payload, headers=self._headers)
        except Exception as exc:
            handle_provider_request_error(self.provider_id, exc)

        raise_for_provider_status(self.provider_id, response)

        try:
            response_payload = response.json()
        except json.JSONDecodeError as exc:
            raise ValueError(f"{self.provider_id} returned invalid json") from exc

        code = _coerce_int(response_payload.get("code"), -1)
        message = str(response_payload.get("message") or response_payload.get("msg") or "").strip()
        audio_base64 = response_payload.get("data")
        if code not in _SUCCESS_CODES:
            raise ValueError(f"{self.provider_id} tts failed code={code}: {message or 'unknown error'}")
        if not isinstance(audio_base64, str) or not audio_base64.strip():
            raise ValueError(f"{self.provider_id} response missing audio payload")

        return ProviderResult(
            provider=self.provider_id,
            content=normalized_text,
            metadata={
                "audioBase64": audio_base64.strip(),
                "audioFormat": encoding,
                "voiceCode": voice_code,
                "cluster": self._cluster,
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source,
            },
        )


    def _read_setting(self, *keys: str, default: str | None = None) -> str | None:
        value = _read_mapping_value(self.config.settings, *keys)
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
        return default
