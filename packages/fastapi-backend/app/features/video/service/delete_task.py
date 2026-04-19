"""视频任务删除服务（仅限终态任务）。"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.core.errors import AppError
from app.core.security import AccessContext
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.runtime_auth import delete_video_runtime_auth
from app.shared.task_framework.key_builder import build_task_events_key
from app.shared.task_framework.status import TaskStatus

if TYPE_CHECKING:
    from app.features.video.service import VideoService
    from app.infra.redis_client import RuntimeStore


TERMINAL_TASK_STATUSES = {
    TaskStatus.COMPLETED.value,
    TaskStatus.FAILED.value,
    TaskStatus.CANCELLED.value,
}

VIDEO_RUNTIME_SUFFIXES_TO_CLEAR = (
    "preview",
    "cancel_request",
    "fix_log",
    "result_detail",
    "understanding",
    "storyboard",
    "manim_code",
    "tts_result",
    "upload_result",
)


def _clear_video_runtime_state(task_id: str, runtime_store: "RuntimeStore") -> None:
    runtime = VideoRuntimeStateStore(runtime_store, task_id)
    for suffix in VIDEO_RUNTIME_SUFFIXES_TO_CLEAR:
        runtime.delete_value(suffix)
    delete_video_runtime_auth(runtime_store, task_id=task_id)
    runtime_store.delete_task_state(task_id)
    runtime_store.delete_runtime_value(build_task_events_key(task_id))


async def delete_video_task(
    task_id: str,
    *,
    runtime_store: "RuntimeStore",
    access_context: AccessContext,
    service: "VideoService",
) -> dict[str, str]:
    """删除已完成的视频任务，清理 Redis 运行时状态和数据库记录。"""
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
            message="仅任务创建者可删除任务",
            status_code=403,
            task_id=task_id,
        )

    current_status = str(snapshot.get("status") or "").lower()
    if current_status not in TERMINAL_TASK_STATUSES:
        raise AppError(
            code="TASK_NOT_DELETABLE",
            message="仅已结束的任务可删除",
            status_code=409,
            task_id=task_id,
        )

    # 先落元数据，再清理运行态，避免数据库更新失败时 Redis 已提前删除。
    await service.persist_task(
        service.build_task_request(
            task_id=task_id,
            user_id=access_context.user_id,
            status=TaskStatus.CANCELLED,
            summary="任务已删除",
            updated_at=datetime.now(UTC),
        ),
        access_context=access_context,
    )
    _clear_video_runtime_state(task_id, runtime_store)

    return {"task_id": task_id, "status": "deleted"}
