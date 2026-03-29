from app.features.video.schemas import (
    VideoBootstrapResponse,
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.task_metadata import TaskType, shared_task_metadata_repository
from app.shared.task_framework.status import TaskStatus
from datetime import datetime


class VideoService:
    def __init__(self, repository=None) -> None:
        self._repository = repository or shared_task_metadata_repository

    async def bootstrap_status(self) -> VideoBootstrapResponse:
        return VideoBootstrapResponse()

    def persist_task(self, request: VideoTaskMetadataCreateRequest) -> VideoTaskMetadataPreviewResponse:
        snapshot = self._repository.save_task(request, default_task_type=TaskType.VIDEO)
        return VideoTaskMetadataPreviewResponse(
            table_name=snapshot.table_name,
            task=snapshot,
            ruoyi_payload=snapshot.to_ruoyi_payload()
        )

    def get_task(self, task_id: str) -> VideoTaskMetadataSnapshot | None:
        return self._repository.get_task(task_id)

    def list_tasks(
        self,
        *,
        status: TaskStatus | None = None,
        user_id: str | None = None,
        source_session_id: str | None = None,
        updated_from: datetime | None = None,
        updated_to: datetime | None = None,
        page_num: int = 1,
        page_size: int = 10,
    ) -> VideoTaskMetadataPageResponse:
        return self._repository.page_tasks(
            task_type=TaskType.VIDEO.value,
            status=status,
            user_id=user_id,
            source_session_id=source_session_id,
            updated_from=updated_from,
            updated_to=updated_to,
            page_num=page_num,
            page_size=page_size,
        )

    def replay_session(self, session_id: str) -> VideoTaskMetadataPageResponse:
        return self._repository.replay_session(session_id)
