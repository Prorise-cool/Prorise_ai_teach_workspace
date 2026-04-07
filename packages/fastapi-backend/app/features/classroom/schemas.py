"""课堂功能域请求与响应 schema。"""

from app.features.common import BootstrapStatus
from app.shared.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataSnapshot,
    TaskType,
)


class ClassroomBootstrapResponse(BootstrapStatus):
    """课堂功能域 bootstrap 状态数据。"""
    feature: str = "classroom"


class ClassroomTaskMetadataCreateRequest(TaskMetadataCreateRequest):
    """课堂任务元数据创建请求。"""
    task_type: str = TaskType.CLASSROOM.value


ClassroomTaskMetadataSnapshot = TaskMetadataSnapshot
ClassroomTaskMetadataPageResponse = TaskMetadataPageResponse
ClassroomTaskMetadataPreviewResponse = TaskMetadataPreviewResponse
