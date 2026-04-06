from app.features.video.schemas import VideoBootstrapResponse
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService


class VideoService(BaseTaskMetadataService):
    _RESOURCE = "video-task"
    _LIST_ENDPOINT = "/video/task/list"
    _WRITE_ENDPOINT = "/video/task"
    _TASK_TYPE = TaskType.VIDEO

    async def bootstrap_status(self) -> VideoBootstrapResponse:
        return VideoBootstrapResponse()
