"""任务调度器核心——``TaskScheduler`` 类。

统一管理任务的同步执行与异步投递，通过混入类组合运行时事件发布、
快照发射与结果归一化能力。
"""
from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.publisher import (
    BrokerTaskEventPublisher,
    TaskEventPublisher
)
from app.shared.task_framework.runtime import TaskRuntimeRecorder
from app.shared.task_framework.scheduler.registry import (
    TaskDispatchReceipt,
    _REGISTERED_TASKS,
    serialize_task_context,
)
from app.shared.task_framework.scheduler.result_normalizer import ResultNormalizerMixin
from app.shared.task_framework.scheduler.runtime_manager import RuntimeManagerMixin
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
)

if TYPE_CHECKING:
    from app.infra.redis_client import RuntimeStore
    from app.infra.sse_broker import InMemorySseBroker

logger = get_logger("app.task.scheduler")

TaskQueueDispatcher = Callable[[str, dict[str, object]], str]


class TaskScheduler(RuntimeManagerMixin, ResultNormalizerMixin):
    """任务调度器——统一管理任务的同步执行与异步投递。

    职责:
    - ``dispatch(task)``: 在当前协程中同步执行任务的完整生命周期
      (prepare -> run -> finalize)，自动处理异常、快照写入和 SSE 事件推送。
    - ``enqueue_task()``: 将任务序列化后投递到消息队列（Dramatiq），
      由 Worker 异步消费执行。

    与其他组件的关系:
    - 依赖 ``InMemorySseBroker`` 或 ``TaskEventPublisher`` 推送 SSE 事件。
    - 依赖 ``RuntimeStore`` (Redis) 持久化运行态快照。
    - 依赖 ``TaskRuntimeRecorder`` 记录运行态历史。

    Args:
        broker: SSE 事件 broker（旧版兼容，优先使用 event_publisher）。
        event_publisher: 任务事件发布器。
        runtime_recorder: 运行态快照记录器。
        runtime_store: Redis 运行态存储。
        queue_dispatcher: 消息队列投递函数（用于 enqueue_task）。
    """

    def __init__(
        self,
        broker: InMemorySseBroker | None = None,
        *,
        event_publisher: TaskEventPublisher | None = None,
        runtime_recorder: TaskRuntimeRecorder | None = None,
        runtime_store: RuntimeStore | None = None,
        queue_dispatcher: TaskQueueDispatcher | None = None
    ) -> None:
        """初始化调度器，注入 SSE broker、事件发布器、运行态记录器和消息队列分发函数。"""
        self.broker = broker
        self.event_publisher = event_publisher or (
            BrokerTaskEventPublisher(broker) if broker is not None else None
        )
        self.runtime_recorder = runtime_recorder
        self.runtime_store = runtime_store
        self.queue_dispatcher = queue_dispatcher

    async def dispatch(self, task: BaseTask, *, emit_queued_snapshot: bool = True) -> TaskResult:
        """同步调度执行一个任务的完整生命周期。

        执行流程::

            1. 绑定运行时发射器
            2. 发出 QUEUED 快照
            3. task.prepare()
            4. 发出 RUNNING 快照
            5. task.run()  -> result
            6. task.finalize(result)  -> final_result
            7. 发出终态快照 (SUCCEEDED / ERROR / CANCELLED)
            8. 解绑运行时发射器

        若 prepare/run 抛出异常，转入 handle_error -> finalize。

        Args:
            task: 已构建的任务实例。
            emit_queued_snapshot: 是否在开始时发出 QUEUED 快照。

        Returns:
            TaskResult: 经过 normalize 的最终结果。
        """
        tokens = bind_trace_context(
            request_id=task.context.request_id or EMPTY_TRACE_VALUE,
            task_id=task.context.task_id,
            error_code=EMPTY_TRACE_VALUE
        )
        try:
            task.bind_runtime_event_emitter(self.publish_runtime_event)
            task.bind_runtime_snapshot_emitter(self._build_snapshot_emitter(task.context))
            try:
                if emit_queued_snapshot:
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
            task.bind_runtime_event_emitter(None)
            task.bind_runtime_snapshot_emitter(None)
            reset_trace_context(tokens)

    def enqueue_task(self, *, task_type: str, context: TaskContext) -> TaskDispatchReceipt:
        """将任务投递到消息队列异步执行。

        投递前会写入 QUEUED 快照；投递失败时写入 ERROR 快照并抛出异常。

        Args:
            task_type: 已注册的任务类型标识。
            context: 任务上下文。

        Returns:
            TaskDispatchReceipt: 包含 message_id 的投递凭证。

        Raises:
            KeyError: task_type 未注册。
            RuntimeError: 未配置 queue_dispatcher。
        """
        if task_type not in _REGISTERED_TASKS:
            raise KeyError(f"Task type not registered: {task_type}")
        if self.queue_dispatcher is None:
            raise RuntimeError("Queue dispatcher is not configured")

        self._emit_snapshot(
            context=context,
            internal_status=TaskInternalStatus.QUEUED,
            progress=0,
            message="任务已进入调度队列"
        )

        try:
            message_id = self.queue_dispatcher(task_type, serialize_task_context(context))
        except Exception:
            self._emit_snapshot(
                context=context,
                internal_status=TaskInternalStatus.ERROR,
                progress=0,
                message="任务投递失败",
                error_code=TaskErrorCode.UNHANDLED_EXCEPTION
            )
            raise

        if self.runtime_store is not None:
            try:
                self.runtime_store.set_message_mapping(message_id, context.task_id)
            except Exception:
                logger.exception(
                    "Task message mapping persistence failed task_type=%s message_id=%s",
                    task_type,
                    message_id
                )

        logger.info("Task message enqueued task_type=%s message_id=%s", task_type, message_id)
        return TaskDispatchReceipt(
            task_id=context.task_id,
            task_type=task_type,
            message_id=message_id,
            status=TaskStatus.PENDING
        )
