"""RuoYi AI 运行时配置客户端，读取模块级 Provider 绑定与资源配置。"""

from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Callable, Mapping

from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.ruoyi_client import RuoYiClient


def _immutable_mapping(value: Mapping[str, Any] | None) -> Mapping[str, Any]:
    return MappingProxyType(dict(value or {}))


@dataclass(slots=True, frozen=True)
class RuoYiAiRuntimeBinding:
    """单个 AI Provider 运行时绑定配置（不可变）。"""
    stage_code: str
    capability: str
    role_code: str
    provider_id: str
    priority: int
    timeout_seconds: float
    retry_attempts: int
    health_source: str
    is_default: bool
    provider_type: str
    provider_code: str
    provider_name: str
    vendor_code: str
    auth_type: str
    endpoint_url: str | None
    app_id: str | None
    api_key: str | None
    api_secret: str | None
    access_token: str | None
    resource_code: str
    resource_name: str
    resource_type: str | None
    model_name: str | None
    voice_code: str | None
    language_code: str | None
    extra_auth: Mapping[str, Any] = field(default_factory=dict)
    resource_settings: Mapping[str, Any] = field(default_factory=dict)
    runtime_settings: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "extra_auth", _immutable_mapping(self.extra_auth))
        object.__setattr__(self, "resource_settings", _immutable_mapping(self.resource_settings))
        object.__setattr__(self, "runtime_settings", _immutable_mapping(self.runtime_settings))


@dataclass(slots=True, frozen=True)
class RuoYiAiRuntimeModule:
    """AI 运行时模块配置，包含模块标识和绑定的 Provider 列表。"""
    module_code: str
    module_name: str
    bindings: tuple[RuoYiAiRuntimeBinding, ...]


class RuoYiAiRuntimeClient:
    """读取 RuoYi internal AI runtime 配置。"""

    def __init__(self, client_factory: Callable[..., RuoYiClient] | None = None) -> None:
        """初始化客户端，可注入自定义的 RuoYiClient 工厂。"""
        self._client_factory = client_factory or RuoYiClient.from_service_auth

    async def get_module_runtime(
        self,
        module_code: str,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> RuoYiAiRuntimeModule:
        """查询指定模块的 AI 运行时配置与 Provider 绑定列表。"""
        async with self._create_client(access_token=access_token, client_id=client_id) as client:
            response = await client.get_single(
                f"/internal/xiaomai/ai/runtime-config/modules/{module_code}",
                resource="ai-runtime-config",
                operation="query",
            )

        payload = response.data if isinstance(response.data, Mapping) else {}
        bindings = tuple(
            self._build_binding(item)
            for item in payload.get("bindings", [])
            if isinstance(item, Mapping)
        )
        return RuoYiAiRuntimeModule(
            module_code=str(payload.get("moduleCode") or module_code),
            module_name=str(payload.get("moduleName") or module_code),
            bindings=bindings,
        )

    def _create_client(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> RuoYiClient:
        if access_token is None and client_id is None:
            return self._client_factory()

        try:
            return self._client_factory(access_token=access_token, client_id=client_id)
        except TypeError:
            if access_token is None:
                return self._client_factory()
            return RuoYiClient.from_request_auth(
                RuoYiRequestAuth(access_token=access_token, client_id=client_id)
            )

    @staticmethod
    def _build_binding(payload: Mapping[str, Any]) -> RuoYiAiRuntimeBinding:
        return RuoYiAiRuntimeBinding(
            stage_code=str(payload.get("stageCode") or ""),
            capability=str(payload.get("capability") or ""),
            role_code=str(payload.get("roleCode") or ""),
            provider_id=str(payload.get("providerId") or ""),
            priority=int(payload.get("priority") or 100),
            timeout_seconds=float(payload.get("timeoutSeconds") or 30),
            retry_attempts=int(payload.get("retryAttempts") or 0),
            health_source=str(payload.get("healthSource") or "ruoyi"),
            is_default=_read_bool(payload.get("isDefault")),
            provider_type=str(payload.get("providerType") or ""),
            provider_code=str(payload.get("providerCode") or ""),
            provider_name=str(payload.get("providerName") or ""),
            vendor_code=str(payload.get("vendorCode") or ""),
            auth_type=str(payload.get("authType") or ""),
            endpoint_url=_read_optional_string(payload.get("endpointUrl")),
            app_id=_read_optional_string(payload.get("appId")),
            api_key=_read_optional_string(payload.get("apiKey")),
            api_secret=_read_optional_string(payload.get("apiSecret")),
            access_token=_read_optional_string(payload.get("accessToken")),
            resource_code=str(payload.get("resourceCode") or ""),
            resource_name=str(payload.get("resourceName") or ""),
            resource_type=_read_optional_string(payload.get("resourceType")),
            model_name=_read_optional_string(payload.get("modelName")),
            voice_code=_read_optional_string(payload.get("voiceCode")),
            language_code=_read_optional_string(payload.get("languageCode")),
            extra_auth=_read_mapping(payload.get("extraAuth")),
            resource_settings=_read_mapping(payload.get("resourceSettings")),
            runtime_settings=_read_mapping(payload.get("runtimeSettings")),
        )


def _read_optional_string(value: Any) -> str | None:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return None


def _read_mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _read_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "y", "yes"}
    if isinstance(value, (int, float)):
        return bool(value)
    return False
