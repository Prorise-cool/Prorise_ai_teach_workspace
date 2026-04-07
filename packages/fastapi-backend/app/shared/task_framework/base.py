from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from inspect import isawaitable
from typing import TYPE_CHECKING, Any, Callable

from app.core.logging import get_logger
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus

if TYPE_CHECKING:
    from app.core.sse import TaskProgressEvent
    from app.providers.failover import ProviderSwitch
    from app.shared.task_framework.runtime import TaskRuntimeSnapshot
    from app.shared.task_framework.status import TaskInternalStatus


TaskRuntimeEventEmitter = Callable[["TaskProgressEvent"], Any]
TaskRuntimeSnapshotEmitter = Callable[
    [
        "TaskInternalStatus",
        int,
        str,
        TaskErrorCode | None,
        dict[str, object] | None,
        str | None,
    ],
    "TaskRuntimeSnapshot",
]


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
        self._runtime_event_emitter: TaskRuntimeEventEmitter | None = None
        self._runtime_snapshot_emitter: TaskRuntimeSnapshotEmitter | None = None

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

    def bind_runtime_event_emitter(self, emitter: TaskRuntimeEventEmitter | None) -> None:
        self._runtime_event_emitter = emitter

    def bind_runtime_snapshot_emitter(
        self,
        emitter: TaskRuntimeSnapshotEmitter | None,
    ) -> None:
        self._runtime_snapshot_emitter = emitter

    async def emit_runtime_event(self, event: "TaskProgressEvent") -> "TaskProgressEvent | None":
        if self._runtime_event_emitter is None:
            return None

        maybe_result = self._runtime_event_emitter(event)
        if isawaitable(maybe_result):
            return await maybe_result
        return maybe_result

    async def emit_runtime_snapshot(
        self,
        *,
        internal_status: "TaskInternalStatus",
        progress: int,
        message: str,
        error_code: TaskErrorCode | None = None,
        context: dict[str, object] | None = None,
        event: str | None = "progress",
    ) -> "TaskRuntimeSnapshot | None":
        if self._runtime_snapshot_emitter is None:
            return None

        maybe_result = self._runtime_snapshot_emitter(
            internal_status,
            progress,
            message,
            error_code,
            context,
            event,
        )
        if isawaitable(maybe_result):
            return await maybe_result
        return maybe_result

    def create_provider_switch_emitter(
        self,
        *,
        status: TaskStatus | str = TaskStatus.PROCESSING,
        progress: int = 0,
        message: str = "主 Provider 不可用，已切换备用 Provider",
        stage: str | None = "provider_failover",
        extra_context: dict[str, object] | None = None
    ) -> Callable[["ProviderSwitch"], Any]:
        async def emit_switch(switch: "ProviderSwitch") -> "TaskProgressEvent | None":
            normalized_status = status.value if isinstance(status, TaskStatus) else str(status)
            merged_context = dict(switch.metadata)
            merged_context.update(extra_context or {})
            event = switch.to_sse_event(
                task_id=self.context.task_id,
                task_type=self.context.task_type,
                status=normalized_status,
                progress=progress,
                message=message,
                request_id=self.context.request_id,
            )
            if stage is not None:
                merged_context.setdefault("stage", stage)
            event = event.model_copy(
                update={
                    "context": merged_context,
                    "stage": stage,
                }
            )
            return await self.emit_runtime_event(event)

        return emit_switch

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
