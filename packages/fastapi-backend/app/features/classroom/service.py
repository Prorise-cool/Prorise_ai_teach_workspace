"""课堂任务业务服务。"""

import logging

from app.features.classroom.schemas import ClassroomBootstrapResponse
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService

logger = logging.getLogger(__name__)


class ClassroomService(BaseTaskMetadataService):
    """课堂任务业务服务，继承 BaseTaskMetadataService。"""
    _RESOURCE = "classroom-session"
    _LIST_ENDPOINT = "/classroom/session/list"
    _WRITE_ENDPOINT = "/classroom/session"
    _TASK_TYPE = TaskType.CLASSROOM

    async def bootstrap_status(self) -> ClassroomBootstrapResponse:
        """返回课堂功能域 bootstrap 状态。"""
        return ClassroomBootstrapResponse()
