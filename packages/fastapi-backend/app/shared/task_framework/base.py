from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import TaskErrorCode, TaskStatus


@dataclass(slots=True)
class TaskResult:
    status: TaskStatus
    message: str
    error_code: TaskErrorCode | None = None


class BaseTask(ABC):
    def __init__(self, context: TaskContext) -> None:
        self.context = context

    @abstractmethod
    async def run(self) -> TaskResult:
        raise NotImplementedError
