"""视频长期记录防腐层服务。"""

from __future__ import annotations

from typing import TYPE_CHECKING, Mapping

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.video.long_term.records import (
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

if TYPE_CHECKING:
    from app.core.security import AccessContext
    from app.shared.ruoyi_auth import RuoYiRequestAuth


class VideoPublicationService(RuoYiServiceMixin):
    """视频公开发布记录防腐层服务。"""
    _RESOURCE = "video-publication"
    _ENDPOINT = "/internal/xiaomai/video/publications"

    def __init__(self, client_factory=None) -> None:
        """初始化服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def sync_publication(
        self,
        request: VideoPublicationSyncRequest,
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> VideoPublicationSnapshot:
        """同步发布记录到 RuoYi。

        Args:
            request: 发布记录同步请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于公开列表等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
            result = await client.post_single(
                self._ENDPOINT,
                resource=self._RESOURCE,
                operation="sync",
                json_body=video_publication_to_ruoyi_payload(request),
                retry_enabled=False,
            )
        return self._parse_snapshot(result.data, operation="sync", endpoint=self._ENDPOINT)

    async def get_publication(
        self,
        task_ref_id: str,
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> VideoPublicationSnapshot | None:
        """按任务 ID 查询发布记录。

        Args:
            task_ref_id: 任务唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于公开列表等非路由上下文。
        """
        endpoint = f"{self._ENDPOINT}/{task_ref_id}"
        try:
            async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
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
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> VideoPublicationPage:
        """分页查询已发布记录列表。

        Args:
            page: 页码。
            page_size: 每页条数。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于公开列表等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
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
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> VideoSessionArtifactBatchSnapshot:
        """批量同步产物索引到 RuoYi。

        Args:
            request: 产物索引批量创建请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
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
