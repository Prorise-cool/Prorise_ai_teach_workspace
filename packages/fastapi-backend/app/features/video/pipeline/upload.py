"""视频上传服务。

将合成后的视频和封面文件复制到资源存储，
支持可配置的重试策略。
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import Settings
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    ComposeResult,
    UploadResult,
    VideoStage,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_datetime(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass(slots=True)
class UploadService:
    """视频上传服务，将合成产物持久化到资源存储。"""

    asset_store: LocalAssetStore
    settings: Settings
    runtime: VideoRuntimeStateStore

    async def execute(self, *, task_id: str, compose_result: ComposeResult, on_retry=None) -> UploadResult:
        """执行上传，返回 ``UploadResult``。

        Args:
            task_id: 任务 ID。
            compose_result: 合成结果，包含视频和封面路径。
            on_retry: 可选的重试回调。
        """
        attempts = max(self.settings.video_upload_retry_attempts + 1, 1)
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                video_asset = self.asset_store.copy_file(compose_result.video_path, f"video/{task_id}/output.mp4")
                cover_asset = self.asset_store.copy_file(compose_result.cover_path, f"video/{task_id}/cover.jpg")
                upload_result = UploadResult(
                    video_url=video_asset.public_url,
                    cover_url=cover_asset.public_url,
                    expires_at=_serialize_datetime(_utc_now()),
                )
                self.runtime.save_model("upload_result", upload_result)
                return upload_result
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == attempts:
                    break
                if on_retry is not None:
                    await on_retry(attempt, attempts - 1, exc)
                await asyncio.sleep(attempt)

        raise VideoPipelineError(
            stage=VideoStage.UPLOAD,
            error_code=VideoTaskErrorCode.VIDEO_UPLOAD_FAILED,
            message=str(last_error or "upload failed"),
        )
