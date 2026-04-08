"""任务调度器模块。

提供 ``TaskScheduler``（同步调度）、任务注册表、``TaskContext`` 序列化/反序列化
以及任务投递凭证 ``TaskDispatchReceipt`` 等核心调度基础设施。

典型使用流程::

    1. register_task(task_type, factory) — 注册任务工厂
    2. context = create_task_context(...)  — 创建上下文
    3. task = build_task(task_type, context)  — 构建任务实例
    4. result = await scheduler.dispatch(task) — 同步调度执行
       或 receipt = scheduler.enqueue_task(...)  — 投递到消息队列
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.core.sse import TaskProgressEvent
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.publisher import (
    BrokerTaskEventPublisher,
    TaskDispatchEvent,
    TaskEventPublisher
)
from app.shared.task_framework.runtime import TaskRuntimeRecorder, TaskRuntimeSnapshot
from app.shared.task_framework.runtime_store import build_task_event
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    map_internal_status
)

if TYPE_CHECKING:
    from app.infra.sse_broker import InMemorySseBroker

logger = get_logger("app.task.scheduler")

TaskFactory = Callable[[TaskContext], BaseTask]
TaskQueueDispatcher = Callable[[str, dict[str, object]], str]

_REGISTERED_TASKS: dict[str, TaskFactory] = {}


@dataclass(slots=True, frozen=True)
class TaskDispatchReceipt:
    """任务投递凭证，由 ``enqueue_task()`` 返回。

    Attributes:
        task_id: 任务 ID。
        task_type: 任务类型。
        message_id: 消息队列返回的消息标识符。
        status: 投递后的初始状态（通常为 PENDING）。
    """

    task_id: str
    task_type: str
    message_id: str
    status: TaskStatus


def generate_task_id(prefix: str) -> str:
    """生成全局唯一任务 ID，格式: ``<prefix>_<YYYYMMDDHHmmSS>_<8位uuid>``。"""
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
    """创建 ``TaskContext`` 实例并绑定日志追踪上下文。

    Args:
        prefix: 任务 ID 前缀（如 ``"video"``）。
        task_type: 任务类型标识。
        user_id: 发起用户 ID。
        request_id: 关联的 HTTP 请求 ID。
        retry_count: 重试次数。
        source_module: 来源模块。

    Returns:
        初始化完毕的 ``TaskContext`` 实例。
    """
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


def register_task(task_type: str, factory: TaskFactory) -> None:
    """将任务工厂函数注册到全局任务注册表中。"""
    _REGISTERED_TASKS[task_type] = factory


def build_task(task_type: str, context: TaskContext) -> BaseTask:
    """根据任务类型从注册表中查找工厂并创建任务实例。

    Raises:
        KeyError: 指定的 task_type 未注册。
    """
    try:
        factory = _REGISTERED_TASKS[task_type]
    except KeyError as exc:
        raise KeyError(f"Task type not registered: {task_type}") from exc
    return factory(context)


def serialize_task_context(context: TaskContext) -> dict[str, object]:
    """将 ``TaskContext`` 序列化为 camelCase 字典，用于消息队列投递。"""
    return {
        "taskId": context.task_id,
        "taskType": context.task_type,
        "userId": context.user_id,
        "requestId": context.request_id,
        "retryCount": context.retry_count,
        "sourceModule": context.source_module,
        "metadata": dict(context.metadata),
        "createdAt": context.created_at,
    }


def deserialize_task_context(payload: dict[str, object]) -> TaskContext:
    """从 camelCase 字典反序列化为 ``TaskContext`` 实例。"""
    return TaskContext(
        task_id=str(payload["taskId"]),
        task_type=str(payload["taskType"]),
        user_id=str(payload["userId"]) if payload.get("userId") is not None else None,
        request_id=str(payload["requestId"]) if payload.get("requestId") is not None else None,
        retry_count=int(payload.get("retryCount", 0)),
        source_module=str(payload.get("sourceModule", "shared")),
        metadata=dict(payload.get("metadata", {})),
        created_at=str(payload.get("createdAt")) if payload.get("createdAt") is not None else datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


class TaskScheduler:
    """任务调度器——统一管理任务的同步执行与异步投递。

    职责:
    - ``dispatch(task)``: 在当前协程中同步执行任务的完整生命周期
      (prepare → run → finalize)，自动处理异常、快照写入和 SSE 事件推送。
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
            5. task.run()  → result
            6. task.finalize(result)  → final_result
            7. 发出终态快照 (SUCCEEDED / ERROR / CANCELLED)
            8. 解绑运行时发射器

        若 prepare/run 抛出异常，转入 handle_error → finalize。

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

    def publish_runtime_event(self, event: TaskProgressEvent) -> TaskProgressEvent:
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
        self,
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
        if status == TaskStatus.CANCELLED:
            return "cancelled"
        return "progress"
