import asyncio
from types import SimpleNamespace

import pytest

from app.providers.demo_provider import DemoLLMProvider
from app.providers.factory import ProviderFactory
from app.providers.llm.factory import register_llm_providers
from app.providers.protocols import (
    LLMProvider,
    ProviderCapability,
    ProviderNotFoundError,
    ProviderProtocolError,
    ProviderResult,
    ProviderRuntimeConfig
)
from app.providers.registry import ProviderRegistry
from app.providers.tts.factory import register_tts_providers


def _build_factory() -> ProviderFactory:
    registry = ProviderRegistry()
    register_llm_providers(registry)
    register_tts_providers(registry)
    return ProviderFactory(registry)


def test_registry_orders_registrations_by_priority_then_registration_order() -> None:
    registry = ProviderRegistry()
    registry.register(
        ProviderCapability.LLM,
        "zeta-chat",
        DemoLLMProvider,
        default_priority=30
    )
    registry.register(
        ProviderCapability.LLM,
        "alpha-chat",
        DemoLLMProvider,
        default_priority=10
    )
    registry.register(
        ProviderCapability.LLM,
        "beta-chat",
        DemoLLMProvider,
        default_priority=10
    )

    registrations = registry.list_registered(ProviderCapability.LLM)

    assert [item.provider_id for item in registrations] == [
        "alpha-chat",
        "beta-chat",
        "zeta-chat"
    ]


def test_registry_clone_keeps_existing_entries_but_isolated_from_new_registrations() -> None:
    registry = ProviderRegistry()
    register_llm_providers(registry)

    cloned = registry.clone()
    cloned.register(
        ProviderCapability.LLM,
        "runtime-only-llm",
        DemoLLMProvider,
        default_priority=1
    )

    assert cloned.get_registration(ProviderCapability.LLM, "runtime-only-llm").provider_id == "runtime-only-llm"
    with pytest.raises(ProviderNotFoundError, match="runtime-only-llm"):
        registry.get_registration(ProviderCapability.LLM, "runtime-only-llm")


def test_factory_builds_priority_sorted_chain_and_demo_provider_returns_metadata() -> None:
    factory = _build_factory()

    llm_chain = factory.build_chain(
        ProviderCapability.LLM,
        [
            {
                "provider": "stub-llm",
                "priority": 20,
                "timeout_seconds": 9,
                "retry_attempts": 1,
                "health_source": "config:stub"
            },
            {
                "provider": "demo-chat",
                "priority": 5,
                "timeout_seconds": 4,
                "retry_attempts": 2,
                "health_source": "config:demo"
            }
        ]
    )
    tts_provider = factory.get_tts_provider(
        {
            "provider": "demo-voice",
            "priority": 1,
            "timeout_seconds": 6,
            "retry_attempts": 0,
            "health_source": "config:tts"
        }
    )

    assert [provider.provider_id for provider in llm_chain] == ["demo-chat", "stub-llm"]
    assert [provider.config.priority for provider in llm_chain] == [5, 20]

    llm_result = asyncio.run(llm_chain[0].generate("teach me"))
    tts_result = asyncio.run(tts_provider.synthesize("欢迎来到课堂"))

    assert llm_result.provider == "demo-chat"
    assert llm_result.metadata["healthSource"] == "config:demo"
    assert "teach me" in llm_result.content
    assert tts_result.provider == "demo-voice"
    assert tts_result.metadata["timeoutSeconds"] == 6


def test_factory_assemble_from_settings_supports_env_override_and_default_fallback() -> None:
    factory = _build_factory()
    settings = SimpleNamespace(default_llm_provider="stub-llm", default_tts_provider="stub-tts")

    assembly = factory.assemble_from_settings(
        settings=settings,
        env={
            "FASTAPI_LLM_PROVIDER_CHAIN": """
            [
              {"provider": "demo-chat", "priority": 1, "health_source": "redis:xm_provider_health:demo-chat"},
              {"provider": "stub-llm", "priority": 9, "timeout_seconds": 12}
            ]
            """
        }
    )

    assert [provider.provider_id for provider in assembly.llm] == ["demo-chat", "stub-llm"]
    assert assembly.llm[0].config.health_source == "redis:xm_provider_health:demo-chat"
    assert [provider.provider_id for provider in assembly.tts] == ["stub-tts"]


def test_factory_raises_unknown_provider_error() -> None:
    factory = _build_factory()

    with pytest.raises(ProviderNotFoundError, match="unknown-voice"):
        factory.get_tts_provider("unknown-voice")


def test_business_layer_depends_on_protocol_and_accepts_new_registration_without_code_change() -> None:
    class ClassroomWriter:
        async def render(self, provider: LLMProvider, prompt: str) -> str:
            result = await provider.generate(prompt)
            return f"{result.provider}:{result.content}"

    class AcmeTeacherProvider:
        def __init__(self, config: ProviderRuntimeConfig) -> None:
            self.config = config
            self.provider_id = config.provider_id

        async def generate(self, prompt: str) -> ProviderResult:
            return ProviderResult(
                provider=self.provider_id,
                content=f"lesson:{prompt}"
            )

    factory = _build_factory()
    factory.registry.register(
        ProviderCapability.LLM,
        "acme-teacher",
        AcmeTeacherProvider,
        default_priority=3
    )

    provider = factory.get_llm_provider("acme-teacher")
    writer = ClassroomWriter()
    rendered = asyncio.run(writer.render(provider, "fractions"))

    assert isinstance(provider, LLMProvider)
    assert rendered == "acme-teacher:lesson:fractions"


def test_factory_rejects_provider_without_declared_protocol() -> None:
    class BrokenProvider:
        def __init__(self, config: ProviderRuntimeConfig) -> None:
            self.config = config
            self.provider_id = config.provider_id

    factory = _build_factory()
    factory.registry.register(
        ProviderCapability.LLM,
        "broken-chat",
        BrokenProvider,
        default_priority=99
    )

    with pytest.raises(ProviderProtocolError, match="broken-chat"):
        factory.get_llm_provider("broken-chat")
