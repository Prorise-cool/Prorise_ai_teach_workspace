"""LLM Provider 注册与快捷获取。"""
from __future__ import annotations


from typing import TYPE_CHECKING, Any, Mapping

from app.core.config import get_settings
from app.providers.demo_provider import DemoLLMProvider
from app.providers.llm.openai_compatible_provider import OpenAICompatibleLLMProvider
from app.providers.llm.stub_provider import StubLLMProvider
from app.providers.protocols import LLMProvider, ProviderCapability, ProviderRuntimeConfig
from app.providers.registry import ProviderRegistry

if TYPE_CHECKING:
    from app.providers.factory import ProviderFactory


def register_llm_providers(registry: ProviderRegistry) -> None:
    """向注册表注册所有内置 LLM Provider。"""
    registry.register(
        ProviderCapability.LLM,
        "stub-llm",
        StubLLMProvider,
        default_priority=100,
        description="内置 LLM stub provider"
    )
    registry.register(
        ProviderCapability.LLM,
        "demo-chat",
        DemoLLMProvider,
        default_priority=10,
        description="演示用 LLM provider"
    )
    registry.register(
        ProviderCapability.LLM,
        "openai-compatible",
        OpenAICompatibleLLMProvider,
        default_priority=20,
        description="OpenAI compatible chat completions provider"
    )


def get_llm_provider(
    provider: str | ProviderRuntimeConfig | Mapping[str, Any] | None = None,
    *,
    factory: ProviderFactory | None = None
) -> LLMProvider:
    """获取单个 LLM Provider 实例。"""
    from app.providers.factory import get_provider_factory

    active_factory = factory or get_provider_factory()
    selected_provider = provider or get_settings().default_llm_provider
    return active_factory.get_llm_provider(selected_provider)


def get_llm_provider_chain(
    providers: list[str | ProviderRuntimeConfig | Mapping[str, Any]] | None = None,
    *,
    factory: ProviderFactory | None = None
) -> tuple[LLMProvider, ...]:
    """获取 LLM Provider 链。"""
    from app.providers.factory import get_provider_factory

    active_factory = factory or get_provider_factory()
    if providers is None:
        return active_factory.assemble_from_settings().llm
    return tuple(active_factory.build_chain(ProviderCapability.LLM, providers))
