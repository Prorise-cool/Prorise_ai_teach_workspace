from app.features.common import BootstrapStatus
from app.shared.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType,
)


class ClassroomBootstrapResponse(BootstrapStatus):
    feature: str = "classroom"


class ClassroomTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    task_type: str = TaskType.CLASSROOM.value


ClassroomTaskMetadataSnapshot = TaskMetadataSnapshot
ClassroomTaskMetadataPageResponse = TaskMetadataPageResponse
ClassroomTaskMetadataPreviewResponse = TaskMetadataPreviewResponse
