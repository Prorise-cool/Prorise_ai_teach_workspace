from datetime import UTC, datetime
from uuid import uuid4

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.infra.sse_broker import InMemorySseBroker
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.publisher import (
    BrokerTaskEventPublisher,
    TaskDispatchEvent,
    TaskEventPublisher
)
from app.shared.task_framework.runtime import TaskRuntimeRecorder, TaskRuntimeSnapshot
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    map_internal_status
)

logger = get_logger("app.task.scheduler")


def generate_task_id(prefix: str) -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid4().hex[:8]
    return f"{prefix}_{timestamp}_{short_uuid}"


def create_task_context(
    *,
    prefix: str,
    task_type: str,
    user_id: str | None = None,
    request_id: str | None = None,
    retry_count: int = 0,
    source_module: str = "shared"
) -> TaskContext:
    context = TaskContext(
        task_id=generate_task_id(prefix),
        task_type=task_type,
        user_id=user_id,
        request_id=request_id,
        retry_count=retry_count,
        source_module=source_module
    )
    tokens = bind_trace_context(
        request_id=context.request_id or EMPTY_TRACE_VALUE,
        task_id=context.task_id,
        error_code=EMPTY_TRACE_VALUE
    )
    try:
        logger.info("Task context created task_type=%s", context.task_type)
        return context
    finally:
        reset_trace_context(tokens)


class TaskScheduler:
    def __init__(
        self,
        broker: InMemorySseBroker | None = None,
        *,
        event_publisher: TaskEventPublisher | None = None,
        runtime_recorder: TaskRuntimeRecorder | None = None
    ) -> None:
        self.broker = broker
        self.event_publisher = event_publisher or (
            BrokerTaskEventPublisher(broker) if broker is not None else None
        )
        self.runtime_recorder = runtime_recorder

    async def dispatch(self, task: BaseTask) -> TaskResult:
        tokens = bind_trace_context(
            request_id=task.context.request_id or EMPTY_TRACE_VALUE,
            task_id=task.context.task_id,
            error_code=EMPTY_TRACE_VALUE
        )
        try:
            try:
                self._emit_snapshot(
                    context=task.context,
                    internal_status=TaskInternalStatus.QUEUED,
                    progress=0,
                    message="任务已进入调度队列"
                )
                logger.info("Task dispatch started task_type=%s", task.context.task_type)

                await task._execute_prepare()
                self._emit_snapshot(
                    context=task.context,
                    internal_status=TaskInternalStatus.RUNNING,
                    progress=0,
                    message="任务开始执行",
                    event="progress"
                )
                result = await task.run()
            except Exception as exc:
                result = await self._coerce_failure_result(task, exc)
            else:
                result = self._normalize_result(result)

            try:
                result = await task._execute_finalize(result)
            except Exception as exc:
                result = await self._coerce_failure_result(task, exc)

            result = self._normalize_result(result)
            self._log_task_result(task.context, result)
            self._emit_snapshot(
                context=task.context,
                internal_status=self._internal_status_for_result(result),
                progress=result.progress or 0,
                message=result.message,
                error_code=result.error_code,
                event=self._event_name_for_status(result.status),
                payload=result.context
            )
            return result
        finally:
            reset_trace_context(tokens)

    async def _coerce_failure_result(self, task: BaseTask, exc: Exception) -> TaskResult:
        error_code = self._resolve_error_code(exc)
        error_tokens = bind_trace_context(error_code=error_code)
        try:
            logger.exception("Task dispatch failed task_type=%s", task.context.task_type)
        finally:
            reset_trace_context(error_tokens)

        try:
            result = await task._execute_handle_error(exc)
        except Exception:
            logger.exception("Task error handler failed task_type=%s", task.context.task_type)
            result = TaskResult.failed(message="任务执行失败", error_code=error_code)

        return self._normalize_result(result, fallback_error_code=error_code)

    def _emit_snapshot(
        self,
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

        if event is not None and self.event_publisher is not None:
            self.event_publisher.publish(
                TaskDispatchEvent(event=event, snapshot=snapshot, context=payload or {})
            )
            logger.info("Task event published task_type=%s event=%s", context.task_type, event)

        return snapshot

    def _log_task_result(self, context: TaskContext, result: TaskResult) -> None:
        if result.status == TaskStatus.FAILED:
            error_tokens = bind_trace_context(
                error_code=result.error_code or TaskErrorCode.UNHANDLED_EXCEPTION
            )
            try:
                logger.error(
                    "Task dispatch finished task_type=%s status=%s",
                    context.task_type,
                    result.status.value
                )
            finally:
                reset_trace_context(error_tokens)
            return

        logger.info(
            "Task dispatch finished task_type=%s status=%s",
            context.task_type,
            result.status.value
        )

    @staticmethod
    def _normalize_result(
        result: TaskResult,
        *,
        fallback_error_code: TaskErrorCode | None = None
    ) -> TaskResult:
        progress = result.progress
        if progress is None:
            progress = 100 if result.status == TaskStatus.COMPLETED else 0

        error_code = result.error_code
        if result.status == TaskStatus.FAILED and error_code is None:
            error_code = fallback_error_code or TaskErrorCode.UNHANDLED_EXCEPTION

        return TaskResult(
            status=TaskStatus(result.status),
            message=result.message,
            progress=progress,
            error_code=error_code,
            context=dict(result.context)
        )

    @staticmethod
    def _resolve_error_code(exc: Exception) -> TaskErrorCode:
        raw_error_code = (
            getattr(exc, "error_code", None)
            or getattr(exc, "code", None)
            or TaskErrorCode.UNHANDLED_EXCEPTION
        )
        return TaskErrorCode(raw_error_code)

    @staticmethod
    def _internal_status_for_result(result: TaskResult) -> TaskInternalStatus:
        if result.status == TaskStatus.COMPLETED:
            return TaskInternalStatus.SUCCEEDED
        if result.status == TaskStatus.CANCELLED:
            return TaskInternalStatus.CANCELLED
        if result.status == TaskStatus.FAILED:
            return TaskInternalStatus.ERROR
        return TaskInternalStatus.RUNNING

    @staticmethod
    def _event_name_for_status(status: TaskStatus) -> str:
        if status == TaskStatus.COMPLETED:
            return "completed"
        if status == TaskStatus.FAILED:
            return "failed"
        return "progress"
