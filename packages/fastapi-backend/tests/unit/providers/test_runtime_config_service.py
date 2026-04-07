import asyncio
from types import SimpleNamespace

import httpx

from app.providers.factory import ProviderFactory, build_default_registry
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.shared.ruoyi_ai_runtime_client import RuoYiAiRuntimeClient
from app.shared.ruoyi_client import RuoYiClient


def test_runtime_resolver_builds_video_stage_chain_from_ruoyi_runtime_config() -> None:
    captured_headers: list[tuple[str | None, str | None]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/internal/xiaomai/ai/runtime-config/modules/video"
        captured_headers.append(
            (
                request.headers.get("authorization"),
                request.headers.get("clientid"),
            )
        )
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "moduleCode": "video",
                    "moduleName": "视频生成",
                    "bindings": [
                        {
                            "stageCode": "understanding",
                            "capability": "llm",
                            "roleCode": "",
                            "providerId": "openai-gemini-3_1-pro-high",
                            "priority": 1,
                            "timeoutSeconds": 120,
                            "retryAttempts": 1,
                            "healthSource": "ruoyi",
                            "isDefault": False,
                            "providerType": "openai-compatible",
                            "providerCode": "gemini-openai-gateway",
                            "providerName": "Gemini OpenAI Gateway",
                            "vendorCode": "openai",
                            "authType": "api_key",
                            "endpointUrl": "https://synai996.space/",
                            "apiKey": "sk-test",
                            "resourceCode": "gemini-3-1-pro-high",
                            "resourceName": "Gemini 3.1 Pro High",
                            "resourceType": "reasoning",
                            "modelName": "gemini-3.1-pro-high",
                            "resourceSettings": {"temperature": 0.1},
                            "runtimeSettings": {"temperature": 0.2},
                        },
                        {
                            "stageCode": "tts",
                            "capability": "tts",
                            "roleCode": "",
                            "providerId": "volcengine-zh_female_yingyujiaoxue_uranus_bigtts",
                            "priority": 1,
                            "timeoutSeconds": 60,
                            "retryAttempts": 1,
                            "healthSource": "ruoyi",
                            "isDefault": True,
                            "providerType": "doubao-tts",
                            "providerCode": "doubao-tts-prod",
                            "providerName": "豆包标准语音播报",
                            "vendorCode": "volcengine",
                            "authType": "api_key",
                            "endpointUrl": "https://openspeech.bytedance.com/api/v1/tts",
                            "apiKey": "tts-key",
                            "resourceCode": "doubao-voice-tina-2-0",
                            "resourceName": "tina老师 2.0",
                            "resourceType": "voice",
                            "voiceCode": "zh_female_yingyujiaoxue_uranus_bigtts",
                            "languageCode": "zh-CN",
                            "resourceSettings": {"providerType": "doubao-tts", "cluster": "volcano_tts"},
                            "runtimeSettings": {"speed_ratio": 1.0},
                        },
                    ],
                },
            },
        )

    runtime_client = RuoYiAiRuntimeClient(
        client_factory=lambda **kwargs: RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
            access_token=kwargs.get("access_token"),
            client_id=kwargs.get("client_id"),
        )
    )
    resolver = ProviderRuntimeResolver(
        settings=SimpleNamespace(
            provider_runtime_source="ruoyi",
            default_llm_provider="stub-llm",
            default_tts_provider="stub-tts",
        ),
        provider_factory=ProviderFactory(build_default_registry()),
        ruoyi_runtime_client=runtime_client,
    )

    assembly = asyncio.run(
        resolver.resolve_video_pipeline(
            access_token="runtime-token",
            client_id="runtime-client-id",
        )
    )
    voice_descriptors = asyncio.run(
        resolver.resolve_video_tts_voices(
            access_token="runtime-token",
            client_id="runtime-client-id",
        )
    )

    assert assembly.source == "ruoyi"
    assert assembly.llm_for("understanding")[0].provider_id == "openai-gemini-3_1-pro-high"
    assert assembly.llm_for("storyboard")[0].provider_id == "openai-gemini-3_1-pro-high"
    assert assembly.tts_for("tts")[0].provider_id == "volcengine-zh_female_yingyujiaoxue_uranus_bigtts"
    assert voice_descriptors[0].voice_code == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert voice_descriptors[0].voice_name == "tina老师 2.0"
    assert voice_descriptors[0].provider_id == "volcengine-zh_female_yingyujiaoxue_uranus_bigtts"
    assert captured_headers == [
        ("Bearer runtime-token", "runtime-client-id"),
        ("Bearer runtime-token", "runtime-client-id"),
    ]
