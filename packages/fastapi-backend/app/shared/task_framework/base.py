from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.logging import get_logger
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus


@dataclass(slots=True)
class TaskResult:
    status: TaskStatus
    message: str
    progress: int | None = None
    error_code: TaskErrorCode | None = None


class BaseTask(ABC):
    def __init__(self, context: TaskContext) -> None:
        self.context = context
        self.logger = get_logger(f"app.tasks.{context.task_type}")

    @abstractmethod
    async def run(self) -> TaskResult:
        raise NotImplementedError
