"""视频功能域请求与响应 schema 定义。"""

from app.features.common import BootstrapStatus
from app.shared.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType,
)


class VideoBootstrapResponse(BootstrapStatus):
    """视频功能域 bootstrap 状态数据。"""

    feature: str = "video"


class VideoTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    """视频任务元数据创建请求。"""
    task_type: str = TaskType.VIDEO.value


VideoTaskMetadataSnapshot = TaskMetadataSnapshot
VideoTaskMetadataPageResponse = TaskMetadataPageResponse
VideoTaskMetadataPreviewResponse = TaskMetadataPreviewResponse
