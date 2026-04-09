"""Provider 运行时配置解析服务。"""
from __future__ import annotations


from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Mapping, Sequence

from app.core.config import Settings
from app.core.errors import IntegrationError
from app.core.logging import get_logger
from app.providers.factory import ProviderFactory
from app.providers.protocols import (
    LLMProvider,
    ProviderCapability,
    ProviderConfigurationError,
    ProviderNotFoundError,
    ProviderRuntimeConfig,
    TTSProvider,
)
from app.shared.ruoyi_ai_runtime_client import RuoYiAiRuntimeBinding, RuoYiAiRuntimeClient

logger = get_logger("app.providers.runtime_config_service")


def _enum_value(val: Any) -> str:
    """从枚举或字符串中提取纯文本值。"""
    return getattr(val, "value", str(val))

_VIDEO_LLM_STAGES = (
    "understanding",
    "storyboard",
    "manim_gen",
    "manim_fix",
)
_TTS_STAGE = "tts"

_DOUBAO_TTS_PROVIDER_TYPES = frozenset({"doubao-tts", "volcengine-tts", "bytedance-tts", "doubao"})
_RUNTIME_PROVIDER_REGISTRATION_KEYS = (
    "provider_registration_id",
    "providerRegistrationId",
)


@dataclass(slots=True, frozen=True)
class TtsRuntimeVoiceDescriptor:
    """TTS 音色运行时描述信息。"""
    voice_code: str
    voice_name: str
    provider_id: str
    provider_name: str
    resource_code: str
    language_code: str | None = None
    is_default: bool = False
    priority: int = 100


@dataclass(slots=True, frozen=True)
class VideoProviderRuntimeAssembly:
    """视频流水线 Provider 运行时装配结果。"""
    llm_by_stage: Mapping[str, tuple[LLMProvider, ...]] = field(default_factory=dict)
    tts_by_stage: Mapping[str, tuple[TTSProvider, ...]] = field(default_factory=dict)
    default_llm: tuple[LLMProvider, ...] = field(default_factory=tuple)
    default_tts: tuple[TTSProvider, ...] = field(default_factory=tuple)
    source: str = "settings"

    def __post_init__(self) -> None:
        object.__setattr__(self, "llm_by_stage", MappingProxyType(dict(self.llm_by_stage)))
        object.__setattr__(self, "tts_by_stage", MappingProxyType(dict(self.tts_by_stage)))

    def llm_for(self, stage: str) -> tuple[LLMProvider, ...]:
        """获取指定阶段的 LLM Provider 链。"""
        return self.llm_by_stage.get(stage, self.default_llm)

    def tts_for(self, stage: str) -> tuple[TTSProvider, ...]:
        """获取指定阶段的 TTS Provider 链。"""
        return self.tts_by_stage.get(stage, self.default_tts)

    def provider_summary(self) -> dict[str, Any]:
        """返回 Provider 链的摘要信息。"""
        return {
            "source": self.source,
            "llm": {
                stage: [provider.provider_id for provider in providers]
                for stage, providers in self.llm_by_stage.items()
            },
            "tts": {
                stage: [provider.provider_id for provider in providers]
                for stage, providers in self.tts_by_stage.items()
            },
            "defaultLlm": [provider.provider_id for provider in self.default_llm],
            "defaultTts": [provider.provider_id for provider in self.default_tts],
        }


class ProviderRuntimeResolver:
    """根据 settings 或 RuoYi runtime 配置解析视频流水线 Provider 链。"""

    def __init__(
        self,
        *,
        settings: Settings | Any,
        provider_factory: ProviderFactory,
        ruoyi_runtime_client: RuoYiAiRuntimeClient | None = None,
    ) -> None:
        """初始化运行时配置解析器。"""
        self._settings = settings
        self._provider_factory = provider_factory
        self._ruoyi_runtime_client = ruoyi_runtime_client or RuoYiAiRuntimeClient()

    async def resolve_video_pipeline(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> VideoProviderRuntimeAssembly:
        """解析视频流水线 Provider 配置。"""
        fallback = self._build_from_settings()
        runtime_source = _enum_value(getattr(self._settings, "provider_runtime_source", "settings")).lower()
        logger.info(
            "resolve_video_pipeline called  source=%s  has_token=%s  has_client_id=%s",
            runtime_source,
            access_token is not None,
            client_id is not None,
        )
        if runtime_source != "ruoyi":
            logger.info("provider_runtime_source is not 'ruoyi'; fallback to settings")
            return fallback
        if access_token is None and self._ruoyi_runtime_client.requires_explicit_request_auth():
            logger.info("Skip RuoYi provider runtime lookup without explicit request auth; fallback to settings")
            return fallback

        try:
            module = await self._ruoyi_runtime_client.get_module_runtime(
                "video",
                access_token=access_token,
                client_id=client_id,
            )
            logger.info("RuoYi runtime config response  module=%s  bindings_count=%s", module.module_code, len(module.bindings))
        except IntegrationError as exc:
            logger.warning("Resolve provider runtime from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback
        except Exception as exc:  # noqa: BLE001
            logger.warning("Resolve provider runtime from RuoYi failed unexpectedly; fallback to settings", exc_info=exc)
            return fallback

        if not module.bindings:
            logger.warning("RuoYi returned EMPTY bindings for video module; fallback to settings")
            return fallback

        try:
            return self._build_from_ruoyi(module.bindings, fallback=fallback)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Build provider runtime assembly from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback

    async def resolve_video_tts_voices(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> tuple[TtsRuntimeVoiceDescriptor, ...]:
        """解析视频可用 TTS 音色列表。"""
        fallback = self._build_tts_voice_descriptors_from_providers(self._build_from_settings().default_tts)
        if _enum_value(getattr(self._settings, "provider_runtime_source", "settings")).lower() != "ruoyi":
            return fallback
        if access_token is None and self._ruoyi_runtime_client.requires_explicit_request_auth():
            logger.info("Skip RuoYi TTS runtime lookup without explicit request auth; fallback to settings")
            return fallback

        try:
            module = await self._ruoyi_runtime_client.get_module_runtime(
                "video",
                access_token=access_token,
                client_id=client_id,
            )
        except IntegrationError as exc:
            logger.warning("Resolve TTS voices from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback
        except Exception as exc:  # noqa: BLE001
            logger.warning("Resolve TTS voices from RuoYi failed unexpectedly; fallback to settings", exc_info=exc)
            return fallback

        descriptors = self._build_tts_voice_descriptors_from_bindings(module.bindings)
        return descriptors or fallback

    def _build_from_settings(self) -> VideoProviderRuntimeAssembly:
        assembly = self._provider_factory.assemble_from_settings(self._settings)
        return VideoProviderRuntimeAssembly(
            default_llm=assembly.llm,
            default_tts=assembly.tts,
            source="settings",
        )

    def _build_from_ruoyi(
        self,
        bindings: Sequence[RuoYiAiRuntimeBinding],
        *,
        fallback: VideoProviderRuntimeAssembly,
    ) -> VideoProviderRuntimeAssembly:
        runtime_provider_factory = self._provider_factory.clone()
        llm_config_map: dict[str, list[ProviderRuntimeConfig]] = {}
        tts_config_map: dict[str, list[ProviderRuntimeConfig]] = {}

        for binding in bindings:
            if not binding.stage_code or not binding.provider_id:
                continue
            capability = ProviderCapability(binding.capability)
            config = self._build_runtime_config(binding)
            self._ensure_runtime_registration(runtime_provider_factory, capability, config, binding)

            target = llm_config_map if capability is ProviderCapability.LLM else tts_config_map
            target.setdefault(binding.stage_code, []).append(config)
            if binding.is_default:
                target.setdefault("default", []).append(config)

        llm_by_stage = {
            stage: tuple(runtime_provider_factory.build_chain(ProviderCapability.LLM, configs))
            for stage, configs in llm_config_map.items()
            if stage != "default"
        }
        tts_by_stage = {
            stage: tuple(runtime_provider_factory.build_chain(ProviderCapability.TTS, configs))
            for stage, configs in tts_config_map.items()
            if stage != "default"
        }

        default_llm = self._resolve_default_llm(
            runtime_provider_factory,
            llm_by_stage,
            llm_config_map,
            fallback.default_llm,
        )
        default_tts = self._resolve_default_tts(
            runtime_provider_factory,
            tts_by_stage,
            tts_config_map,
            fallback.default_tts,
        )

        for stage in _VIDEO_LLM_STAGES:
            llm_by_stage.setdefault(stage, default_llm)
        tts_by_stage.setdefault(_TTS_STAGE, default_tts)

        return VideoProviderRuntimeAssembly(
            llm_by_stage=llm_by_stage,
            tts_by_stage=tts_by_stage,
            default_llm=default_llm,
            default_tts=default_tts,
            source="ruoyi",
        )

    def _build_runtime_config(self, binding: RuoYiAiRuntimeBinding) -> ProviderRuntimeConfig:
        api_key = binding.api_key or binding.access_token
        settings = {
            "provider_type": binding.provider_type,
            "vendor_code": binding.vendor_code,
            "provider_code": binding.provider_code,
            "provider_name": binding.provider_name,
            "resource_code": binding.resource_code,
            "resource_name": binding.resource_name,
            "resource_type": binding.resource_type,
            "base_url": binding.endpoint_url,
            "api_key": api_key,
            "api_secret": binding.api_secret,
            "app_id": binding.app_id,
            "model_name": binding.model_name,
            "voice_code": binding.voice_code,
            "language_code": binding.language_code,
            "auth_type": binding.auth_type,
            "stage_code": binding.stage_code,
            "role_code": binding.role_code,
            "extra_auth": dict(binding.extra_auth),
            **dict(binding.resource_settings),
            **dict(binding.runtime_settings),
        }
        return ProviderRuntimeConfig(
            provider_id=binding.provider_id,
            priority=binding.priority,
            timeout_seconds=binding.timeout_seconds,
            retry_attempts=binding.retry_attempts,
            health_source=binding.health_source,
            settings=settings,
        )

    def _ensure_runtime_registration(
        self,
        provider_factory: ProviderFactory,
        capability: ProviderCapability,
        config: ProviderRuntimeConfig,
        binding: RuoYiAiRuntimeBinding,
    ) -> None:
        try:
            provider_factory.registry.get_registration(capability, config.provider_id)
            return
        except ProviderNotFoundError:
            pass

        candidates = self._build_runtime_registration_candidates(capability, config, binding)

        base_registration = None
        last_error: Exception | None = None
        for candidate in candidates:
            try:
                base_registration = provider_factory.registry.get_registration(capability, candidate)
                break
            except (ProviderNotFoundError, ProviderConfigurationError) as exc:
                last_error = exc
                continue

        if base_registration is None:
            raise ProviderNotFoundError(f"未注册的 {capability.value} Provider：{config.provider_id}") from last_error

        provider_factory.registry.register(
            capability,
            config.provider_id,
            base_registration.builder,
            default_priority=config.priority,
            description=(
                f"Runtime registered {base_registration.provider_id} provider: {config.provider_id}"
            ),
        )
        return

    def _build_runtime_registration_candidates(
        self,
        capability: ProviderCapability,
        config: ProviderRuntimeConfig,
        binding: RuoYiAiRuntimeBinding,
    ) -> list[str]:
        candidates: list[str] = []
        explicit_registration_id = _read_text(
            *(config.settings.get(key) for key in _RUNTIME_PROVIDER_REGISTRATION_KEYS),
        )
        if explicit_registration_id is not None:
            candidates.append(explicit_registration_id.strip().lower())

        provider_type = _read_text(binding.provider_type, config.settings.get("provider_type")) or ""
        normalized_provider_type = provider_type.strip().lower()
        if normalized_provider_type:
            candidates.append(normalized_provider_type)
        if capability is ProviderCapability.TTS and normalized_provider_type in _DOUBAO_TTS_PROVIDER_TYPES:
            candidates.append("doubao-tts")

        unique_candidates: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            if candidate and candidate not in seen:
                unique_candidates.append(candidate)
                seen.add(candidate)
        return unique_candidates

    def _resolve_default_llm(
        self,
        provider_factory: ProviderFactory,
        llm_by_stage: Mapping[str, tuple[LLMProvider, ...]],
        llm_config_map: Mapping[str, list[ProviderRuntimeConfig]],
        fallback: tuple[LLMProvider, ...],
    ) -> tuple[LLMProvider, ...]:
        default_configs = llm_config_map.get("default")
        if default_configs:
            return tuple(provider_factory.build_chain(ProviderCapability.LLM, default_configs))
        for stage in _VIDEO_LLM_STAGES:
            providers = llm_by_stage.get(stage)
            if providers:
                return providers
        return fallback

    def _resolve_default_tts(
        self,
        provider_factory: ProviderFactory,
        tts_by_stage: Mapping[str, tuple[TTSProvider, ...]],
        tts_config_map: Mapping[str, list[ProviderRuntimeConfig]],
        fallback: tuple[TTSProvider, ...],
    ) -> tuple[TTSProvider, ...]:
        default_configs = tts_config_map.get("default")
        if default_configs:
            return tuple(provider_factory.build_chain(ProviderCapability.TTS, default_configs))
        providers = tts_by_stage.get(_TTS_STAGE)
        if providers:
            return providers
        return fallback

    def _build_tts_voice_descriptors_from_bindings(
        self,
        bindings: Sequence[RuoYiAiRuntimeBinding],
    ) -> tuple[TtsRuntimeVoiceDescriptor, ...]:
        descriptors: list[TtsRuntimeVoiceDescriptor] = []
        seen: set[tuple[str, str]] = set()

        sorted_bindings = sorted(
            bindings,
            key=lambda item: (
                item.stage_code != _TTS_STAGE,
                not item.is_default,
                item.priority,
                item.provider_id,
            ),
        )
        for binding in sorted_bindings:
            if binding.capability != ProviderCapability.TTS.value or binding.stage_code != _TTS_STAGE:
                continue

            voice_code = _read_text(
                binding.voice_code,
                binding.resource_settings.get("voice_code"),
                binding.resource_settings.get("voiceCode"),
                binding.resource_code,
            )
            provider_id = _read_text(binding.provider_id)
            if not voice_code or not provider_id:
                continue

            key = (voice_code, provider_id)
            if key in seen:
                continue
            seen.add(key)

            descriptors.append(
                TtsRuntimeVoiceDescriptor(
                    voice_code=voice_code,
                    voice_name=_read_text(binding.resource_name, voice_code) or voice_code,
                    provider_id=provider_id,
                    provider_name=_read_text(binding.provider_name, provider_id) or provider_id,
                    resource_code=_read_text(binding.resource_code, provider_id) or provider_id,
                    language_code=_read_text(
                        binding.language_code,
                        binding.resource_settings.get("language_code"),
                        binding.resource_settings.get("languageCode"),
                    ),
                    is_default=binding.is_default,
                    priority=binding.priority,
                )
            )

        return tuple(descriptors)

    def _build_tts_voice_descriptors_from_providers(
        self,
        providers: Sequence[TTSProvider],
    ) -> tuple[TtsRuntimeVoiceDescriptor, ...]:
        descriptors: list[TtsRuntimeVoiceDescriptor] = []
        for index, provider in enumerate(providers):
            settings = provider.config.settings
            provider_id = provider.provider_id
            voice_code = _read_text(settings.get("voice_code"), settings.get("voiceCode"), provider_id) or provider_id
            descriptors.append(
                TtsRuntimeVoiceDescriptor(
                    voice_code=voice_code,
                    voice_name=_read_text(settings.get("resource_name"), settings.get("resourceName"), voice_code)
                    or voice_code,
                    provider_id=provider_id,
                    provider_name=_read_text(settings.get("provider_name"), settings.get("providerName"), provider_id)
                    or provider_id,
                    resource_code=_read_text(settings.get("resource_code"), settings.get("resourceCode"), provider_id)
                    or provider_id,
                    language_code=_read_text(settings.get("language_code"), settings.get("languageCode")),
                    is_default=index == 0,
                    priority=provider.config.priority,
                )
            )
        return tuple(descriptors)


def _read_text(*values: object) -> str | None:
    for value in values:
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
    return None
