import asyncio
import json

import httpx
import pytest

from app.providers.protocols import ProviderRuntimeConfig
from app.providers.tts.doubao_provider import DoubaoTTSProvider


def test_doubao_tts_provider_sends_openspeech_request_and_returns_audio_payload() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://openspeech.bytedance.com/api/v1/tts"
        assert request.headers["x-api-key"] == "tts-key"
        payload = json.loads(request.content.decode("utf-8"))
        assert payload["app"]["cluster"] == "volcano_tts"
        assert payload["audio"]["voice_type"] == "zh_female_yingyujiaoxue_uranus_bigtts"
        assert payload["audio"]["encoding"] == "mp3"
        assert payload["audio"]["speed_ratio"] == 1.0
        return httpx.Response(
            200,
            json={
                "code": 3000,
                "message": "Success",
                "data": "SUQz",
            },
        )

    provider = DoubaoTTSProvider(
        ProviderRuntimeConfig(
            provider_id="volcengine-tts",
            settings={
                "base_url": "https://openspeech.bytedance.com/api/v1/tts",
                "api_key": "tts-key",
                "voice_code": "zh_female_yingyujiaoxue_uranus_bigtts",
                "cluster": "volcano_tts",
                "transport": httpx.MockTransport(handler),
            },
        )
    )

    result = asyncio.run(provider.synthesize("讲解勾股定理"))

    assert result.provider == "volcengine-tts"
    assert result.metadata["audioBase64"] == "SUQz"
    assert result.metadata["voiceCode"] == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert result.metadata["audioFormat"] == "mp3"


def test_doubao_tts_provider_maps_authentication_error_to_value_error() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "invalid api key"})

    provider = DoubaoTTSProvider(
        ProviderRuntimeConfig(
            provider_id="volcengine-tts",
            settings={
                "base_url": "https://openspeech.bytedance.com/api/v1/tts",
                "api_key": "tts-key",
                "voice_code": "BV001",
                "transport": httpx.MockTransport(handler),
            },
        )
    )

    with pytest.raises(ValueError, match="authentication failed"):
        asyncio.run(provider.synthesize("你好"))
