"""流水线失败处理混入。"""

from __future__ import annotations

from app.core.logging import format_trace_timestamp, get_logger
from app.features.video.pipeline._helpers import result_storage_key, utc_now
from app.features.video.pipeline.errors import VideoPipelineError
from app.features.video.pipeline.models import (
    PublishState,
    VideoResultDetail,
)
from app.features.video.pipeline.runtime import (
    build_failure,
    build_stage_context,
    build_stage_snapshot,
)
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus

logger = get_logger("app.features.video.pipeline")


class FailureHandlerMixin:
    """处理流水线阶段性失败。"""

    async def _handle_pipeline_failure(
        self,
        context: TaskContext,
        runtime,  # VideoRuntimeStateStore
        exc: VideoPipelineError,
        *,
        request_auth=None,  # RuoYiRequestAuth | None
    ) -> "TaskResult":  # noqa: F821
        """处理流水线阶段性失败。"""
        from app.shared.task_framework.base import TaskResult

        failed_at = format_trace_timestamp()
        failure_snapshot = build_stage_snapshot(exc.stage, exc.progress_ratio)
        clamped_progress = max(self._max_emitted_progress, failure_snapshot.progress)
        failure = build_failure(
            task_id=context.task_id,
            stage=exc.stage,
            error_code=exc.error_code,
            message=str(exc),
            failed_at=failed_at,
        )
        stage_context = build_stage_context(
            exc.stage,
            exc.progress_ratio,
            extra={
                "failure": failure.model_dump(mode="json", by_alias=True),
                "failedStage": exc.stage.value,
            },
        )
        if clamped_progress != failure_snapshot.progress:
            stage_context["progress"] = clamped_progress
        detail = VideoResultDetail(
            task_id=context.task_id,
            status="failed",
            failure=failure,
            publish_state=PublishState(),
        )
        asset = self.asset_store.write_json(result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        runtime.save_value("result_detail_ref", asset.public_url)

        metadata_request = self.metadata_service.build_task_request(
            task_id=context.task_id,
            user_id=context.user_id or "anonymous",
            status=TaskStatus.FAILED,
            summary=str(exc),
            detail_ref=asset.public_url,
            error_summary=str(exc),
            failed_at=utc_now(),
            updated_at=utc_now(),
        )
        try:
            await self.metadata_service.persist_task(
                metadata_request,
                request_auth=request_auth,
            )
        except Exception:  # noqa: BLE001
            logger.warning("Persist failed video metadata degraded task_id=%s", context.task_id, exc_info=True)

        return TaskResult.failed(
            message=str(exc),
            error_code=exc.error_code,
            progress=clamped_progress,
            context=stage_context,
        )
