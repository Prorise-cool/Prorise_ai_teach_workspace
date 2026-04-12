"""VideoService 基类——初始化与构建方法。

提供 ``VideoService`` 的 ``__init__``、类常量、``bootstrap_status`` 与
``build_task_request`` 等基础设施方法。
"""
from __future__ import annotations

from datetime import datetime

from app.core.logging import get_logger
from app.features.video.long_term.service import VideoArtifactIndexService, VideoPublicationService
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.schemas import VideoBootstrapResponse, VideoTaskMetadataCreateRequest
from app.shared.task_framework.status import TaskStatus
from app.shared.task_metadata import TaskType
from app.shared.task_metadata_service import BaseTaskMetadataService

logger = get_logger("app.features.video.service")


class BaseServiceMixin(BaseTaskMetadataService):
    """混入类：VideoService 初始化与构建方法。"""

    _RESOURCE = "video-task"
    _LIST_ENDPOINT = "/video/task/list"
    _WRITE_ENDPOINT = "/video/task"
    _TASK_TYPE = TaskType.VIDEO

    def __init__(
        self,
        repository=None,
        client_factory=None,
        *,
        asset_store: LocalAssetStore | None = None,
        publication_service: VideoPublicationService | None = None,
        artifact_index_service: VideoArtifactIndexService | None = None,
    ) -> None:
        """初始化视频服务，注入资产存储、发布服务和产物索引服务依赖。"""
        super().__init__(repository=repository, client_factory=client_factory)
        self._asset_store = asset_store or LocalAssetStore.from_settings()
        self._publication_service = publication_service or VideoPublicationService(client_factory=self._client_factory)
        self._artifact_index_service = artifact_index_service or VideoArtifactIndexService(
            client_factory=self._client_factory
        )

    async def bootstrap_status(self) -> VideoBootstrapResponse:
        """返回视频功能域的 bootstrap 基线信息。"""
        return VideoBootstrapResponse()

    def build_task_request(
        self,
        *,
        task_id: str,
        user_id: str,
        status: TaskStatus,
        summary: str,
        result_ref: str | None = None,
        detail_ref: str | None = None,
        error_summary: str | None = None,
        source_session_id: str | None = None,
        source_artifact_ref: str | None = None,
        replay_hint: str | None = None,
        created_at: datetime | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        failed_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> VideoTaskMetadataCreateRequest:
        """根据参数构建视频任务元数据创建请求。"""
        return VideoTaskMetadataCreateRequest(
            task_id=task_id,
            user_id=user_id,
            status=status,
            summary=summary,
            result_ref=result_ref,
            detail_ref=detail_ref,
            error_summary=error_summary,
            source_session_id=source_session_id,
            source_artifact_ref=source_artifact_ref,
            replay_hint=replay_hint,
            created_at=created_at,
            started_at=started_at,
            completed_at=completed_at,
            failed_at=failed_at,
            updated_at=updated_at,
        )
