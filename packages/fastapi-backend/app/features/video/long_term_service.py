"""视频长期记录防腐层服务。"""

from __future__ import annotations

from typing import Mapping

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.video.long_term_records import (
    VideoPublicationPage,
    VideoPublicationSnapshot,
    VideoPublicationSyncRequest,
    VideoSessionArtifactBatchCreateRequest,
    VideoSessionArtifactBatchSnapshot,
    video_publication_from_ruoyi_data,
    video_publication_to_ruoyi_payload,
    video_session_artifact_batch_from_ruoyi_data,
    video_session_artifact_batch_to_ruoyi_payload,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin


class VideoPublicationService(RuoYiServiceMixin):
    """视频公开发布记录防腐层服务。"""
    _RESOURCE = "video-publication"
    _ENDPOINT = "/internal/xiaomai/video/publications"

    def __init__(self, client_factory=None) -> None:
        """初始化服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def sync_publication(self, request: VideoPublicationSyncRequest) -> VideoPublicationSnapshot:
        """同步发布记录到 RuoYi。"""
        async with self._client_factory() as client:
            result = await client.post_single(
                self._ENDPOINT,
                resource=self._RESOURCE,
                operation="sync",
                json_body=video_publication_to_ruoyi_payload(request),
                retry_enabled=False,
            )
        return self._parse_snapshot(result.data, operation="sync", endpoint=self._ENDPOINT)

    async def get_publication(self, task_ref_id: str) -> VideoPublicationSnapshot | None:
        """按任务 ID 查询发布记录。"""
        endpoint = f"{self._ENDPOINT}/{task_ref_id}"
        try:
            async with self._client_factory() as client:
                result = await client.get_single(
                    endpoint,
                    resource=self._RESOURCE,
                    operation="get",
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return self._parse_snapshot(result.data, operation="get", endpoint=endpoint)

    async def list_publications(
        self,
        *,
        page: int = 1,
        page_size: int = 12,
    ) -> VideoPublicationPage:
        """分页查询已发布记录列表。"""
        async with self._client_factory() as client:
            result = await client.get_page(
                self._ENDPOINT,
                resource=self._RESOURCE,
                operation="page",
                params={
                    "workType": "video",
                    "isPublic": 1,
                    "status": "normal",
                    "pageNum": page,
                    "pageSize": page_size,
                },
            )

        rows = []
        for index, item in enumerate(result.rows):
            if not isinstance(item, Mapping):
                raise self._invalid_response_error(
                    operation="page",
                    endpoint=self._ENDPOINT,
                    reason=f"rows[{index}] is not an object",
                )
            rows.append(self._parse_snapshot(dict(item), operation="page", endpoint=self._ENDPOINT))
        return VideoPublicationPage(rows=rows, total=result.total)

    def _parse_snapshot(
        self,
        payload: Mapping[str, object],
        *,
        operation: str,
        endpoint: str,
    ) -> VideoPublicationSnapshot:
        try:
            return video_publication_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc


class VideoArtifactIndexService(RuoYiServiceMixin):
    """视频会话产物索引防腐层服务。"""
    _RESOURCE = "video-session-artifact"
    _ENDPOINT = "/internal/xiaomai/video/session-artifacts"

    def __init__(self, client_factory=None) -> None:
        """初始化服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def sync_artifact_batch(
        self,
        request: VideoSessionArtifactBatchCreateRequest,
    ) -> VideoSessionArtifactBatchSnapshot:
        """批量同步产物索引到 RuoYi。"""
        async with self._client_factory() as client:
            result = await client.post_single(
                self._ENDPOINT,
                resource=self._RESOURCE,
                operation="sync-batch",
                json_body=video_session_artifact_batch_to_ruoyi_payload(request),
                retry_enabled=False,
            )
        return self._parse_batch(result.data, operation="sync-batch", endpoint=self._ENDPOINT)

    def _parse_batch(
        self,
        payload: Mapping[str, object],
        *,
        operation: str,
        endpoint: str,
    ) -> VideoSessionArtifactBatchSnapshot:
        try:
            return video_session_artifact_batch_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

