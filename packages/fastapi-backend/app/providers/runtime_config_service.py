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
    PROVIDER_ID_PATTERN,
    LLMProvider,
    ProviderCapability,
    ProviderConfigurationError,
    ProviderNotFoundError,
    ProviderRuntimeConfig,
    TTSProvider,
)
from app.shared.ruoyi.ai_runtime_client import RuoYiAiRuntimeBinding, RuoYiAiRuntimeClient

logger = get_logger("app.providers.runtime_config_service")


def _enum_value(val: Any) -> str:
    """从枚举或字符串中提取纯文本值。"""
    return getattr(val, "value", str(val))

_VIDEO_LLM_STAGES = (
    "understanding",
    "solve",
    "storyboard",
    "manim_gen",
    "render_verify",
    "render_fix",
    "manim_fix",
)
_TTS_STAGE = "tts"
_COMPANION_STAGE = "companion"

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
    # 每个 stage 的 retry_attempts（来自 xm_ai_module_binding.retry_attempts）
    # 驱动如 manim_fix 的 patch retry 次数；缺失则 fallback 到 settings 或 0
    retry_attempts_by_stage: Mapping[str, int] = field(default_factory=dict)
    # 每个 stage 的 runtime_settings（来自 xm_ai_module_binding.runtime_settings_json）
    # 驱动 pipeline 所有可调旋钮（feedbackRounds / maxFixBugTries / renderQuality 等）
    runtime_settings_by_stage: Mapping[str, Mapping[str, Any]] = field(default_factory=dict)
    source: str = "settings"

    def __post_init__(self) -> None:
        object.__setattr__(self, "llm_by_stage", MappingProxyType(dict(self.llm_by_stage)))
        object.__setattr__(self, "tts_by_stage", MappingProxyType(dict(self.tts_by_stage)))
        object.__setattr__(
            self, "retry_attempts_by_stage", MappingProxyType(dict(self.retry_attempts_by_stage))
        )
        frozen_settings = {
            stage: MappingProxyType(dict(value))
            for stage, value in self.runtime_settings_by_stage.items()
        }
        object.__setattr__(
            self, "runtime_settings_by_stage", MappingProxyType(frozen_settings)
        )

    def retry_attempts_for(self, stage: str) -> int | None:
        """获取指定 stage 的 retry_attempts；缺失返回 None 让调用方 fallback。"""
        value = self.retry_attempts_by_stage.get(stage)
        return int(value) if value is not None else None

    def runtime_settings_for(self, stage: str) -> Mapping[str, Any]:
        """获取指定 stage 的 runtime_settings；缺失返回空映射。"""
        return self.runtime_settings_by_stage.get(stage, MappingProxyType({}))

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


@dataclass(slots=True, frozen=True)
class CompanionRuntimeAssembly:
    """伴学模块 Provider 运行时装配结果。"""

    llm: tuple[LLMProvider, ...]
    context_ttl_seconds: int = 86400
    max_rounds: int = 10
    recent_rounds_to_keep: int = 3
    source: str = "settings"


@dataclass(slots=True, frozen=True)
class LearningCoachRuntimeAssembly:
    """学后陪练模块 Provider 运行时装配结果。

    只聚合 LLM 链路 —— learning_coach 不直接驱动 TTS/视觉，
    quiz/checkpoint/path/recommendation 等阶段共用同一条 LLM chain。
    """

    llm: tuple[LLMProvider, ...]
    source: str = "settings"


@dataclass(slots=True, frozen=True)
class ModuleStageRuntimeAssembly:
    """通用单阶段运行时装配结果（OpenMAIC / 其他泛用模块）。

    由 ProviderRuntimeResolver.resolve_by_module_code() 产出；按 stage_code
    过滤 xm_ai_module_binding 并组装优先级排序的 Provider 链。

    Wave 1.5: 新增 ``tts`` 字段，支持课堂 SpeechAction 预合成从
    ``capability='tts'`` 的 bindings 解析 TTS Provider 链；无 tts binding
    时 ``tts`` 为空 tuple。
    """

    llm: tuple[LLMProvider, ...]
    tts: tuple[TTSProvider, ...] = field(default_factory=tuple)
    module_code: str = ""
    stage_code: str = ""
    source: str = "settings"


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

    async def resolve_companion(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> CompanionRuntimeAssembly:
        """解析伴学模块 Provider 配置。"""
        fallback = self._build_companion_from_settings()
        runtime_source = _enum_value(getattr(self._settings, "provider_runtime_source", "settings")).lower()
        logger.info(
            "resolve_companion called  source=%s  has_token=%s",
            runtime_source,
            access_token is not None,
        )
        if runtime_source != "ruoyi":
            return fallback

        try:
            module = await self._ruoyi_runtime_client.get_module_runtime(
                "companion",
                access_token=access_token,
                client_id=client_id,
            )
            logger.info(
                "RuoYi companion runtime response  bindings_count=%s",
                len(module.bindings),
            )
        except (IntegrationError, Exception) as exc:
            logger.warning("Resolve companion runtime from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback

        if not module.bindings:
            logger.warning("RuoYi returned EMPTY bindings for companion module; fallback to settings")
            return fallback

        try:
            return self._build_companion_from_ruoyi(module.bindings, fallback=fallback)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Build companion runtime from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback

    def _build_companion_from_settings(self) -> CompanionRuntimeAssembly:
        assembly = self._provider_factory.assemble_from_settings(self._settings)
        return CompanionRuntimeAssembly(llm=assembly.llm)

    def _build_companion_from_ruoyi(
        self,
        bindings: Sequence[RuoYiAiRuntimeBinding],
        *,
        fallback: CompanionRuntimeAssembly,
    ) -> CompanionRuntimeAssembly:
        runtime_provider_factory = self._provider_factory.clone()
        llm_configs: list[ProviderRuntimeConfig] = []
        runtime_settings: dict[str, Any] = {}

        for binding in bindings:
            if not binding.stage_code or not binding.provider_id:
                continue
            try:
                capability = ProviderCapability(binding.capability)
                config = self._build_runtime_config(binding)
                self._ensure_runtime_registration(runtime_provider_factory, capability, config, binding)
            except (ProviderConfigurationError, ProviderNotFoundError, ValueError):
                continue

            if capability is ProviderCapability.LLM:
                llm_configs.append(config)

            if binding.runtime_settings:
                runtime_settings.update(dict(binding.runtime_settings))

        llm_chain = (
            tuple(runtime_provider_factory.build_chain(ProviderCapability.LLM, llm_configs))
            if llm_configs
            else fallback.llm
        )

        return CompanionRuntimeAssembly(
            llm=llm_chain,
            context_ttl_seconds=int(runtime_settings.get("context_ttl_seconds", 86400)),
            max_rounds=int(runtime_settings.get("max_rounds", 10)),
            recent_rounds_to_keep=int(runtime_settings.get("recent_rounds_to_keep", 3)),
            source="ruoyi",
        )

    async def resolve_learning_coach(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> LearningCoachRuntimeAssembly:
        """解析学后陪练模块 Provider 配置。

        模式完全对齐 resolve_companion：
        - provider_runtime_source != 'ruoyi' -> 用 settings 默认链路；
        - 无 access_token 且客户端要求显式鉴权 -> 同样走 settings；
        - 拉取 RuoYi bindings 失败或为空 -> 降级回 settings；
        - 正常情况下把所有 llm bindings 合并为一条 chain。
        """
        fallback = self._build_learning_coach_from_settings()
        runtime_source = _enum_value(getattr(self._settings, "provider_runtime_source", "settings")).lower()
        logger.info(
            "resolve_learning_coach called  source=%s  has_token=%s",
            runtime_source,
            access_token is not None,
        )
        if runtime_source != "ruoyi":
            return fallback
        if access_token is None and self._ruoyi_runtime_client.requires_explicit_request_auth():
            logger.info("Skip RuoYi learning_coach runtime lookup without explicit request auth; fallback to settings")
            return fallback

        try:
            module = await self._ruoyi_runtime_client.get_module_runtime(
                "learning_coach",
                access_token=access_token,
                client_id=client_id,
            )
            logger.info(
                "RuoYi learning_coach runtime response  bindings_count=%s",
                len(module.bindings),
            )
        except IntegrationError as exc:
            logger.warning("Resolve learning_coach runtime from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback
        except Exception as exc:  # noqa: BLE001
            logger.warning("Resolve learning_coach runtime from RuoYi failed unexpectedly; fallback to settings", exc_info=exc)
            return fallback

        if not module.bindings:
            logger.warning("RuoYi returned EMPTY bindings for learning_coach module; fallback to settings")
            return fallback

        try:
            return self._build_learning_coach_from_ruoyi(module.bindings, fallback=fallback)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Build learning_coach runtime from RuoYi failed; fallback to settings", exc_info=exc)
            return fallback

    def _build_learning_coach_from_settings(self) -> LearningCoachRuntimeAssembly:
        assembly = self._provider_factory.assemble_from_settings(self._settings)
        return LearningCoachRuntimeAssembly(llm=assembly.llm, source="settings")

    def _build_learning_coach_from_ruoyi(
        self,
        bindings: Sequence[RuoYiAiRuntimeBinding],
        *,
        fallback: LearningCoachRuntimeAssembly,
    ) -> LearningCoachRuntimeAssembly:
        runtime_provider_factory = self._provider_factory.clone()
        llm_configs: list[ProviderRuntimeConfig] = []

        for binding in bindings:
            if not binding.stage_code or not binding.provider_id:
                continue
            try:
                capability = ProviderCapability(binding.capability)
                if capability is not ProviderCapability.LLM:
                    continue
                config = self._build_runtime_config(binding)
                self._ensure_runtime_registration(runtime_provider_factory, capability, config, binding)
            except (ProviderConfigurationError, ProviderNotFoundError, ValueError) as exc:
                logger.warning(
                    "Skip invalid learning_coach binding  provider_id=%s  stage=%s  error=%s",
                    binding.provider_id, binding.stage_code, exc,
                )
                continue

            llm_configs.append(config)

        llm_chain = (
            tuple(runtime_provider_factory.build_chain(ProviderCapability.LLM, llm_configs))
            if llm_configs
            else fallback.llm
        )
        return LearningCoachRuntimeAssembly(llm=llm_chain, source="ruoyi")

    async def resolve_by_module_code(
        self,
        *,
        module_code: str,
        stage_code: str | None = None,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> ModuleStageRuntimeAssembly:
        """通用单阶段运行时链路解析（OpenMAIC / 其他模块均可用）。

        读取 xm_ai_module_binding：按 module_code 拉取所有绑定；
        若 stage_code 提供则过滤到该阶段，按 priority 升序排列组装
        LLM 与 TTS 两条 Provider 链。

        Wave 1.5 扩展：同时 assemble ``capability='tts'`` 的 bindings，
        课堂 SpeechAction 预合成改从这里取 TTS 链（fallback 里 TTS 保持
        空 tuple，由调用方决定是否回退到 settings 或前端 speechSynthesis）。

        失败或无绑定时自动降级到 settings 默认 LLM 链路。
        """
        settings_assembly = self._provider_factory.assemble_from_settings(self._settings)
        fallback_llm = tuple(settings_assembly.llm)
        fallback = ModuleStageRuntimeAssembly(
            llm=fallback_llm,
            tts=(),
            module_code=module_code,
            stage_code=stage_code or "",
            source="settings",
        )

        runtime_source = _enum_value(getattr(self._settings, "provider_runtime_source", "settings")).lower()
        logger.info(
            "resolve_by_module_code called  module=%s  stage=%s  source=%s  has_token=%s",
            module_code, stage_code, runtime_source, access_token is not None,
        )
        if runtime_source != "ruoyi":
            return fallback
        if access_token is None and self._ruoyi_runtime_client.requires_explicit_request_auth():
            logger.info(
                "Skip RuoYi %s runtime lookup without explicit request auth; fallback to settings",
                module_code,
            )
            return fallback

        try:
            module = await self._ruoyi_runtime_client.get_module_runtime(
                module_code,
                access_token=access_token,
                client_id=client_id,
            )
            logger.info(
                "RuoYi %s runtime response  bindings_count=%s",
                module_code, len(module.bindings),
            )
        except IntegrationError as exc:
            logger.warning("Resolve %s runtime from RuoYi failed; fallback to settings", module_code, exc_info=exc)
            return fallback
        except Exception as exc:  # noqa: BLE001
            logger.warning("Resolve %s runtime unexpectedly failed; fallback to settings", module_code, exc_info=exc)
            return fallback

        if not module.bindings:
            logger.warning("RuoYi returned EMPTY bindings for module=%s; fallback to settings", module_code)
            return fallback

        filtered = tuple(
            b for b in module.bindings
            if not stage_code or b.stage_code == stage_code
        )
        if not filtered:
            logger.warning(
                "No bindings match module=%s stage=%s; fallback to settings",
                module_code, stage_code,
            )
            return fallback

        try:
            runtime_provider_factory = self._provider_factory.clone()
            llm_configs: list[ProviderRuntimeConfig] = []
            tts_configs: list[ProviderRuntimeConfig] = []
            for binding in sorted(filtered, key=lambda b: (b.priority, b.provider_id)):
                if not binding.provider_id:
                    continue
                try:
                    capability = ProviderCapability(binding.capability)
                except ValueError:
                    continue
                if capability not in (ProviderCapability.LLM, ProviderCapability.TTS):
                    continue
                try:
                    config = self._build_runtime_config(binding)
                    self._ensure_runtime_registration(
                        runtime_provider_factory, capability, config, binding,
                    )
                except (ProviderConfigurationError, ProviderNotFoundError, ValueError) as exc:
                    logger.warning(
                        "Skip invalid %s binding  provider_id=%s  stage=%s  error=%s",
                        module_code, binding.provider_id, binding.stage_code, exc,
                    )
                    continue
                if capability is ProviderCapability.LLM:
                    llm_configs.append(config)
                else:
                    tts_configs.append(config)

            if not llm_configs and not tts_configs:
                return fallback
            llm_chain = (
                tuple(runtime_provider_factory.build_chain(ProviderCapability.LLM, llm_configs))
                if llm_configs
                else fallback_llm
            )
            tts_chain = (
                tuple(runtime_provider_factory.build_chain(ProviderCapability.TTS, tts_configs))
                if tts_configs
                else ()
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Build %s runtime from RuoYi failed; fallback to settings",
                module_code, exc_info=exc,
            )
            return fallback

        return ModuleStageRuntimeAssembly(
            llm=llm_chain,
            tts=tts_chain,
            module_code=module_code,
            stage_code=stage_code or "",
            source="ruoyi",
        )

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
        # stage → retry_attempts；同 stage 多条 binding 时取 is_default=Y 或最小 priority
        retry_by_stage: dict[str, tuple[int, int, int]] = {}  # (priority, is_default_score, retry_attempts)
        # stage → runtime_settings；同 stage 多条 binding 时同样按 (priority,-is_default) 排序取优胜者
        settings_by_stage: dict[str, tuple[int, int, Mapping[str, Any]]] = {}

        for binding in bindings:
            if not binding.stage_code or not binding.provider_id:
                continue

            # 记录本条 binding 的 retry_attempts / runtime_settings
            # 选优规则：priority 小者优先，同 priority 下 is_default=Y 优先
            stage_code = binding.stage_code
            priority = getattr(binding, "priority", 100) or 100
            is_default_score = 1 if getattr(binding, "is_default", False) else 0
            retry_value = int(getattr(binding, "retry_attempts", 0) or 0)
            binding_settings = dict(getattr(binding, "runtime_settings", {}) or {})

            current_retry = retry_by_stage.get(stage_code)
            if current_retry is None or (priority, -is_default_score) < (current_retry[0], -current_retry[1]):
                retry_by_stage[stage_code] = (priority, is_default_score, retry_value)
            current_settings = settings_by_stage.get(stage_code)
            if current_settings is None or (priority, -is_default_score) < (current_settings[0], -current_settings[1]):
                settings_by_stage[stage_code] = (priority, is_default_score, binding_settings)
            try:
                capability = ProviderCapability(binding.capability)
                config = self._build_runtime_config(binding)
                self._ensure_runtime_registration(runtime_provider_factory, capability, config, binding)
            except (ProviderConfigurationError, ProviderNotFoundError, ValueError) as exc:
                logger.warning(
                    "Skip invalid RuoYi binding  provider_id=%s  stage=%s  error=%s",
                    binding.provider_id, binding.stage_code, exc,
                )
                continue

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

        retry_attempts_by_stage = {
            stage: retry for stage, (_, _, retry) in retry_by_stage.items()
        }
        runtime_settings_by_stage = {
            stage: rt_settings for stage, (_, _, rt_settings) in settings_by_stage.items()
        }

        return VideoProviderRuntimeAssembly(
            llm_by_stage=llm_by_stage,
            tts_by_stage=tts_by_stage,
            default_llm=default_llm,
            default_tts=default_tts,
            retry_attempts_by_stage=retry_attempts_by_stage,
            runtime_settings_by_stage=runtime_settings_by_stage,
            source="ruoyi",
        )

    def _build_runtime_config(self, binding: RuoYiAiRuntimeBinding) -> ProviderRuntimeConfig:
        api_key = binding.api_key or binding.access_token
        # RuoYi 可能返回纯数字 provider_id（如 202604070402），需要转为合法 {vendor}-{id} 格式
        raw_pid = binding.provider_id.strip().lower()
        if raw_pid and not PROVIDER_ID_PATTERN.fullmatch(raw_pid):
            vendor = _read_text(binding.vendor_code, binding.provider_type) or "ruoyi"
            raw_pid = f"{vendor.strip().lower()}-{raw_pid}"
        provider_id = raw_pid
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
            provider_id=provider_id,
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
