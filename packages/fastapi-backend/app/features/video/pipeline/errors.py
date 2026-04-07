"""视频流水线异常定义。

提供 ``VideoPipelineError``，携带阶段、错误码和进度信息，
供编排器统一捕获并映射为任务失败结果。
"""

from __future__ import annotations

from app.features.video.pipeline.models import VideoStage
from app.shared.task_framework.status import TaskErrorCode


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
        error_code: TaskErrorCode,
        message: str,
        progress_ratio: float = 1.0,
    ) -> None:
        super().__init__(message)
        self.stage = stage
        self.error_code = error_code
        self.progress_ratio = progress_ratio
