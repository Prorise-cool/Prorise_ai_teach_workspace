"""任务框架基类模块。

定义异步任务的基础抽象 ``BaseTask`` 和任务执行结果 ``TaskResult``。
所有业务任务（视频生成、课堂分析等）均需继承 ``BaseTask`` 并实现模板方法，
由 ``TaskScheduler`` 统一调度执行。

生命周期调用时序::

    prepare()  →  run()  →  finalize(result)
                    ↓ (异常)
              handle_error(exc)  →  finalize(error_result)
"""
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
    """任务执行结果数据类。

    封装任务最终状态、进度、错误码及上下文信息，作为 ``BaseTask.run()``
    和 ``BaseTask.handle_error()`` 的标准返回值。

    Attributes:
        status: 任务终态，取值为 ``TaskStatus`` 枚举。
        message: 人类可读的结果描述。
        progress: 进度百分比 (0-100)，None 表示由调度器自动填充。
        error_code: 失败时的错误码枚举值，成功时为 None。
        context: 附加业务上下文，透传给前端或写入运行态快照。
    """

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
        """构造成功结果的便捷工厂方法。"""
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
        """构造失败结果的便捷工厂方法。"""
        return cls(
            status=TaskStatus.FAILED,
            message=message,
            progress=progress,
            error_code=error_code,
            context=context or {}
        )


@dataclass(slots=True)
class TaskLifecycleState:
    """任务生命周期幂等性保护状态。

    防止 ``prepare``、``handle_error``、``finalize`` 在同一任务实例中被重复执行，
    同时缓存对应阶段的执行结果以供后续引用。
    """

    prepared: bool = False
    error_handled: bool = False
    finalized: bool = False
    error_result: TaskResult | None = None
    finalized_result: TaskResult | None = None


class BaseTask(ABC):
    """异步任务基类（模板方法模式）。

    子类必须实现 ``run()``，可选覆盖 ``prepare()``、``handle_error()``、``finalize()``。
    调度器 ``TaskScheduler.dispatch()`` 按以下时序调用模板方法::

        1. prepare()        — 资源初始化 / 参数校验
        2. run()            — 核心业务逻辑（必须实现）
        3. finalize(result) — 清理 / 持久化

    若 ``run()`` 或 ``prepare()`` 抛出异常，调度器将调用::

        handle_error(exc)  →  finalize(error_result)

    每个模板方法在同一任务实例中最多执行一次（幂等保护）。

    Attributes:
        context: 本次任务的上下文信息（task_id、user_id、request_id 等）。
        logger: 以 ``app.tasks.<task_type>`` 为名称的日志记录器。
    """

    def __init__(self, context: TaskContext) -> None:
        """初始化任务实例，绑定上下文并创建日志记录器。"""
        self.context = context
        self.logger = get_logger(f"app.tasks.{context.task_type}")
        self._lifecycle_state = TaskLifecycleState()
        self._runtime_event_emitter: TaskRuntimeEventEmitter | None = None
        self._runtime_snapshot_emitter: TaskRuntimeSnapshotEmitter | None = None

    async def prepare(self) -> None:
        """任务准备阶段钩子（可选覆盖）。

        在 ``run()`` 之前被调度器调用，用于执行资源初始化、参数预校验等前置操作。
        默认实现为空操作。

        调用时序: 第 1 步，``run()`` 之前。
        是否必须覆盖: 否。
        异常处理: 若抛出异常，调度器跳过 ``run()``，转入 ``handle_error()``。
        """
        return None

    @abstractmethod
    async def run(self) -> TaskResult:
        """核心业务逻辑（必须覆盖）。

        实现具体的任务执行逻辑，返回 ``TaskResult`` 表示执行结果。

        调用时序: 第 2 步，``prepare()`` 成功后。
        是否必须覆盖: 是（抽象方法）。
        异常处理: 若抛出异常，调度器转入 ``handle_error()``。

        Returns:
            TaskResult: 任务执行结果，包含状态、消息和进度。
        """
        raise NotImplementedError

    async def handle_error(self, exc: Exception) -> TaskResult:
        """异常处理钩子（可选覆盖）。

        当 ``prepare()`` 或 ``run()`` 抛出异常时由调度器调用。
        默认实现从异常中提取 ``error_code`` 属性并构造失败结果。

        调用时序: ``run()`` 或 ``prepare()`` 异常后。
        是否必须覆盖: 否。子类可覆盖以实现自定义错误恢复或特殊日志记录。

        Args:
            exc: 捕获到的异常实例。

        Returns:
            TaskResult: 表示失败的结果对象。
        """
        error_code = (
            getattr(exc, "error_code", None)
            or getattr(exc, "code", None)
            or TaskErrorCode.UNHANDLED_EXCEPTION
        )
        message = str(exc) or "任务执行失败"
        return TaskResult.failed(message=message, error_code=TaskErrorCode(error_code))

    async def finalize(self, result: TaskResult) -> TaskResult:
        """任务收尾钩子（可选覆盖）。

        无论任务成功或失败，``finalize()`` 都会被调度器在最后阶段调用。
        适用于资源释放、临时文件清理、结果持久化等收尾操作。
        默认实现原样返回传入的 result。

        调用时序: 最后一步，``run()`` 或 ``handle_error()`` 之后。
        是否必须覆盖: 否。
        异常处理: 若 ``finalize()`` 自身抛出异常，调度器会再次调用
            ``handle_error()`` 并以该异常的失败结果作为最终结果。

        Args:
            result: 前置阶段产生的任务结果。

        Returns:
            TaskResult: 经过收尾处理后的最终结果（可修改后返回）。
        """
        return result

    def bind_runtime_event_emitter(self, emitter: TaskRuntimeEventEmitter | None) -> None:
        """绑定运行时 SSE 事件发射器，由调度器在 dispatch 开始时注入。"""
        self._runtime_event_emitter = emitter

    def bind_runtime_snapshot_emitter(
        self,
        emitter: TaskRuntimeSnapshotEmitter | None,
    ) -> None:
        """绑定运行时快照发射器，由调度器在 dispatch 开始时注入。"""
        self._runtime_snapshot_emitter = emitter

    async def emit_runtime_event(self, event: "TaskProgressEvent") -> "TaskProgressEvent | None":
        """向前端推送一条 SSE 进度事件。

        子类在 ``run()`` 中调用此方法以实时汇报进度。若未绑定发射器则静默返回 None。

        Args:
            event: 要发布的 ``TaskProgressEvent`` 实例。

        Returns:
            发布后的事件实例，或 None（未绑定发射器时）。
        """
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
        """写入运行态快照并可选发布 SSE 事件。

        与 ``emit_runtime_event`` 不同，本方法同时更新 Redis 运行态存储中的
        任务快照，适合需要持久化中间进度的场景。

        Args:
            internal_status: 内部状态枚举（QUEUED/RUNNING/SUCCEEDED/ERROR 等）。
            progress: 进度百分比 (0-100)。
            message: 人类可读的进度描述。
            error_code: 错误码（仅失败时提供）。
            context: 附加业务上下文。
            event: SSE 事件类型名称，None 表示仅写快照不发事件。

        Returns:
            TaskRuntimeSnapshot 实例，或 None（未绑定发射器时）。
        """
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
        """创建 Provider 故障切换事件发射回调。

        返回一个可被 ``ProviderSwitch`` 调用的异步回调函数，
        用于在 Provider failover 时自动向前端推送切换通知事件。
        """
        async def emit_switch(switch: "ProviderSwitch") -> "TaskProgressEvent | None":
            """Provider 切换回调：将切换信息转换为 SSE 事件并推送。"""
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
