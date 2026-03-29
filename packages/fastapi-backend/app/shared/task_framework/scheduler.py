from datetime import UTC, datetime
from uuid import uuid4

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.core.sse import TaskProgressEvent
from app.infra.sse_broker import InMemorySseBroker
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus

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
    retry_count: int = 0
) -> TaskContext:
    context = TaskContext(
        task_id=generate_task_id(prefix),
        task_type=task_type,
        user_id=user_id,
        request_id=request_id,
        retry_count=retry_count
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
    def __init__(self, broker: InMemorySseBroker | None = None) -> None:
        self.broker = broker

    async def dispatch(self, task: BaseTask) -> TaskResult:
        tokens = bind_trace_context(
            request_id=task.context.request_id or EMPTY_TRACE_VALUE,
            task_id=task.context.task_id,
            error_code=EMPTY_TRACE_VALUE
        )
        try:
            logger.info("Task dispatch started task_type=%s", task.context.task_type)
            self._publish_event(
                context=task.context,
                event="progress",
                status=TaskStatus.PROCESSING,
                progress=0,
                message="任务开始执行"
            )

            result = await task.run()
            self._log_task_result(task.context, result)
            self._publish_event(
                context=task.context,
                event=self._event_name_for_status(result.status),
                status=result.status,
                progress=100 if result.status == TaskStatus.COMPLETED else 0,
                message=result.message,
                error_code=result.error_code
            )
            return result
        except Exception as exc:
            error_code = getattr(exc, "error_code", None) or getattr(exc, "code", None) or "TASK_UNHANDLED_EXCEPTION"
            error_tokens = bind_trace_context(error_code=error_code)
            try:
                logger.exception("Task dispatch failed task_type=%s", task.context.task_type)
            finally:
                reset_trace_context(error_tokens)

            self._publish_event(
                context=task.context,
                event="failed",
                status=TaskStatus.FAILED,
                progress=0,
                message=str(exc) or "任务执行失败",
                error_code=error_code
            )
            return TaskResult(
                status=TaskStatus.FAILED,
                message="任务执行失败",
                error_code=error_code
            )
        finally:
            reset_trace_context(tokens)

    def _log_task_result(self, context: TaskContext, result: TaskResult) -> None:
        if result.status == TaskStatus.FAILED:
            error_tokens = bind_trace_context(error_code=result.error_code or "TASK_UNHANDLED_EXCEPTION")
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

    def _publish_event(
        self,
        *,
        context: TaskContext,
        event: str,
        status: TaskStatus,
        progress: int,
        message: str,
        error_code: str | None = None
    ) -> None:
        if self.broker is None:
            return

        self.broker.publish(
            TaskProgressEvent(
                event=event,
                task_id=context.task_id,
                task_type=context.task_type,
                status=status.value,
                progress=progress,
                message=message,
                request_id=context.request_id,
                error_code=error_code
            )
        )
        logger.info("Task SSE event published task_type=%s event=%s", context.task_type, event)

    @staticmethod
    def _event_name_for_status(status: TaskStatus) -> str:
        if status == TaskStatus.COMPLETED:
            return "completed"
        if status == TaskStatus.FAILED:
            return "failed"
        return "progress"
