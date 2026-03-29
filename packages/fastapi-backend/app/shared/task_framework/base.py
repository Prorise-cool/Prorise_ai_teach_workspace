from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.logging import get_logger
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus


@dataclass(slots=True)
class TaskResult:
    status: TaskStatus
    message: str
    # Story 0.1 只保留错误码扩展位，正式字典由 Story 2.1 冻结。
    error_code: TaskErrorCode | None = None


class BaseTask(ABC):
    def __init__(self, context: TaskContext) -> None:
        self.context = context
        self.logger = get_logger(f"app.tasks.{context.task_type}")

    @abstractmethod
    async def run(self) -> TaskResult:
        raise NotImplementedError
