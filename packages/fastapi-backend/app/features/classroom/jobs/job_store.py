"""课堂任务运行态读写工具。

Wave 1 重构：
- 旧名称 ``JobStore`` 改为 ``ClassroomRuntimeStateStore``，保留旧名作向后兼容别名。
- 缓存键前缀从 ``xm_openmaic_job_*`` 切换到 ``xm_classroom_task_*``。
- 任务持久化（``xm_classroom_session`` 表）由 ``ClassroomService.persist_task``
  负责，本类只管理 Redis 中的运行态（status / progress / 临时结果 / 错误）。

Phase 3 补强：
- 状态机的每一次 set_status/set_progress/set_result/set_error 同时把
  ``TaskRuntimeSnapshot`` 写入任务框架 store（``set_task_state``）并追加
  ``TaskProgressEvent``（``append_task_event``）。这样既维持了原 KV 协议
  供轮询回退使用，又让共享 ``get_task_events`` SSE 端点可以直接为课堂
  任务提供实时事件流，前端 ``useGenerationTask`` 统一走 SSE。
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.logging import format_trace_timestamp
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.runtime import TaskRuntimeSnapshot
from app.shared.task_framework.runtime_store import build_task_event
from app.shared.task_framework.status import (
    TaskInternalStatus,
    TaskStatus,
)

logger = logging.getLogger(__name__)

# Key templates — 全部以 xm_classroom_task_ 前缀（RuntimeStore 强制 xm_ 前缀约束）
_STATUS_KEY = "xm_classroom_task_{task_id}_status"
_PROGRESS_KEY = "xm_classroom_task_{task_id}_progress"
_RESULT_KEY = "xm_classroom_task_{task_id}_result"
_ERROR_KEY = "xm_classroom_task_{task_id}_error"
_MESSAGE_KEY = "xm_classroom_task_{task_id}_message"
_META_KEY = "xm_classroom_task_{task_id}_meta"

_DEFAULT_TTL = 24 * 60 * 60  # 24 小时

CLASSROOM_TASK_TYPE = "classroom"

# 课堂私有 status 到任务框架 status 的映射。
# 课堂状态机：pending → generating_outline → generating_scenes → ready | failed
_STATUS_MAPPING: dict[str, tuple[TaskInternalStatus, TaskStatus]] = {
    "pending": (TaskInternalStatus.QUEUED, TaskStatus.PENDING),
    "generating_outline": (TaskInternalStatus.RUNNING, TaskStatus.PROCESSING),
    "generating_scenes": (TaskInternalStatus.RUNNING, TaskStatus.PROCESSING),
    "ready": (TaskInternalStatus.SUCCEEDED, TaskStatus.COMPLETED),
    "failed": (TaskInternalStatus.ERROR, TaskStatus.FAILED),
}

# 课堂状态到对外 SSE 事件名的映射。
_EVENT_NAME_BY_STATUS: dict[str, str] = {
    "pending": "progress",
    "generating_outline": "progress",
    "generating_scenes": "progress",
    "ready": "completed",
    "failed": "failed",
}


class ClassroomRuntimeStateStore:
    """课堂任务运行态 Redis 读写器。

    Phase 3 起同时维护两套协议：
    - 原 KV 协议（``xm_classroom_task_*_status/progress/result/error/message``），
      前端 ``usePollGeneration`` 轮询回退使用。
    - 任务框架协议（``set_task_state`` + ``append_task_event``），给共享
      ``/api/v1/*/tasks/{id}/events`` SSE 端点消费。

    所有方法均为同步（``RuntimeStore`` 是同步的），在 async 路由 handler
    中如需后台执行可包一层 ``asyncio.to_thread``。
    """

    def __init__(self, runtime_store: RuntimeStore) -> None:
        self._store = runtime_store

    def create(
        self,
        task_id: str,
        *,
        user_id: str | None = None,
        request_id: str | None = None,
    ) -> None:
        """初始化任务运行态为 pending。

        Phase 3：额外把 ``userId`` / ``requestId`` 记录到 meta 里，后续
        状态切换时透传给任务框架 snapshot，确保 SSE 端点的归属校验通过。
        """
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "pending", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id), 0, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _META_KEY.format(task_id=task_id),
            {"userId": user_id, "requestId": request_id},
            ttl_seconds=_DEFAULT_TTL,
        )
        self._publish_snapshot(
            task_id,
            status_value="pending",
            progress=0,
            message="任务已创建，等待处理",
        )

    def set_status(self, task_id: str, status: str, message: str | None = None) -> None:
        """更新任务状态及可选的展示消息。"""
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), status, ttl_seconds=_DEFAULT_TTL
        )
        if message is not None:
            self._store.set_runtime_value(
                _MESSAGE_KEY.format(task_id=task_id), message, ttl_seconds=_DEFAULT_TTL
            )
        self._publish_snapshot(task_id, status_value=status, message=message)

    def set_progress(self, task_id: str, progress: int) -> None:
        """更新任务进度（0-100）。"""
        clamped = max(0, min(100, progress))
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id),
            clamped,
            ttl_seconds=_DEFAULT_TTL,
        )
        self._publish_snapshot(task_id, progress=clamped)

    def set_result(self, task_id: str, classroom: dict) -> None:
        """写入课堂结果并标记 ready / progress=100。"""
        self._store.set_runtime_value(
            _RESULT_KEY.format(task_id=task_id), classroom, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "ready", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(task_id=task_id), 100, ttl_seconds=_DEFAULT_TTL
        )
        self._publish_snapshot(
            task_id,
            status_value="ready",
            progress=100,
            message="课堂生成完成",
            result={"classroomId": classroom.get("id") if isinstance(classroom, dict) else None},
        )

    def set_error(self, task_id: str, error: str) -> None:
        """标记任务失败并记录错误信息。"""
        self._store.set_runtime_value(
            _ERROR_KEY.format(task_id=task_id), error, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(task_id=task_id), "failed", ttl_seconds=_DEFAULT_TTL
        )
        self._publish_snapshot(
            task_id,
            status_value="failed",
            message=error,
            # 用任务框架通用错误码，前端 parser 对未知错误码会丢弃 failed 事件。
            error_code="TASK_UNHANDLED_EXCEPTION",
        )

    def get_status(self, task_id: str) -> dict:
        """读取任务运行态快照。"""
        status = self._store.get_runtime_value(_STATUS_KEY.format(task_id=task_id))
        if status is None:
            return {
                "status": "pending",
                "progress": 0,
                "classroom": None,
                "error": "Task not found",
                "message": None,
            }

        progress = self._store.get_runtime_value(_PROGRESS_KEY.format(task_id=task_id)) or 0
        message = self._store.get_runtime_value(_MESSAGE_KEY.format(task_id=task_id))

        classroom = None
        error = None

        if status == "ready":
            classroom = self._store.get_runtime_value(_RESULT_KEY.format(task_id=task_id))

        if status == "failed":
            error = self._store.get_runtime_value(_ERROR_KEY.format(task_id=task_id))

        return {
            "status": status,
            "progress": int(progress),
            "classroom": classroom,
            "error": error,
            "message": message,
        }

    def exists(self, task_id: str) -> bool:
        return self._store.get_runtime_value(_STATUS_KEY.format(task_id=task_id)) is not None

    # ── 任务框架协议桥接（Phase 3 新增） ─────────────────────────────────────

    def _load_meta(self, task_id: str) -> dict[str, Any]:
        meta = self._store.get_runtime_value(_META_KEY.format(task_id=task_id))
        return dict(meta) if isinstance(meta, dict) else {}

    def _publish_snapshot(
        self,
        task_id: str,
        *,
        status_value: str | None = None,
        progress: int | None = None,
        message: str | None = None,
        error_code: str | None = None,
        result: dict[str, Any] | None = None,
    ) -> None:
        """同步把最新状态写入任务框架 store 并追加一条 SSE 事件。

        任何异常都只记 warning，不阻断 KV 协议主流程。这样即使任务框架
        侧出故障，前端仍可通过 ``usePollGeneration`` 轮询回退拿到状态。
        """
        try:
            # 合并当前 KV 值得出完整快照
            current_status = status_value or self._store.get_runtime_value(
                _STATUS_KEY.format(task_id=task_id)
            ) or "pending"
            current_progress = (
                progress if progress is not None
                else int(self._store.get_runtime_value(_PROGRESS_KEY.format(task_id=task_id)) or 0)
            )
            current_message = (
                message if message is not None
                else self._store.get_runtime_value(_MESSAGE_KEY.format(task_id=task_id))
            )
            current_status = str(current_status)

            internal_status, public_status = _STATUS_MAPPING.get(
                current_status,
                (TaskInternalStatus.RUNNING, TaskStatus.PROCESSING),
            )

            meta = self._load_meta(task_id)
            user_id = meta.get("userId") if isinstance(meta.get("userId"), str) else None
            request_id = meta.get("requestId") if isinstance(meta.get("requestId"), str) else None

            context: dict[str, Any] = {
                "classroomStatus": current_status,
                "stageLabel": current_message or "",
                "currentStage": current_status,
            }

            display_message = current_message or _default_message(current_status)
            snapshot_dict = self._store.set_task_state(
                task_id=task_id,
                task_type=CLASSROOM_TASK_TYPE,
                internal_status=internal_status,
                message=display_message,
                progress=max(0, min(100, int(current_progress))),
                request_id=request_id,
                user_id=user_id,
                error_code=error_code,
                source="classroom.runtime_state_store",
                context=context,
            )

            event_name = _EVENT_NAME_BY_STATUS.get(current_status, "progress")
            event_context: dict[str, Any] = dict(context)
            if result is not None:
                event_context["result"] = result

            snapshot = TaskRuntimeSnapshot(
                task_id=task_id,
                task_type=CLASSROOM_TASK_TYPE,
                request_id=request_id,
                user_id=user_id,
                retry_count=0,
                source_module="classroom.runtime_state_store",
                internal_status=internal_status,
                status=public_status,
                progress=int(snapshot_dict.get("progress") or 0),
                message=str(snapshot_dict.get("message") or display_message),
                error_code=error_code,
                context=event_context,
                timestamp=str(snapshot_dict.get("updatedAt") or format_trace_timestamp()),
            )

            self._store.append_task_event(
                task_id,
                build_task_event(
                    event=event_name,
                    snapshot=snapshot,
                    context=event_context,
                ),
            )
        except Exception as exc:  # noqa: BLE001
            # 任务框架写入失败不应阻断主状态机。
            logger.warning(
                "classroom.runtime_state_store.publish_snapshot_failed task_id=%s error=%s",
                task_id, exc,
            )


def _default_message(status_value: str) -> str:
    return {
        "pending": "任务已创建，等待处理",
        "generating_outline": "生成大纲中…",
        "generating_scenes": "生成场景中…",
        "ready": "课堂生成完成",
        "failed": "课堂生成失败",
    }.get(status_value, status_value)


# 向后兼容别名（旧 OpenMAIC 代码的 ``JobStore`` 引用）
JobStore = ClassroomRuntimeStateStore
