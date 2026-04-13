"""Story 2.1 冻结统一任务状态、内部映射与错误码字典。"""

from enum import StrEnum
from typing import Final


class TaskStatus(StrEnum):
    """对外暴露的任务状态枚举。"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskInternalStatus(StrEnum):
    """内部任务状态枚举，粒度更细，映射到对外 TaskStatus。"""
    QUEUED = "queued"
    RUNNING = "running"
    RETRYING = "retrying"
    SUCCEEDED = "succeeded"
    ERROR = "error"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"


class TaskErrorCode(StrEnum):
    """通用任务错误码枚举。

    域特定错误码（如 VIDEO_*、SANDBOX_*）定义在各自 feature 模块中，
    通过 ``register_error_retryable`` 注册可重试信息。
    """
    INVALID_INPUT = "TASK_INVALID_INPUT"
    PROVIDER_UNAVAILABLE = "TASK_PROVIDER_UNAVAILABLE"
    PROVIDER_TIMEOUT = "TASK_PROVIDER_TIMEOUT"
    PROVIDER_ALL_FAILED = "TASK_PROVIDER_ALL_FAILED"
    EXECUTION_TIMEOUT = "TASK_EXECUTION_TIMEOUT"
    CANCELLED = "TASK_CANCELLED"
    UNHANDLED_EXCEPTION = "TASK_UNHANDLED_EXCEPTION"


TASK_INTERNAL_STATUS_MAPPING: Final[dict[TaskInternalStatus, TaskStatus]] = {
    TaskInternalStatus.QUEUED: TaskStatus.PENDING,
    TaskInternalStatus.RUNNING: TaskStatus.PROCESSING,
    TaskInternalStatus.RETRYING: TaskStatus.PROCESSING,
    TaskInternalStatus.SUCCEEDED: TaskStatus.COMPLETED,
    TaskInternalStatus.ERROR: TaskStatus.FAILED,
    TaskInternalStatus.CANCELLING: TaskStatus.CANCELLED,
    TaskInternalStatus.CANCELLED: TaskStatus.CANCELLED
}

TASK_TERMINAL_STATUSES: Final[frozenset[TaskStatus]] = frozenset({
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
    TaskStatus.CANCELLED
})

TASK_ERROR_RETRYABLE: Final[dict[TaskErrorCode, bool]] = {
    TaskErrorCode.INVALID_INPUT: False,
    TaskErrorCode.PROVIDER_UNAVAILABLE: True,
    TaskErrorCode.PROVIDER_TIMEOUT: True,
    TaskErrorCode.PROVIDER_ALL_FAILED: True,
    TaskErrorCode.EXECUTION_TIMEOUT: True,
    TaskErrorCode.CANCELLED: False,
    TaskErrorCode.UNHANDLED_EXCEPTION: True,
}

# --- 域错误码注册机制 ---

_EXTRA_ERROR_RETRYABLE: dict[str, bool] = {}


def register_error_retryable(code: str, retryable: bool) -> None:
    """注册域特定错误码的可重试信息。

    供各 feature 模块在导入时调用，将域特定错误码注册到全局查询表中。
    """
    _EXTRA_ERROR_RETRYABLE[code] = retryable


def map_internal_status(status: TaskInternalStatus | str) -> TaskStatus:
    """将内部状态映射为对外暴露的 TaskStatus。"""
    normalized_status = TaskInternalStatus(status)
    return TASK_INTERNAL_STATUS_MAPPING[normalized_status]


def is_terminal_status(status: TaskStatus | str) -> bool:
    """判断是否为终态（completed/failed/cancelled）。"""
    return TaskStatus(status) in TASK_TERMINAL_STATUSES


def is_retryable_error(code: TaskErrorCode | str) -> bool:
    """判断指定错误码是否建议重试。

    先查注册的域特定错误码表，再查通用错误码表。
    """
    normalized = str(code)
    if normalized in _EXTRA_ERROR_RETRYABLE:
        return _EXTRA_ERROR_RETRYABLE[normalized]
    try:
        return TASK_ERROR_RETRYABLE[TaskErrorCode(normalized)]
    except ValueError:
        return True


def coerce_task_error_code(
    code: TaskErrorCode | str | None,
    *,
    fallback: TaskErrorCode = TaskErrorCode.UNHANDLED_EXCEPTION
) -> TaskErrorCode:
    """将错误码强制转换为 TaskErrorCode 枚举，无效时返回 fallback。"""
    if code is None:
        return fallback
    if isinstance(code, TaskErrorCode):
        return code
    try:
        return TaskErrorCode(str(code))
    except ValueError:
        return fallback
