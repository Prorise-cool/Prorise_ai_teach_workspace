"""视频流水线异常定义与域特定错误码。

提供 ``VideoPipelineError``，携带阶段、错误码和进度信息，
供编排器统一捕获并映射为任务失败结果。

提供 ``VideoTaskErrorCode``，包含视频流水线专属错误码，
通过注册机制与通用 ``TaskErrorCode`` 协同工作。
"""

from __future__ import annotations

from enum import StrEnum

from app.features.video.pipeline.models import VideoStage
from app.shared.task_framework.status import TaskErrorCode, register_error_retryable


class VideoTaskErrorCode(StrEnum):
    """视频流水线专属错误码。

    这些错误码从通用 ``TaskErrorCode`` 中拆出，归视频 feature 所有。
    可重试性通过 ``VIDEO_ERROR_RETRYABLE`` 注册到通用查询表。
    """
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
    VIDEO_SOLVE_FAILED = "VIDEO_SOLVE_FAILED"
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


VIDEO_ERROR_RETRYABLE: dict[VideoTaskErrorCode, bool] = {
    VideoTaskErrorCode.VIDEO_INPUT_EMPTY: False,
    VideoTaskErrorCode.VIDEO_INPUT_TOO_LONG: False,
    VideoTaskErrorCode.VIDEO_IMAGE_FORMAT_INVALID: False,
    VideoTaskErrorCode.VIDEO_IMAGE_TOO_LARGE: False,
    VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE: False,
    VideoTaskErrorCode.VIDEO_OCR_FAILED: False,
    VideoTaskErrorCode.VIDEO_OCR_EMPTY: False,
    VideoTaskErrorCode.VIDEO_OCR_TIMEOUT: True,
    VideoTaskErrorCode.VIDEO_STORAGE_FAILED: True,
    VideoTaskErrorCode.VIDEO_DISPATCH_FAILED: True,
    VideoTaskErrorCode.VIDEO_UNDERSTANDING_FAILED: True,
    VideoTaskErrorCode.VIDEO_SOLVE_FAILED: True,
    VideoTaskErrorCode.VIDEO_STORYBOARD_FAILED: True,
    VideoTaskErrorCode.VIDEO_MANIM_GEN_FAILED: True,
    VideoTaskErrorCode.VIDEO_RENDER_FAILED: True,
    VideoTaskErrorCode.VIDEO_RENDER_TIMEOUT: True,
    VideoTaskErrorCode.VIDEO_RENDER_OOM: True,
    VideoTaskErrorCode.VIDEO_RENDER_DISK_FULL: True,
    VideoTaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED: True,
    VideoTaskErrorCode.VIDEO_COMPOSE_FAILED: True,
    VideoTaskErrorCode.VIDEO_UPLOAD_FAILED: True,
    VideoTaskErrorCode.SANDBOX_NETWORK_VIOLATION: False,
    VideoTaskErrorCode.SANDBOX_FS_VIOLATION: False,
    VideoTaskErrorCode.SANDBOX_PROCESS_VIOLATION: False,
}

# 注册域特定错误码到通用查询表
for _code, _retryable in VIDEO_ERROR_RETRYABLE.items():
    register_error_retryable(_code.value, _retryable)


def coerce_video_error_code(
    code: VideoTaskErrorCode | str | None,
    *,
    fallback: VideoTaskErrorCode = VideoTaskErrorCode.VIDEO_RENDER_FAILED,
) -> VideoTaskErrorCode:
    """将错误码强制转换为 VideoTaskErrorCode 枚举，无效时返回 fallback。"""
    if code is None:
        return fallback
    if isinstance(code, VideoTaskErrorCode):
        return code
    try:
        return VideoTaskErrorCode(str(code))
    except ValueError:
        return fallback


class VideoPipelineError(Exception):
    """视频流水线阶段性异常。

    Attributes:
        stage: 发生错误的流水线阶段。
        error_code: 对应的任务错误码。
        progress_ratio: 当前阶段的进度比例 (0.0 ~ 1.0)。
    """

    def __init__(
        self,
        *,
        stage: VideoStage,
        error_code: VideoTaskErrorCode | TaskErrorCode,
        message: str,
        progress_ratio: float = 1.0,
    ) -> None:
        super().__init__(message)
        self.stage = stage
        self.error_code = error_code
        self.progress_ratio = progress_ratio
