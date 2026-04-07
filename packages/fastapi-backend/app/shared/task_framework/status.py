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
    """统一任务错误码枚举，覆盖通用错误和视频流水线专属错误。"""
    INVALID_INPUT = "TASK_INVALID_INPUT"
    PROVIDER_UNAVAILABLE = "TASK_PROVIDER_UNAVAILABLE"
    PROVIDER_TIMEOUT = "TASK_PROVIDER_TIMEOUT"
    PROVIDER_ALL_FAILED = "TASK_PROVIDER_ALL_FAILED"
    CANCELLED = "TASK_CANCELLED"
    UNHANDLED_EXCEPTION = "TASK_UNHANDLED_EXCEPTION"
    VIDEO_INPUT_EMPTY = "VIDEO_INPUT_EMPTY"
    VIDEO_INPUT_TOO_LONG = "VIDEO_INPUT_TOO_LONG"
    VIDEO_IMAGE_FORMAT_INVALID = "VIDEO_IMAGE_FORMAT_INVALID"
    VIDEO_IMAGE_TOO_LARGE = "VIDEO_IMAGE_TOO_LARGE"
    VIDEO_IMAGE_UNREADABLE = "VIDEO_IMAGE_UNREADABLE"
    VIDEO_OCR_FAILED = "VIDEO_OCR_FAILED"
    VIDEO_OCR_EMPTY = "VIDEO_OCR_EMPTY"
    VIDEO_OCR_TIMEOUT = "VIDEO_OCR_TIMEOUT"
    VIDEO_STORAGE_FAILED = "VIDEO_STORAGE_FAILED"
    VIDEO_DISPATCH_FAILED = "VIDEO_DISPATCH_FAILED"
    VIDEO_UNDERSTANDING_FAILED = "VIDEO_UNDERSTANDING_FAILED"
    VIDEO_STORYBOARD_FAILED = "VIDEO_STORYBOARD_FAILED"
    VIDEO_MANIM_GEN_FAILED = "VIDEO_MANIM_GEN_FAILED"
    VIDEO_RENDER_FAILED = "VIDEO_RENDER_FAILED"
    VIDEO_RENDER_TIMEOUT = "VIDEO_RENDER_TIMEOUT"
    VIDEO_RENDER_OOM = "VIDEO_RENDER_OOM"
    VIDEO_RENDER_DISK_FULL = "VIDEO_RENDER_DISK_FULL"
    VIDEO_TTS_ALL_PROVIDERS_FAILED = "VIDEO_TTS_ALL_PROVIDERS_FAILED"
    VIDEO_COMPOSE_FAILED = "VIDEO_COMPOSE_FAILED"
    VIDEO_UPLOAD_FAILED = "VIDEO_UPLOAD_FAILED"
    SANDBOX_NETWORK_VIOLATION = "SANDBOX_NETWORK_VIOLATION"
    SANDBOX_FS_VIOLATION = "SANDBOX_FS_VIOLATION"
    SANDBOX_PROCESS_VIOLATION = "SANDBOX_PROCESS_VIOLATION"


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
    TaskErrorCode.VIDEO_INPUT_EMPTY: False,
    TaskErrorCode.VIDEO_INPUT_TOO_LONG: False,
    TaskErrorCode.VIDEO_IMAGE_FORMAT_INVALID: False,
    TaskErrorCode.VIDEO_IMAGE_TOO_LARGE: False,
    TaskErrorCode.VIDEO_IMAGE_UNREADABLE: False,
    TaskErrorCode.VIDEO_OCR_FAILED: False,
    TaskErrorCode.VIDEO_OCR_EMPTY: False,
    TaskErrorCode.VIDEO_OCR_TIMEOUT: True,
    TaskErrorCode.VIDEO_STORAGE_FAILED: True,
    TaskErrorCode.VIDEO_DISPATCH_FAILED: True,
    TaskErrorCode.VIDEO_UNDERSTANDING_FAILED: True,
    TaskErrorCode.VIDEO_STORYBOARD_FAILED: True,
    TaskErrorCode.VIDEO_MANIM_GEN_FAILED: True,
    TaskErrorCode.VIDEO_RENDER_FAILED: True,
    TaskErrorCode.VIDEO_RENDER_TIMEOUT: True,
    TaskErrorCode.VIDEO_RENDER_OOM: True,
    TaskErrorCode.VIDEO_RENDER_DISK_FULL: True,
    TaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED: True,
    TaskErrorCode.VIDEO_COMPOSE_FAILED: True,
    TaskErrorCode.VIDEO_UPLOAD_FAILED: True,
    TaskErrorCode.SANDBOX_NETWORK_VIOLATION: False,
    TaskErrorCode.SANDBOX_FS_VIOLATION: False,
    TaskErrorCode.SANDBOX_PROCESS_VIOLATION: False,
}


def map_internal_status(status: TaskInternalStatus | str) -> TaskStatus:
    """将内部状态映射为对外暴露的 TaskStatus。"""
    normalized_status = TaskInternalStatus(status)
    return TASK_INTERNAL_STATUS_MAPPING[normalized_status]


def is_terminal_status(status: TaskStatus | str) -> bool:
    """判断是否为终态（completed/failed/cancelled）。"""
    return TaskStatus(status) in TASK_TERMINAL_STATUSES


def is_retryable_error(code: TaskErrorCode | str) -> bool:
    """判断指定错误码是否建议重试。"""
    normalized_code = TaskErrorCode(code)
    return TASK_ERROR_RETRYABLE[normalized_code]


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
