"""运行时事件发布与快照发射。

提供 ``TaskScheduler`` 中与 SSE 事件发布和运行态快照写入相关的方法。
"""
from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

from app.core.logging import get_logger
from app.core.sse import TaskProgressEvent
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.publisher import (
    TaskDispatchEvent,
    TaskEventPublisher
)
from app.shared.task_framework.runtime import TaskRuntimeRecorder, TaskRuntimeSnapshot
from app.shared.task_framework.runtime_store import build_task_event
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    map_internal_status
)

if TYPE_CHECKING:
    pass

logger = get_logger("app.task.scheduler")


class RuntimeManagerMixin:
    """混入类：运行时事件发布与快照发射。"""

    # --- 由 TaskScheduler 实例提供的属性（运行时绑定） ---
    runtime_recorder: TaskRuntimeRecorder | None
    runtime_store: object  # RuntimeStore
    event_publisher: TaskEventPublisher | None

    def publish_runtime_event(self: "RuntimeManagerMixin", event: TaskProgressEvent) -> TaskProgressEvent:
        """发布运行时 SSE 事件到 broker 和 Redis 事件列表。"""
        normalized_event = event

        if self.runtime_store is not None:
            normalized_event = self.runtime_store.append_task_event(event.task_id, normalized_event)

        if self.event_publisher is not None:
            self.event_publisher.publish(normalized_event)
            logger.info(
                "Task runtime event published task_type=%s event=%s",
                normalized_event.task_type,
                normalized_event.event
            )

        return normalized_event

    def _emit_snapshot(
        self: "RuntimeManagerMixin",
        *,
        context: TaskContext,
        internal_status: TaskInternalStatus,
        progress: int,
        message: str,
        error_code: TaskErrorCode | None = None,
        event: str | None = None,
        payload: dict[str, object] | None = None
    ) -> TaskRuntimeSnapshot:
        snapshot = TaskRuntimeSnapshot.create(
            context=context,
            internal_status=internal_status,
            status=map_internal_status(internal_status),
            progress=progress,
            message=message,
            error_code=error_code,
            payload=payload
        )
        if self.runtime_recorder is not None:
            self.runtime_recorder.record(snapshot)

        if self.runtime_store is not None:
            self.runtime_store.set_task_state(
                task_id=context.task_id,
                task_type=context.task_type,
                internal_status=internal_status,
                message=message,
                progress=progress,
                request_id=context.request_id,
                user_id=context.user_id,
                error_code=error_code,
                source=context.source_module,
                context=payload
            )
            if event is not None:
                self.runtime_store.append_task_event(
                    context.task_id,
                    build_task_event(event=event, snapshot=snapshot, context=payload or {})
                )

        if event is not None and self.event_publisher is not None:
            self.event_publisher.publish(
                TaskDispatchEvent(event=event, snapshot=snapshot, context=payload or {})
            )
            logger.info("Task event published task_type=%s event=%s", context.task_type, event)

        return snapshot

    def _build_snapshot_emitter(
        self: "RuntimeManagerMixin",
        context: TaskContext,
    ) -> Callable[
        [TaskInternalStatus, int, str, TaskErrorCode | None, dict[str, object] | None, str | None],
        TaskRuntimeSnapshot,
    ]:
        def emit(
            internal_status: TaskInternalStatus,
            progress: int,
            message: str,
            error_code: TaskErrorCode | None = None,
            payload: dict[str, object] | None = None,
            event: str | None = "progress",
        ) -> TaskRuntimeSnapshot:
            """闭包：以绑定的 TaskContext 发出运行态快照。"""
            return self._emit_snapshot(
                context=context,
                internal_status=internal_status,
                progress=progress,
                message=message,
                error_code=error_code,
                event=event,
                payload=payload,
            )

        return emit
