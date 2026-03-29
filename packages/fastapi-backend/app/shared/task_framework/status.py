"""Story 0.1 仅冻结中性任务占位，不提前锁定后续契约。"""

from enum import StrEnum
from typing import TypeAlias


class TaskStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


TaskErrorCode: TypeAlias = str
