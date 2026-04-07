from __future__ import annotations

from typing import TYPE_CHECKING, Any, Mapping

from app.core.config import get_settings
from app.providers.demo_provider import DemoTTSProvider
from app.providers.protocols import ProviderCapability, ProviderRuntimeConfig, TTSProvider
from app.providers.registry import ProviderRegistry
from app.providers.tts.doubao_provider import DoubaoTTSProvider
from app.providers.tts.stub_provider import StubTTSProvider

if TYPE_CHECKING:
    from app.providers.factory import ProviderFactory


def register_tts_providers(registry: ProviderRegistry) -> None:
    registry.register(
        ProviderCapability.TTS,
        "stub-tts",
        StubTTSProvider,
        default_priority=100,
        description="内置 TTS stub provider"
    )
    registry.register(
        ProviderCapability.TTS,
        "demo-voice",
        DemoTTSProvider,
        default_priority=10,
        description="演示用 TTS provider"
    )
    registry.register(
        ProviderCapability.TTS,
        "doubao-tts",
        DoubaoTTSProvider,
        default_priority=20,
        description="豆包 / 火山引擎 TTS provider"
    )


def get_tts_provider(
    provider: str | ProviderRuntimeConfig | Mapping[str, Any] | None = None,
    *,
    factory: ProviderFactory | None = None
) -> TTSProvider:
    from app.providers.factory import get_provider_factory

    active_factory = factory or get_provider_factory()
    selected_provider = provider or get_settings().default_tts_provider
    return active_factory.get_tts_provider(selected_provider)


def get_tts_provider_chain(
    providers: list[str | ProviderRuntimeConfig | Mapping[str, Any]] | None = None,
    *,
    factory: ProviderFactory | None = None
) -> tuple[TTSProvider, ...]:
    from app.providers.factory import get_provider_factory

    active_factory = factory or get_provider_factory()
    if providers is None:
        return active_factory.assemble_from_settings().tts
    return tuple(active_factory.build_chain(ProviderCapability.TTS, providers))
