"""视频功能域 Schema 包。

聚合原有元数据 Schema 和 Story 3.4 新增的任务创建 Schema。
"""

from app.features.common import BootstrapStatus
from app.features.video.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType,
)


class VideoBootstrapResponse(BootstrapStatus):
    feature: str = "video"


class VideoTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    task_type: str = TaskType.VIDEO.value


VideoTaskMetadataSnapshot = TaskMetadataSnapshot
VideoTaskMetadataPageResponse = TaskMetadataPageResponse
VideoTaskMetadataPreviewResponse = TaskMetadataPreviewResponse

__all__ = [
    "VideoBootstrapResponse",
    "VideoTaskMetadataCreateRequest",
    "VideoTaskMetadataSnapshot",
    "VideoTaskMetadataPageResponse",
    "VideoTaskMetadataPreviewResponse",
]
