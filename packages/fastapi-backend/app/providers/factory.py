from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Callable, Iterable, Mapping

from app.core.config import Settings, get_settings
from app.infra.redis_client import RuntimeStore, create_runtime_store
from app.providers.failover import ProviderFailoverService, ProviderSwitch
from app.providers.health import ProviderHealthStore
from app.providers.registry import ProviderRegistry
from app.providers.protocols import (
    LLMProvider,
    ProviderCapability,
    ProviderConfigurationError,
    ProviderRuntimeConfig,
    TTSProvider
)

LLM_CHAIN_ENV = "FASTAPI_LLM_PROVIDER_CHAIN"
TTS_CHAIN_ENV = "FASTAPI_TTS_PROVIDER_CHAIN"


@dataclass(slots=True, frozen=True)
class ProviderAssembly:
    llm: tuple[LLMProvider, ...]
    tts: tuple[TTSProvider, ...]


class ProviderFactory:
    """统一的 Provider 实例装配入口。"""

    def __init__(self, registry: ProviderRegistry) -> None:
        self._registry = registry

    @property
    def registry(self) -> ProviderRegistry:
        return self._registry

    def get_llm_provider(
        self,
        provider: str | ProviderRuntimeConfig | Mapping[str, Any]
    ) -> LLMProvider:
        return self._registry.build(
            ProviderCapability.LLM,
            self._coerce_runtime_config(ProviderCapability.LLM, provider)
        )

    def get_tts_provider(
        self,
        provider: str | ProviderRuntimeConfig | Mapping[str, Any]
    ) -> TTSProvider:
        return self._registry.build(
            ProviderCapability.TTS,
            self._coerce_runtime_config(ProviderCapability.TTS, provider)
        )

    def build_chain(
        self,
        capability: ProviderCapability | str,
        providers: Iterable[str | ProviderRuntimeConfig | Mapping[str, Any]]
    ) -> tuple[LLMProvider | TTSProvider, ...]:
        prepared = [
            self._coerce_runtime_config(capability, provider)
            for provider in providers
        ]
        sorted_configs = sorted(
            enumerate(prepared),
            key=lambda item: (item[1].priority, item[0])
        )
        return tuple(
            self._registry.build(capability, config)
            for _, config in sorted_configs
        )

    def assemble(
        self,
        *,
        llm: Iterable[str | ProviderRuntimeConfig | Mapping[str, Any]],
        tts: Iterable[str | ProviderRuntimeConfig | Mapping[str, Any]]
    ) -> ProviderAssembly:
        return ProviderAssembly(
            llm=tuple(self.build_chain(ProviderCapability.LLM, llm)),
            tts=tuple(self.build_chain(ProviderCapability.TTS, tts))
        )

    def assemble_from_settings(
        self,
        settings: Settings | Any | None = None,
        env: Mapping[str, str] | None = None
    ) -> ProviderAssembly:
        active_settings = settings or get_settings()
        active_env = env or os.environ
        llm_config = self._parse_chain_config(
            active_env.get(LLM_CHAIN_ENV, active_settings.default_llm_provider)
        )
        tts_config = self._parse_chain_config(
            active_env.get(TTS_CHAIN_ENV, active_settings.default_tts_provider)
        )
        return self.assemble(llm=llm_config, tts=tts_config)

    def create_failover_service(
        self,
        runtime_store: RuntimeStore | None = None,
    ) -> ProviderFailoverService:
        active_runtime_store = runtime_store or create_runtime_store()
        return ProviderFailoverService(ProviderHealthStore(active_runtime_store))

    async def generate_with_failover(
        self,
        providers: Iterable[str | ProviderRuntimeConfig | Mapping[str, Any]],
        prompt: str,
        *,
        runtime_store: RuntimeStore | None = None,
        emit_switch: Callable[[ProviderSwitch], Any] | None = None,
    ) -> ProviderResult:
        chain = tuple(self.build_chain(ProviderCapability.LLM, providers))
        return await self.create_failover_service(runtime_store).generate(
            chain,
            prompt,
            emit_switch=emit_switch,
        )

    async def synthesize_with_failover(
        self,
        providers: Iterable[str | ProviderRuntimeConfig | Mapping[str, Any]],
        text: str,
        *,
        runtime_store: RuntimeStore | None = None,
        emit_switch: Callable[[ProviderSwitch], Any] | None = None,
    ) -> ProviderResult:
        chain = tuple(self.build_chain(ProviderCapability.TTS, providers))
        return await self.create_failover_service(runtime_store).synthesize(
            chain,
            text,
            emit_switch=emit_switch,
        )

    def _coerce_runtime_config(
        self,
        capability: ProviderCapability | str,
        provider: str | ProviderRuntimeConfig | Mapping[str, Any]
    ) -> ProviderRuntimeConfig:
        if isinstance(provider, ProviderRuntimeConfig):
            registration = self._registry.get_registration(capability, provider.provider_id)
            if provider.provider_id == registration.provider_id:
                return provider
            return ProviderRuntimeConfig(
                provider_id=registration.provider_id,
                priority=provider.priority,
                timeout_seconds=provider.timeout_seconds,
                retry_attempts=provider.retry_attempts,
                health_source=provider.health_source,
                settings=dict(provider.settings)
            )

        if isinstance(provider, str):
            return self._registry.build_runtime_config(capability, provider)

        provider_id = provider.get("provider") or provider.get("provider_id")
        if not provider_id:
            raise ProviderConfigurationError("Provider 配置缺少 provider/provider_id 字段")

        return self._registry.build_runtime_config(
            capability,
            str(provider_id),
            priority=int(provider["priority"]) if "priority" in provider else None,
            timeout_seconds=float(provider.get("timeout_seconds", 30.0)),
            retry_attempts=int(provider.get("retry_attempts", 0)),
            health_source=str(provider.get("health_source", "unconfigured")),
            settings=dict(provider.get("settings", {}))
        )

    def _parse_chain_config(
        self,
        raw_config: str | ProviderRuntimeConfig | Mapping[str, Any] | Iterable[Any]
    ) -> list[str | ProviderRuntimeConfig | Mapping[str, Any]]:
        if isinstance(raw_config, ProviderRuntimeConfig):
            return [raw_config]
        if isinstance(raw_config, Mapping):
            return [raw_config]
        if isinstance(raw_config, str):
            value = raw_config.strip()
            if not value:
                return []
            if value.startswith("["):
                parsed = json.loads(value)
                if not isinstance(parsed, list):
                    raise ProviderConfigurationError("Provider 链配置必须是 JSON 数组")
                return parsed
            return [item.strip() for item in value.split(",") if item.strip()]
        return list(raw_config)


def build_default_registry() -> ProviderRegistry:
    from app.providers.llm.factory import register_llm_providers
    from app.providers.tts.factory import register_tts_providers

    registry = ProviderRegistry()
    register_llm_providers(registry)
    register_tts_providers(registry)
    return registry


@lru_cache
def get_provider_factory() -> ProviderFactory:
    return ProviderFactory(build_default_registry())


def reset_provider_factory_cache() -> None:
    get_provider_factory.cache_clear()
