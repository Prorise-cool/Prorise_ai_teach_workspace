"""Provider 注册表实现。"""
from __future__ import annotations


from dataclasses import dataclass
from typing import Any, Callable

from app.providers.protocols import (
    LLMProvider,
    ProviderCapability,
    ProviderConfigurationError,
    ProviderNotFoundError,
    ProviderProtocolError,
    ProviderRuntimeConfig,
    TTSProvider,
    validate_provider_id
)

ProviderBuilder = Callable[[ProviderRuntimeConfig], object]


@dataclass(slots=True, frozen=True)
class ProviderRegistration:
    """Provider 注册元信息。"""
    capability: ProviderCapability
    provider_id: str
    builder: ProviderBuilder
    default_priority: int = 100
    aliases: tuple[str, ...] = ()
    description: str = ""


class ProviderRegistry:
    """维护 Provider 注册、协议校验与默认优先级。"""

    def __init__(self) -> None:
        """初始化 Provider 注册表。"""
        self._registrations: dict[ProviderCapability, dict[str, ProviderRegistration]] = {
            ProviderCapability.LLM: {},
            ProviderCapability.TTS: {}
        }
        self._aliases: dict[ProviderCapability, dict[str, str]] = {
            ProviderCapability.LLM: {},
            ProviderCapability.TTS: {}
        }
        self._registration_order: dict[tuple[ProviderCapability, str], int] = {}
        self._order = 0

    def register(
        self,
        capability: ProviderCapability | str,
        provider_id: str,
        builder: ProviderBuilder,
        *,
        default_priority: int = 100,
        aliases: tuple[str, ...] = (),
        description: str = ""
    ) -> ProviderRegistration:
        """注册一个 Provider 构建器。"""
        capability_key = ProviderCapability(capability)
        canonical_id = validate_provider_id(provider_id)
        alias_ids = tuple(validate_provider_id(alias) for alias in aliases)

        if default_priority < 0:
            raise ProviderConfigurationError("default_priority 不能为负数")
        if canonical_id in self._registrations[capability_key]:
            raise ProviderConfigurationError(
                f"{capability_key.value} Provider 已注册：{canonical_id}"
            )
        if canonical_id in self._aliases[capability_key]:
            raise ProviderConfigurationError(
                f"{capability_key.value} Provider alias 冲突：{canonical_id}"
            )

        registration = ProviderRegistration(
            capability=capability_key,
            provider_id=canonical_id,
            builder=builder,
            default_priority=default_priority,
            aliases=alias_ids,
            description=description
        )
        self._registrations[capability_key][canonical_id] = registration
        self._registration_order[(capability_key, canonical_id)] = self._order
        self._order += 1

        for alias_id in alias_ids:
            if alias_id in self._registrations[capability_key] or alias_id in self._aliases[capability_key]:
                raise ProviderConfigurationError(
                    f"{capability_key.value} Provider alias 冲突：{alias_id}"
                )
            self._aliases[capability_key][alias_id] = canonical_id

        return registration

    def resolve_provider_id(self, capability: ProviderCapability | str, provider_id: str) -> str:
        """解析 Provider ID（含别名解析）。"""
        capability_key = ProviderCapability(capability)
        normalized = validate_provider_id(provider_id)
        if normalized in self._registrations[capability_key]:
            return normalized
        if normalized in self._aliases[capability_key]:
            return self._aliases[capability_key][normalized]
        raise ProviderNotFoundError(
            f"未注册的 {capability_key.value} Provider：{normalized}"
        )

    def get_registration(
        self,
        capability: ProviderCapability | str,
        provider_id: str
    ) -> ProviderRegistration:
        """获取指定 Provider 的注册元信息。"""
        capability_key = ProviderCapability(capability)
        canonical_id = self.resolve_provider_id(capability_key, provider_id)
        return self._registrations[capability_key][canonical_id]

    def list_registered(self, capability: ProviderCapability | str) -> list[ProviderRegistration]:
        """列出指定能力下的所有已注册 Provider。"""
        capability_key = ProviderCapability(capability)
        registrations = self._registrations[capability_key].values()
        return sorted(
            registrations,
            key=lambda item: (
                item.default_priority,
                self._registration_order[(capability_key, item.provider_id)]
            )
        )

    def build(
        self,
        capability: ProviderCapability | str,
        config: ProviderRuntimeConfig
    ) -> LLMProvider | TTSProvider:
        """根据运行时配置构建 Provider 实例。"""
        registration = self.get_registration(capability, config.provider_id)
        instance = registration.builder(config)
        capability_key = ProviderCapability(capability)

        if capability_key is ProviderCapability.LLM and not isinstance(instance, LLMProvider):
            raise ProviderProtocolError(
                f"{registration.provider_id} 未实现 LLMProvider 协议"
            )
        if capability_key is ProviderCapability.TTS and not isinstance(instance, TTSProvider):
            raise ProviderProtocolError(
                f"{registration.provider_id} 未实现 TTSProvider 协议"
            )
        return instance

    def build_runtime_config(
        self,
        capability: ProviderCapability | str,
        provider_id: str,
        *,
        priority: int | None = None,
        timeout_seconds: float = 30.0,
        retry_attempts: int = 0,
        health_source: str = "unconfigured",
        settings: dict[str, Any] | None = None
    ) -> ProviderRuntimeConfig:
        """根据注册信息构建运行时配置。"""
        registration = self.get_registration(capability, provider_id)
        return ProviderRuntimeConfig(
            provider_id=registration.provider_id,
            priority=registration.default_priority if priority is None else priority,
            timeout_seconds=timeout_seconds,
            retry_attempts=retry_attempts,
            health_source=health_source,
            settings=settings or {}
        )
