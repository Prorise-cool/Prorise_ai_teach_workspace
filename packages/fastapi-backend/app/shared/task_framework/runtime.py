from dataclasses import dataclass, field
from typing import Protocol

from app.core.logging import format_trace_timestamp
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, TaskStatus


@dataclass(slots=True)
class TaskRuntimeSnapshot:
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
    error_code: TaskErrorCode | None = None
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
        error_code: TaskErrorCode | None = None,
        payload: dict[str, object] | None = None
    ) -> "TaskRuntimeSnapshot":
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
    def record(self, snapshot: TaskRuntimeSnapshot) -> None:
        """Persist or buffer task runtime snapshots."""


class InMemoryTaskRuntimeRecorder:
    def __init__(self) -> None:
        self._snapshots: dict[str, list[TaskRuntimeSnapshot]] = {}

    def record(self, snapshot: TaskRuntimeSnapshot) -> None:
        self._snapshots.setdefault(snapshot.task_id, []).append(snapshot)

    def replay(self, task_id: str) -> list[TaskRuntimeSnapshot]:
        return list(self._snapshots.get(task_id, []))
