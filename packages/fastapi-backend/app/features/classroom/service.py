from app.features.classroom.schemas import ClassroomBootstrapResponse
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService


class ClassroomService(BaseTaskMetadataService):
    _RESOURCE = "classroom-session"
    _LIST_ENDPOINT = "/classroom/session/list"
    _WRITE_ENDPOINT = "/classroom/session"
    _TASK_TYPE = TaskType.CLASSROOM

    async def bootstrap_status(self) -> ClassroomBootstrapResponse:
        return ClassroomBootstrapResponse()
