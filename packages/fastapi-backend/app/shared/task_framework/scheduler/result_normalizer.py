"""结果归一化与错误处理。

提供 ``TaskScheduler`` 中与 ``TaskResult`` 归一化、错误码解析、
状态映射等相关的静态方法和辅助函数。
"""
from __future__ import annotations

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
)

logger = get_logger("app.task.scheduler")


class ResultNormalizerMixin:
    """混入类：结果归一化与错误处理。"""

    async def _coerce_failure_result(self: "ResultNormalizerMixin", task: BaseTask, exc: Exception) -> TaskResult:
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

    def _log_task_result(self: "ResultNormalizerMixin", context: TaskContext, result: TaskResult) -> None:
        if result.status == TaskStatus.FAILED:
            error_tokens = bind_trace_context(
                error_code=str(result.error_code or TaskErrorCode.UNHANDLED_EXCEPTION)
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
        fallback_error_code: str | None = None
    ) -> TaskResult:
        progress = result.progress
        if progress is None:
            progress = 100 if result.status == TaskStatus.COMPLETED else 0

        error_code = result.error_code
        if result.status == TaskStatus.FAILED and error_code is None:
            error_code = str(fallback_error_code or TaskErrorCode.UNHANDLED_EXCEPTION)
        elif error_code is not None:
            error_code = str(error_code)

        return TaskResult(
            status=TaskStatus(result.status),
            message=result.message,
            progress=progress,
            error_code=error_code,
            context=dict(result.context)
        )

    @staticmethod
    def _resolve_error_code(exc: Exception) -> str:
        raw_error_code = (
            getattr(exc, "error_code", None)
            or getattr(exc, "code", None)
            or TaskErrorCode.UNHANDLED_EXCEPTION
        )
        return str(raw_error_code)

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
        if status == TaskStatus.CANCELLED:
            return "cancelled"
        return "progress"
