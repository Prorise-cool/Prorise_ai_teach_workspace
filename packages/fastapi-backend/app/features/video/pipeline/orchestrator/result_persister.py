"""结果持久化混入。"""

from __future__ import annotations

from typing import Any, Mapping

from app.core.logging import format_trace_timestamp, get_logger
from app.features.video.pipeline._helpers import build_title, result_storage_key, utc_now
from app.features.video.pipeline.models import (
    PublishState,
    VideoResult,
    VideoResultDetail,
)
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus

logger = get_logger("app.features.video.pipeline")


class ResultPersisterMixin:
    """写入完成态结果与产物图谱。"""

    async def _write_completed_result(
        self,
        context: TaskContext,
        runtime,  # VideoRuntimeStateStore
        *,
        understanding,  # UnderstandingResult
        upload_result,  # UploadResult
        compose_result,  # ComposeResult
        providers: dict[str, Any],
    ) -> VideoResult:
        """写入完成态视频结果。"""
        completed_at = format_trace_timestamp()
        provider_payload = dict(providers)
        selected_voice = runtime.load_value("tts_selected_voice")
        if isinstance(selected_voice, Mapping):
            provider_payload["ttsVoice"] = dict(selected_voice)
        video_result = VideoResult(
            task_id=context.task_id,
            video_url=upload_result.video_url,
            cover_url=upload_result.cover_url,
            duration=compose_result.duration,
            summary=understanding.topic_summary,
            knowledge_points=understanding.knowledge_points,
            result_id=f"video_result_{context.task_id}",
            completed_at=completed_at,
            ai_content_flag=True,
            title=build_title(understanding.topic_summary),
            provider_used=provider_payload,
        )
        runtime.save_model("result", video_result)
        detail = VideoResultDetail(
            task_id=context.task_id,
            status="completed",
            result=video_result,
            publish_state=PublishState(),
        )
        asset = self.asset_store.write_json(result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        runtime.save_value("result_detail_ref", asset.public_url)
        return video_result

    async def _write_artifact_graph(
        self,
        runtime,  # VideoRuntimeStateStore
        *,
        context: TaskContext,
        video_result: VideoResult,
        artifact_service,  # ArtifactWritebackService
        understanding,  # UnderstandingResult
        storyboard,  # Storyboard
        tts_result,  # TTSResult
        manim_code,  # ManimCodeResult
        request_auth: RuoYiRequestAuth | None = None,
    ) -> None:
        """写入产物图谱并执行一次性元数据写回。"""
        try:
            detail_ref = runtime.load_value("result_detail_ref")
            if not isinstance(detail_ref, str):
                return
            detail = self.asset_store.read_result_detail(detail_ref)
            artifact_ref: str | None = None
            artifact_writeback_failed = False

            try:
                graph, artifact_ref = artifact_service.execute(
                    task_id=video_result.task_id,
                    understanding=understanding,
                    storyboard=storyboard,
                    tts_result=tts_result,
                    manim_code=manim_code,
                )
                runtime.save_value("artifact_ref", artifact_ref)
                try:
                    await self.metadata_service.sync_artifact_graph(
                        graph,
                        artifact_ref=artifact_ref,
                        request_auth=request_auth,
                    )
                except Exception:  # noqa: BLE001
                    artifact_writeback_failed = True
                    logger.warning(
                        "Sync video artifact graph degraded task_id=%s",
                        context.task_id,
                        exc_info=True,
                    )
            except Exception:  # noqa: BLE001
                artifact_writeback_failed = True
                logger.warning(
                    "Write video artifact graph degraded task_id=%s",
                    context.task_id,
                    exc_info=True,
                )

            completed_at = utc_now()
            metadata_request = self.metadata_service.build_task_request(
                task_id=context.task_id,
                user_id=context.user_id or "anonymous",
                status=TaskStatus.COMPLETED,
                summary=video_result.summary,
                result_ref=video_result.video_url,
                detail_ref=detail_ref,
                source_artifact_ref=artifact_ref,
                replay_hint=video_result.result_id,
                completed_at=completed_at,
                updated_at=completed_at,
            )

            long_term_failed = False
            try:
                await self.metadata_service.persist_task(
                    metadata_request,
                    request_auth=request_auth,
                )
            except Exception:  # noqa: BLE001
                long_term_failed = True
                logger.warning("Persist completed video metadata degraded task_id=%s", context.task_id, exc_info=True)

            if artifact_writeback_failed or long_term_failed:
                updated_detail = detail.model_copy(
                    update={
                        "artifact_writeback_failed": detail.artifact_writeback_failed or artifact_writeback_failed,
                        "long_term_writeback_failed": detail.long_term_writeback_failed or long_term_failed,
                    }
                )
                self.asset_store.write_json(
                    result_storage_key(video_result.task_id),
                    updated_detail.model_dump(mode="json", by_alias=True),
                )
        except Exception:  # noqa: BLE001
            logger.warning("Video post-processing writeback degraded task_id=%s", context.task_id, exc_info=True)
