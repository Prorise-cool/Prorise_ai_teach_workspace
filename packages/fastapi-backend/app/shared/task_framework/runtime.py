"""任务运行态快照与记录器，捕获任务执行过程中的状态切面。"""

from dataclasses import dataclass, field
from typing import Protocol

from app.core.logging import format_trace_timestamp
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskInternalStatus, TaskStatus


@dataclass(slots=True)
class TaskRuntimeSnapshot:
    """任务运行态快照，记录某一时刻的任务状态、进度和上下文。"""
    task_id: str
    task_type: str
    request_id: str | None
    user_id: str | None
    retry_count: int
    source_module: str
    internal_status: TaskInternalStatus
    status: TaskStatus
    progress: int
    message: str
    error_code: str | None = None
    context: dict[str, object] = field(default_factory=dict)
    timestamp: str = field(default_factory=format_trace_timestamp)

    @classmethod
    def create(
        cls,
        *,
        context: TaskContext,
        internal_status: TaskInternalStatus,
        status: TaskStatus,
        progress: int,
        message: str,
        error_code: str | None = None,
        payload: dict[str, object] | None = None
    ) -> "TaskRuntimeSnapshot":
        """从 TaskContext 创建运行态快照的工厂方法。"""
        return cls(
            task_id=context.task_id,
            task_type=context.task_type,
            request_id=context.request_id,
            user_id=context.user_id,
            retry_count=context.retry_count,
            source_module=context.source_module,
            internal_status=internal_status,
            status=status,
            progress=progress,
            message=message,
            error_code=error_code,
            context=payload or {}
        )


class TaskRuntimeRecorder(Protocol):
    """任务运行态记录器协议。"""

    def record(self, snapshot: TaskRuntimeSnapshot) -> None:
        """持久化或缓存任务运行态快照。"""


class InMemoryTaskRuntimeRecorder:
    """内存运行态记录器，按 task_id 分组缓存快照，用于测试。"""

    def __init__(self) -> None:
        self._snapshots: dict[str, list[TaskRuntimeSnapshot]] = {}

    def record(self, snapshot: TaskRuntimeSnapshot) -> None:
        """缓存一条运行态快照。"""
        self._snapshots.setdefault(snapshot.task_id, []).append(snapshot)

    def replay(self, task_id: str) -> list[TaskRuntimeSnapshot]:
        """回放指定任务的所有快照。"""
        return list(self._snapshots.get(task_id, []))
