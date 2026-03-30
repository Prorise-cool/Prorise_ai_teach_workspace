from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.core.logging import get_logger
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus


@dataclass(slots=True)
class TaskResult:
    status: TaskStatus
    message: str
    progress: int | None = None
    error_code: TaskErrorCode | None = None
    context: dict[str, object] = field(default_factory=dict)

    @classmethod
    def completed(
        cls,
        message: str,
        *,
        progress: int = 100,
        context: dict[str, object] | None = None
    ) -> "TaskResult":
        return cls(
            status=TaskStatus.COMPLETED,
            message=message,
            progress=progress,
            context=context or {}
        )

    @classmethod
    def failed(
        cls,
        message: str,
        *,
        error_code: TaskErrorCode = TaskErrorCode.UNHANDLED_EXCEPTION,
        progress: int = 0,
        context: dict[str, object] | None = None
    ) -> "TaskResult":
        return cls(
            status=TaskStatus.FAILED,
            message=message,
            progress=progress,
            error_code=error_code,
            context=context or {}
        )


@dataclass(slots=True)
class TaskLifecycleState:
    prepared: bool = False
    error_handled: bool = False
    finalized: bool = False
    error_result: TaskResult | None = None
    finalized_result: TaskResult | None = None


class BaseTask(ABC):
    def __init__(self, context: TaskContext) -> None:
        self.context = context
        self.logger = get_logger(f"app.tasks.{context.task_type}")
        self._lifecycle_state = TaskLifecycleState()

    async def prepare(self) -> None:
        return None

    @abstractmethod
    async def run(self) -> TaskResult:
        raise NotImplementedError

    async def handle_error(self, exc: Exception) -> TaskResult:
        error_code = (
            getattr(exc, "error_code", None)
            or getattr(exc, "code", None)
            or TaskErrorCode.UNHANDLED_EXCEPTION
        )
        message = str(exc) or "任务执行失败"
        return TaskResult.failed(message=message, error_code=TaskErrorCode(error_code))

    async def finalize(self, result: TaskResult) -> TaskResult:
        return result

    async def _execute_prepare(self) -> None:
        if self._lifecycle_state.prepared:
            return

        await self.prepare()
        self._lifecycle_state.prepared = True

    async def _execute_handle_error(self, exc: Exception) -> TaskResult:
        if self._lifecycle_state.error_handled:
            return self._lifecycle_state.error_result or TaskResult.failed("任务执行失败")

        result = await self.handle_error(exc)
        self._lifecycle_state.error_handled = True
        self._lifecycle_state.error_result = result
        return result

    async def _execute_finalize(self, result: TaskResult) -> TaskResult:
        if self._lifecycle_state.finalized:
            return self._lifecycle_state.finalized_result or result

        finalized_result = await self.finalize(result)
        self._lifecycle_state.finalized = True
        self._lifecycle_state.finalized_result = finalized_result
        return finalized_result
