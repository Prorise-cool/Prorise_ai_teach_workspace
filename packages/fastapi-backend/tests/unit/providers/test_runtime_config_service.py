import asyncio
from types import SimpleNamespace

import httpx
import pytest

from app.providers.factory import ProviderFactory, build_default_registry
from app.providers.protocols import ProviderCapability, ProviderNotFoundError
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
    # runtime_settings_json 穿透到 runtime_settings_by_stage
    assert assembly.runtime_settings_for("understanding") == {"temperature": 0.2}
    assert assembly.runtime_settings_for("tts") == {"speed_ratio": 1.0}
    # 未知 stage 返回空映射
    assert dict(assembly.runtime_settings_for("no_such_stage")) == {}
    assert voice_descriptors[0].voice_code == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert voice_descriptors[0].voice_name == "tina老师 2.0"
    assert voice_descriptors[0].provider_id == "volcengine-zh_female_yingyujiaoxue_uranus_bigtts"
    assert captured_headers == [
        ("Bearer runtime-token", "runtime-client-id"),
        ("Bearer runtime-token", "runtime-client-id"),
    ]


def test_runtime_resolver_supports_explicit_runtime_registration_override_for_new_provider_type() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/internal/xiaomai/ai/runtime-config/modules/video"
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
                            "stageCode": "tts",
                            "capability": "tts",
                            "roleCode": "",
                            "providerId": "acme-runtime-voice",
                            "priority": 1,
                            "timeoutSeconds": 30,
                            "retryAttempts": 0,
                            "healthSource": "ruoyi",
                            "isDefault": True,
                            "providerType": "acme-tts-v2",
                            "providerCode": "acme-voice-prod",
                            "providerName": "Acme 教学播报",
                            "vendorCode": "acme",
                            "authType": "api_key",
                            "resourceCode": "acme-voice-001",
                            "resourceName": "Acme Voice 001",
                            "resourceType": "voice",
                            "voiceCode": "acme_voice_001",
                            "languageCode": "zh-CN",
                            "runtimeSettings": {"providerRegistrationId": "demo-voice"},
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

    assembly = asyncio.run(resolver.resolve_video_pipeline())
    voice_descriptors = asyncio.run(resolver.resolve_video_tts_voices())

    runtime_provider = assembly.tts_for("tts")[0]
    assert runtime_provider.provider_id == "acme-runtime-voice"
    assert runtime_provider.config.settings["providerRegistrationId"] == "demo-voice"
    assert voice_descriptors[0].provider_id == "acme-runtime-voice"
    assert voice_descriptors[0].voice_code == "acme_voice_001"


def test_runtime_resolver_keeps_runtime_provider_registration_scoped_per_request_factory() -> None:
    responses = iter([
        {
            "code": 200,
            "msg": "ok",
            "data": {
                "moduleCode": "video",
                "moduleName": "视频生成",
                "bindings": [
                    {
                        "stageCode": "tts",
                        "capability": "tts",
                        "roleCode": "",
                        "providerId": "shared-runtime-voice",
                        "priority": 1,
                        "timeoutSeconds": 30,
                        "retryAttempts": 0,
                        "healthSource": "ruoyi",
                        "isDefault": True,
                        "providerType": "acme-tts-v2",
                        "providerCode": "acme-voice-prod",
                        "providerName": "Acme Demo Voice",
                        "vendorCode": "acme",
                        "authType": "api_key",
                        "resourceCode": "acme-demo-voice",
                        "resourceName": "Acme Demo Voice",
                        "resourceType": "voice",
                        "voiceCode": "acme_demo_voice",
                        "languageCode": "zh-CN",
                        "runtimeSettings": {"providerRegistrationId": "demo-voice"},
                    },
                ],
            },
        },
        {
            "code": 200,
            "msg": "ok",
            "data": {
                "moduleCode": "video",
                "moduleName": "视频生成",
                "bindings": [
                    {
                        "stageCode": "tts",
                        "capability": "tts",
                        "roleCode": "",
                        "providerId": "shared-runtime-voice",
                        "priority": 1,
                        "timeoutSeconds": 30,
                        "retryAttempts": 0,
                        "healthSource": "ruoyi",
                        "isDefault": True,
                        "providerType": "acme-tts-v2",
                        "providerCode": "acme-voice-prod",
                        "providerName": "Acme Stub Voice",
                        "vendorCode": "acme",
                        "authType": "api_key",
                        "resourceCode": "acme-stub-voice",
                        "resourceName": "Acme Stub Voice",
                        "resourceType": "voice",
                        "voiceCode": "acme_stub_voice",
                        "languageCode": "zh-CN",
                        "runtimeSettings": {"providerRegistrationId": "stub-tts"},
                    },
                ],
            },
        },
    ])

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/internal/xiaomai/ai/runtime-config/modules/video"
        return httpx.Response(200, json=next(responses))

    shared_factory = ProviderFactory(build_default_registry())
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
        provider_factory=shared_factory,
        ruoyi_runtime_client=runtime_client,
    )

    first_assembly = asyncio.run(resolver.resolve_video_pipeline())
    second_assembly = asyncio.run(resolver.resolve_video_pipeline())

    first_result = asyncio.run(first_assembly.tts_for("tts")[0].synthesize("hello"))
    second_result = asyncio.run(second_assembly.tts_for("tts")[0].synthesize("hello"))

    assert first_result.content == "[demo-tts:shared-runtime-voice] hello"
    assert second_result.content == "audio:hello"

    with pytest.raises(ProviderNotFoundError, match="shared-runtime-voice"):
        shared_factory.registry.get_registration(ProviderCapability.TTS, "shared-runtime-voice")


def test_resolve_learning_coach_without_access_token_falls_back_on_empty_bindings() -> None:
    """learning_coach 后台预生成入口（access_token=None）的路径验证。

    选择的实现策略：不改 resolve_learning_coach 的 guard；视频完成钩子复用视频任务
    Redis 里的 access_token（load_video_runtime_auth）来命中 RuoYi 路径。测试环境
    requires_explicit_request_auth=False 时 None token 仍会打 RuoYi —— 拿到空 bindings
    就降级回 settings，保证预生成永不崩。
    """
    hit_counter = {"value": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        hit_counter["value"] += 1
        return httpx.Response(200, json={"code": 200, "msg": "ok", "data": {"moduleCode": "learning_coach", "bindings": []}})

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

    assembly = asyncio.run(resolver.resolve_learning_coach(access_token=None))

    # 空 bindings 一定回退到 settings，source 标注清楚。
    assert assembly.source == "settings"
    # 当 requires_explicit_request_auth=False 时，会打一次 RuoYi 然后降级。
    assert hit_counter["value"] == 1
