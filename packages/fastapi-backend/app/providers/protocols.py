from __future__ import annotations

"""Provider 抽象层协议、配置模型与统一异常。"""

import re
from dataclasses import dataclass, field
from enum import StrEnum
from types import MappingProxyType
from typing import Any, Mapping, Protocol, runtime_checkable

PROVIDER_ID_PATTERN = re.compile(r"^[a-z0-9]+-[a-z0-9][a-z0-9_-]*$")


class ProviderCapability(StrEnum):
    LLM = "llm"
    TTS = "tts"


class ProviderError(Exception):
    """Provider 抽象层统一异常基类。"""


class ProviderConfigurationError(ProviderError):
    """Provider 配置缺失或格式错误。"""


class ProviderNotFoundError(ProviderError):
    """请求的 Provider 未注册。"""


class ProviderProtocolError(ProviderError):
    """Provider 实现与声明的协议不兼容。"""


def validate_provider_id(provider_id: str) -> str:
    """校验并归一化 Provider 标识符。"""
    normalized = provider_id.strip().lower()
    if not PROVIDER_ID_PATTERN.fullmatch(normalized):
        raise ProviderConfigurationError(
            "Provider 标识符必须遵循 {vendor}-{model_or_voice} 格式"
        )
    return normalized


@dataclass(slots=True, frozen=True)
class ProviderRuntimeConfig:
    """运行时 Provider 配置，供工厂与 Failover 装配链路复用。"""

    provider_id: str
    priority: int = 100
    timeout_seconds: float = 30.0
    retry_attempts: int = 0
    health_source: str = "unconfigured"
    settings: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "provider_id", validate_provider_id(self.provider_id))
        if self.priority < 0:
            raise ProviderConfigurationError("Provider priority 不能为负数")
        if self.timeout_seconds <= 0:
            raise ProviderConfigurationError("Provider timeout_seconds 必须大于 0")
        if self.retry_attempts < 0:
            raise ProviderConfigurationError("Provider retry_attempts 不能为负数")
        object.__setattr__(
            self,
            "settings",
            MappingProxyType(dict(self.settings))
        )


@dataclass(slots=True, frozen=True)
class ProviderResult:
    """Provider 调用结果的统一传输对象。"""

    provider: str
    content: str
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "provider", validate_provider_id(self.provider))
        object.__setattr__(
            self,
            "metadata",
            MappingProxyType(dict(self.metadata))
        )


@runtime_checkable
class ProviderProtocol(Protocol):
    provider_id: str
    config: ProviderRuntimeConfig


@runtime_checkable
class LLMProvider(ProviderProtocol, Protocol):
    async def generate(self, prompt: str) -> ProviderResult: ...


@runtime_checkable
class TTSProvider(ProviderProtocol, Protocol):
    async def synthesize(self, text: str) -> ProviderResult: ...
