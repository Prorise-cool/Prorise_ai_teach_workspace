"""Story 2.1 冻结统一任务状态、内部映射与错误码字典。"""

from enum import StrEnum
from typing import Final


class TaskStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskInternalStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    RETRYING = "retrying"
    SUCCEEDED = "succeeded"
    ERROR = "error"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"


class TaskErrorCode(StrEnum):
    INVALID_INPUT = "TASK_INVALID_INPUT"
    PROVIDER_UNAVAILABLE = "TASK_PROVIDER_UNAVAILABLE"
    PROVIDER_TIMEOUT = "TASK_PROVIDER_TIMEOUT"
    PROVIDER_ALL_FAILED = "TASK_PROVIDER_ALL_FAILED"
    CANCELLED = "TASK_CANCELLED"
    UNHANDLED_EXCEPTION = "TASK_UNHANDLED_EXCEPTION"
    # OCR 域错误码 (Story 3.3)
    VIDEO_OCR_FAILED = "VIDEO_OCR_FAILED"
    VIDEO_OCR_EMPTY = "VIDEO_OCR_EMPTY"
    VIDEO_IMAGE_UNREADABLE = "VIDEO_IMAGE_UNREADABLE"
    VIDEO_FILE_TYPE_INVALID = "VIDEO_FILE_TYPE_INVALID"
    VIDEO_FILE_TOO_LARGE = "VIDEO_FILE_TOO_LARGE"
    VIDEO_STORAGE_FAILED = "VIDEO_STORAGE_FAILED"


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
    TaskErrorCode.CANCELLED: False,
    TaskErrorCode.UNHANDLED_EXCEPTION: True,
    # OCR 域错误码 (Story 3.3)
    TaskErrorCode.VIDEO_OCR_FAILED: True,
    TaskErrorCode.VIDEO_OCR_EMPTY: False,
    TaskErrorCode.VIDEO_IMAGE_UNREADABLE: False,
    TaskErrorCode.VIDEO_FILE_TYPE_INVALID: False,
    TaskErrorCode.VIDEO_FILE_TOO_LARGE: False,
    TaskErrorCode.VIDEO_STORAGE_FAILED: True,
}


def map_internal_status(status: TaskInternalStatus | str) -> TaskStatus:
    normalized_status = TaskInternalStatus(status)
    return TASK_INTERNAL_STATUS_MAPPING[normalized_status]


def is_terminal_status(status: TaskStatus | str) -> bool:
    return TaskStatus(status) in TASK_TERMINAL_STATUSES


def is_retryable_error(code: TaskErrorCode | str) -> bool:
    normalized_code = TaskErrorCode(code)
    return TASK_ERROR_RETRYABLE[normalized_code]


def coerce_task_error_code(
    code: TaskErrorCode | str | None,
    *,
    fallback: TaskErrorCode = TaskErrorCode.UNHANDLED_EXCEPTION
) -> TaskErrorCode:
    if code is None:
        return fallback
    if isinstance(code, TaskErrorCode):
        return code
    try:
        return TaskErrorCode(str(code))
    except ValueError:
        return fallback
