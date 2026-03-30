from app.features.common import BootstrapStatus
from app.features.video.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType
)


class VideoBootstrapResponse(BootstrapStatus):
    feature: str = "video"


class VideoTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    task_type: str = TaskType.VIDEO.value


VideoTaskMetadataSnapshot = TaskMetadataSnapshot
VideoTaskMetadataPageResponse = TaskMetadataPageResponse
VideoTaskMetadataPreviewResponse = TaskMetadataPreviewResponse
