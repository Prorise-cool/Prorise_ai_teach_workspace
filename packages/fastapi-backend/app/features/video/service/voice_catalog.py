"""视频音色目录服务。"""

from __future__ import annotations

from dataclasses import dataclass

from app.features.video.models.voice import VideoVoiceListPayload, VideoVoiceOption
from app.providers.runtime_config_service import ProviderRuntimeResolver


@dataclass(slots=True)
class VideoVoiceCatalogService:
    """视频音色目录查询服务。"""

    resolver: ProviderRuntimeResolver

    async def list_voices(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
    ) -> VideoVoiceListPayload:
        """查询当前可用的 TTS 音色列表。"""
        descriptors = await self.resolver.resolve_video_tts_voices(
            access_token=access_token,
            client_id=client_id,
        )
        voices = [
            VideoVoiceOption(
                voice_code=descriptor.voice_code,
                voice_name=descriptor.voice_name,
                provider_id=descriptor.provider_id,
                provider_name=descriptor.provider_name,
                resource_code=descriptor.resource_code,
                language_code=descriptor.language_code,
                is_default=descriptor.is_default,
            )
            for descriptor in descriptors
        ]
        return VideoVoiceListPayload(voices=voices)
