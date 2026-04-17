"""视频任务取消服务。"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from app.core.errors import AppError
from app.core.logging import format_trace_timestamp
from app.core.security import AccessContext
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    mark_preview_status,
)
from app.infra.redis_client import RuntimeStore
from app.schemas.common import TaskSnapshotPayload
from app.shared.task_framework.runtime import TaskRuntimeSnapshot
from app.shared.task_framework.runtime_store import build_task_event
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
)

if TYPE_CHECKING:
    from app.features.video.service import VideoService


TERMINAL_TASK_STATUSES = {
    TaskStatus.COMPLETED.value,
    TaskStatus.FAILED.value,
    TaskStatus.CANCELLED.value,
}


def _as_context(payload: object) -> dict[str, Any]:
    return dict(payload) if isinstance(payload, dict) else {}


def _build_snapshot_payload(
    *,
    task_id: str,
    state: dict[str, object],
    last_event_id: str | None,
) -> TaskSnapshotPayload:
    context = _as_context(state.get("context"))
    stage = context.get("stage")
    current_stage = context.get("currentStage")
    stage_label = context.get("stageLabel")
    stage_progress = context.get("stageProgress")

    return TaskSnapshotPayload(
        task_id=task_id,
        task_type=str(state.get("taskType") or "video"),
        status=str(state.get("status") or TaskStatus.CANCELLED.value),
        progress=int(state.get("progress") or 0),
        message=str(state.get("message") or "任务已取消"),
        timestamp=str(state.get("updatedAt") or format_trace_timestamp()),
        request_id=str(state["requestId"]) if state.get("requestId") is not None else None,
        error_code=str(state["errorCode"]) if state.get("errorCode") is not None else None,
        stage=stage if isinstance(stage, str) else None,
        current_stage=(
            current_stage if isinstance(current_stage, str) else (stage if isinstance(stage, str) else None)
        ),
        stage_label=stage_label if isinstance(stage_label, str) else None,
        stage_progress=stage_progress if isinstance(stage_progress, int) else None,
        context=context,
        resume_from=last_event_id,
        last_event_id=last_event_id,
    )


async def cancel_video_task(
    task_id: str,
    *,
    runtime_store: RuntimeStore,
    access_context: AccessContext,
    service: "VideoService",
) -> TaskSnapshotPayload:
    """取消视频任务并返回最新共享任务快照。"""
    recovery_state = runtime_store.load_task_recovery_state(task_id)
    snapshot = recovery_state.snapshot
    if snapshot is None:
        raise AppError(
            code="COMMON_NOT_FOUND",
            message="未找到对应任务",
            status_code=404,
            task_id=task_id,
        )

    owner_id = snapshot.get("userId")
    if owner_id != access_context.user_id:
        raise AppError(
            code="AUTH_PERMISSION_DENIED",
            message="仅任务创建者可取消任务",
            status_code=403,
            task_id=task_id,
        )

    if str(snapshot.get("status") or "").lower() in TERMINAL_TASK_STATUSES:
        raise AppError(
            code="TASK_NOT_CANCELLABLE",
            message="当前任务已结束，不能取消",
            status_code=409,
            task_id=task_id,
        )

    runtime = VideoRuntimeStateStore(runtime_store, task_id)
    snapshot_context = _as_context(snapshot.get("context"))
    cancel_request = {
        "requestedAt": format_trace_timestamp(),
        "requestedBy": access_context.user_id,
    }
    runtime.save_value("cancel_request", cancel_request)

    updated_context = {
        **snapshot_context,
        "currentStage": snapshot_context.get("currentStage"),
        "cancelRequested": True,
    }
    updated_state = runtime_store.set_task_state(
        task_id=task_id,
        task_type="video",
        internal_status=TaskInternalStatus.CANCELLING,
        message="任务已取消",
        progress=int(snapshot.get("progress") or 0),
        request_id=str(snapshot.get("requestId") or access_context.request_id),
        user_id=access_context.user_id,
        error_code=TaskErrorCode.CANCELLED,
        source="video.cancel_task",
        context=updated_context,
    )
    preview_state = runtime.load_preview()
    if preview_state is not None and preview_state.status != TaskStatus.CANCELLED.value:
        runtime.save_preview(
            mark_preview_status(preview_state, status=TaskStatus.CANCELLED.value)
        )

    cancel_event = runtime_store.append_task_event(
        task_id,
        build_task_event(
            event="cancelled",
            snapshot=TaskRuntimeSnapshot(
                task_id=task_id,
                task_type=str(updated_state.get("taskType") or "video"),
                request_id=str(updated_state["requestId"]) if updated_state.get("requestId") is not None else None,
                user_id=str(updated_state["userId"]) if updated_state.get("userId") is not None else None,
                retry_count=0,
                source_module="video.cancel_task",
                internal_status=TaskInternalStatus.CANCELLING,
                status=TaskStatus.CANCELLED,
                progress=int(updated_state.get("progress") or 0),
                message=str(updated_state.get("message") or "任务已取消"),
                error_code=str(updated_state["errorCode"]) if updated_state.get("errorCode") is not None else None,
                context=updated_context,
                timestamp=str(updated_state.get("updatedAt") or format_trace_timestamp()),
            ),
            context=updated_context,
        ),
    )

    await service.persist_task(
        service.build_task_request(
            task_id=task_id,
            user_id=access_context.user_id,
            status=TaskStatus.CANCELLED,
            summary=str(updated_state.get("message") or "任务已取消"),
            updated_at=datetime.now(UTC),
        ),
        access_context=access_context,
    )

    return _build_snapshot_payload(
        task_id=task_id,
        state=updated_state,
        last_event_id=cancel_event.id,
    )
