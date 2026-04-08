"""TTS 语音合成服务。

遍历分镜场景，逐场景调用 TTS Provider 合成旁白音频，
支持音色偏好匹配和 failover 机制。
"""

from __future__ import annotations

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

from app.core.config import Settings
from app.core.logging import get_logger
from app.features.video.pipeline._helpers import (
    coerce_float,
    coerce_int,
    probe_media_duration_seconds,
    provider_settings,
    read_mapping_value,
    read_text,
    round_duration_seconds,
)
from app.features.video.pipeline.audio import decode_audio_payload, write_silent_wav
from app.features.video.pipeline.errors import VideoPipelineError
from app.features.video.pipeline.models import (
    AudioSegment,
    Storyboard,
    TTSResult,
    VideoStage,
    VoiceConfig,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService
from app.shared.task_framework.status import TaskErrorCode

logger = get_logger("app.features.video.pipeline.tts")


@dataclass(slots=True)
class _BoundVoiceConfigProvider:
    """将 TTS provider 与自身音色配置绑定。"""

    provider: Any
    voice_config: VoiceConfig

    @property
    def provider_id(self) -> str:
        return self.provider.provider_id

    @property
    def config(self) -> Any:
        return self.provider.config

    async def synthesize(self, text: str, voice_config: Any | None = None):  # noqa: ANN401
        return await self.provider.synthesize(text, voice_config=self.voice_config)


@dataclass(slots=True)
class TTSService:
    """TTS 语音合成服务，逐场景合成旁白音频并汇总结果。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        voice_preference: Mapping[str, Any] | None = None,
        emit_switch=None,
        on_scene_completed=None,
    ) -> TTSResult:
        """执行 TTS 合成，返回 ``TTSResult``。"""
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_tts_{task_id}_"))
        selected_providers = self._select_providers(voice_preference)
        if not selected_providers:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise VideoPipelineError(
                stage=VideoStage.TTS,
                error_code=TaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED,
                message="未配置可用的 TTS Provider",
            )
        provider_voice_configs = {
            provider.provider_id: self._build_voice_config((provider,), voice_preference)
            for provider in selected_providers
        }
        primary_provider_id = selected_providers[0].provider_id
        voice_config = provider_voice_configs[primary_provider_id]
        bound_providers = tuple(
            _BoundVoiceConfigProvider(
                provider=provider,
                voice_config=provider_voice_configs[provider.provider_id],
            )
            for provider in selected_providers
        )
        self.runtime.save_value(
            "tts_selected_voice",
            {
                "voiceCode": voice_config.voice_id,
                "voiceName": read_text(
                    read_mapping_value(provider_settings(selected_providers[0]), "resource_name", "resourceName"),
                    voice_config.voice_id,
                ),
                "providerId": selected_providers[0].provider_id,
                "providerName": read_text(
                    read_mapping_value(provider_settings(selected_providers[0]), "provider_name", "providerName"),
                    selected_providers[0].provider_id,
                ),
                "resourceCode": read_text(
                    read_mapping_value(provider_settings(selected_providers[0]), "resource_code", "resourceCode"),
                    selected_providers[0].provider_id,
                ),
            },
        )
        audio_segments: list[AudioSegment] = []
        provider_used: list[str] = []
        failover_occurred = False

        for index, scene in enumerate(storyboard.scenes, start=1):
            try:
                result = await self.failover_service.synthesize(
                    bound_providers,
                    scene.narration,
                    voice_config=voice_config,
                    emit_switch=emit_switch,
                )
            except ProviderAllFailedError as exc:
                shutil.rmtree(temp_dir, ignore_errors=True)
                raise VideoPipelineError(
                    stage=VideoStage.TTS,
                    error_code=TaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED,
                    message=str(exc),
                    progress_ratio=index / max(len(storyboard.scenes), 1),
                ) from exc

            provider_used.append(result.provider)
            if result.provider != primary_provider_id:
                failover_occurred = True
            result_voice_config = provider_voice_configs.get(result.provider, voice_config)
            decoded_audio = decode_audio_payload(getattr(result, "metadata", None))
            if decoded_audio is not None:
                audio_bytes, audio_format = decoded_audio
                audio_path = temp_dir / f"{task_id}_{scene.scene_id}.{audio_format}"
                audio_path.write_bytes(audio_bytes)
            else:
                audio_format = "wav"
                audio_path = temp_dir / f"{task_id}_{scene.scene_id}.{audio_format}"
                write_silent_wav(
                    audio_path,
                    duration_seconds=max(scene.duration_hint, 1),
                    sample_rate=result_voice_config.sample_rate,
                )
                logger.warning(
                    "TTS provider returned non-audio payload; generated silent fallback track",
                    extra={
                        "taskId": task_id,
                        "sceneId": scene.scene_id,
                        "providerId": result.provider,
                    },
                )
            audio_duration_seconds = probe_media_duration_seconds(audio_path) or float(scene.duration_hint)
            audio_segments.append(
                AudioSegment(
                    scene_id=scene.scene_id,
                    audio_path=str(audio_path),
                    duration=round_duration_seconds(audio_duration_seconds),
                    format=audio_format,
                )
            )
            if on_scene_completed is not None:
                await on_scene_completed(index, len(storyboard.scenes), result.provider, failover_occurred)

        tts_result = TTSResult(
            audio_segments=audio_segments,
            total_duration=sum(segment.duration for segment in audio_segments),
            provider_used=provider_used,
            failover_occurred=failover_occurred,
        )
        self.runtime.save_model("tts_result", tts_result)
        return tts_result

    def _select_providers(self, voice_preference: Mapping[str, Any] | None) -> tuple[Any, ...]:
        """根据音色偏好筛选可用 TTS Provider。"""
        provider_chain = tuple(self.providers)
        if not provider_chain:
            return ()
        if voice_preference is None:
            return provider_chain

        requested_voice_code = read_text(
            read_mapping_value(voice_preference, "voiceCode", "voice_code"),
        )
        requested_provider_id = read_text(
            read_mapping_value(voice_preference, "providerId", "provider_id"),
        )
        matched = [
            provider
            for provider in provider_chain
            if self._matches_voice_preference(
                provider,
                requested_voice_code=requested_voice_code,
                requested_provider_id=requested_provider_id,
            )
        ]
        if matched:
            return tuple(matched)

        criteria = requested_voice_code or requested_provider_id or "unknown"
        raise VideoPipelineError(
            stage=VideoStage.TTS,
            error_code=TaskErrorCode.INVALID_INPUT,
            message=f"未找到可用音色配置：{criteria}",
        )

    def _matches_voice_preference(
        self,
        provider: Any,
        *,
        requested_voice_code: str | None,
        requested_provider_id: str | None,
    ) -> bool:
        """判断 provider 是否匹配用户音色偏好。"""
        settings = provider_settings(provider)
        provider_voice_code = read_text(
            read_mapping_value(settings, "voice_code", "voiceCode"),
        )
        if requested_voice_code and provider_voice_code != requested_voice_code:
            return False
        if requested_provider_id and provider.provider_id != requested_provider_id:
            return False
        return True

    def _build_voice_config(
        self,
        providers: Sequence[Any],
        voice_preference: Mapping[str, Any] | None,
    ) -> VoiceConfig:
        """构建 VoiceConfig 对象。"""
        settings = provider_settings(providers[0]) if providers else {}
        requested_voice_code = None
        if voice_preference is not None:
            requested_voice_code = read_text(
                read_mapping_value(voice_preference, "voiceCode", "voice_code"),
            )

        sample_rate = coerce_int(
            read_mapping_value(settings, "sample_rate", "sampleRate"),
            self.settings.video_output_audio_sample_rate,
        )
        bitrate = read_text(
            read_mapping_value(settings, "bitrate", "audio_bitrate", "audioBitrate"),
            self.settings.video_output_audio_bitrate,
        ) or self.settings.video_output_audio_bitrate
        return VoiceConfig(
            language=read_text(
                read_mapping_value(settings, "language_code", "languageCode"),
                "zh-CN",
            ) or "zh-CN",
            voice_id=requested_voice_code
            or read_text(read_mapping_value(settings, "voice_code", "voiceCode"), "demo-voice")
            or "demo-voice",
            speed=coerce_float(
                read_mapping_value(settings, "speed_ratio", "speedRatio", "speed"),
                1.0,
            ),
            format=read_text(
                read_mapping_value(settings, "encoding", "audio_format", "audioFormat"),
                self.settings.video_output_audio_format,
            ) or self.settings.video_output_audio_format,
            sample_rate=sample_rate,
            bitrate=bitrate,
            volume_ratio=coerce_float(
                read_mapping_value(settings, "volume_ratio", "volumeRatio"),
                1.0,
            ),
            pitch_ratio=coerce_float(
                read_mapping_value(settings, "pitch_ratio", "pitchRatio"),
                1.0,
            ),
        )
