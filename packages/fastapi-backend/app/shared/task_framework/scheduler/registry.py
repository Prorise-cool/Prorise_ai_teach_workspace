"""任务注册表、ID 生成、上下文工厂与序列化工具。

提供全局任务注册表（``_REGISTERED_TASKS``）、任务 ID 生成、
``TaskContext`` 工厂方法以及上下文序列化/反序列化函数。
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.shared.task_framework.base import BaseTask
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskStatus

logger = get_logger("app.task.scheduler")

TaskFactory = Callable[[TaskContext], BaseTask]

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
