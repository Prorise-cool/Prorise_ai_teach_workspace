"""任务元数据 RuoYi 持久化服务基类，统一管理任务的创建、更新、查询与会话回放。"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from app.shared.ruoyi.client import RuoYiClient
from app.shared.ruoyi.mapper import RUOYI_DATETIME_FORMAT
from app.shared.ruoyi.service_mixin import RuoYiServiceMixin
from app.shared.task_framework.status import TaskStatus
from app.shared.task.metadata import (
    TASK_METADATA_RUOYI_MAPPER,
    TaskMetadataCreateRequest,
    TaskMetadataPageResponse,
    TaskMetadataPreviewResponse,
    TaskMetadataRepository,
    TaskMetadataSnapshot,
    TaskType,
    snapshot_from_ruoyi_row,
)

if TYPE_CHECKING:
    from app.core.security import AccessContext
    from app.shared.ruoyi.auth import RuoYiRequestAuth


class BaseTaskMetadataService(RuoYiServiceMixin):
    """任务元数据持久化服务基类，子类需指定 _RESOURCE、_LIST_ENDPOINT 等类属性。"""
    _REPLAY_PAGE_SIZE = 100
    _RESOURCE: str
    _LIST_ENDPOINT: str
    _WRITE_ENDPOINT: str
    _TASK_TYPE: TaskType

    def __init__(
        self,
        repository: TaskMetadataRepository | None = None,
        client_factory=None,
    ) -> None:
        """初始化服务，可注入内存仓库和 RuoYi 客户端工厂。"""
        self._repository = repository
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def persist_task(
        self,
        request: TaskMetadataCreateRequest,
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> TaskMetadataPreviewResponse:
        """将任务元数据持久化到 RuoYi，自动判断新建或更新。

        Args:
            request: 任务元数据创建请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
            existing_row = await self._query_existing_row(client, request.task_id)
            existing_snapshot = (
                self._snapshot_from_ruoyi_row(
                    existing_row,
                    operation="query-by-task-id",
                    endpoint=self._LIST_ENDPOINT,
                )
                if existing_row is not None
                else None
            )
            snapshot = self._build_snapshot(request, existing_snapshot)
            ruoyi_payload = snapshot.to_ruoyi_payload()
            if existing_row is None:
                await client.post_ack(
                    self._WRITE_ENDPOINT,
                    resource=self._RESOURCE,
                    operation="create",
                    json_body=ruoyi_payload,
                    retry_enabled=False,
                )
            else:
                await client.put_ack(
                    self._WRITE_ENDPOINT,
                    resource=self._RESOURCE,
                    operation="update",
                    json_body={"id": existing_row["id"], **ruoyi_payload},
                    retry_enabled=False,
                )
        return TaskMetadataPreviewResponse(table_name=snapshot.table_name, task=snapshot, ruoyi_payload=ruoyi_payload)

    async def get_task(
        self,
        task_id: str,
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> TaskMetadataSnapshot | None:
        """按 task_id 查询单条任务元数据。

        Args:
            task_id: 任务唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
            row = await self._query_existing_row(client, task_id)
        return (
            self._snapshot_from_ruoyi_row(
                row,
                operation="query-by-task-id",
                endpoint=self._LIST_ENDPOINT,
            )
            if row is not None
            else None
        )

    async def list_tasks(
        self,
        *,
        status: TaskStatus | None = None,
        user_id: str | None = None,
        source_session_id: str | None = None,
        updated_from: datetime | None = None,
        updated_to: datetime | None = None,
        page_num: int = 1,
        page_size: int = 10,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> TaskMetadataPageResponse:
        """分页查询任务元数据列表。

        Args:
            status: 按任务状态过滤。
            user_id: 按用户 ID 过滤。
            source_session_id: 按来源会话 ID 过滤。
            updated_from: 更新时间范围起始。
            updated_to: 更新时间范围结束。
            page_num: 页码。
            page_size: 每页条数。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        async with self._resolve_authenticated_factory(access_context, request_auth=request_auth)() as client:
            result = await client.get_page(
                self._LIST_ENDPOINT,
                resource=self._RESOURCE,
                operation="page",
                params={
                    "taskState": status.value if status is not None else None,
                    "userId": user_id,
                    "sourceSessionId": source_session_id,
                    "params[beginUpdateTime]": self._format_query_datetime(updated_from),
                    "params[endUpdateTime]": self._format_query_datetime(updated_to),
                    "pageNum": page_num,
                    "pageSize": page_size,
                },
                mapper=TASK_METADATA_RUOYI_MAPPER,
            )
        rows = [
            self._snapshot_from_ruoyi_row(row, operation="page", endpoint=self._LIST_ENDPOINT)
            for row in result.rows
        ]
        return TaskMetadataPageResponse(rows=rows, total=result.total)

    async def replay_session(
        self,
        session_id: str,
        *,
        access_context: "AccessContext | None" = None,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> TaskMetadataPageResponse:
        """按会话 ID 回放所有关联任务，自动分页遍历。

        Args:
            session_id: 会话唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
            request_auth: 可选的显式请求鉴权信息，适用于 worker 等非路由上下文。
        """
        rows: list[TaskMetadataSnapshot] = []
        page_num = 1
        total = 0
        while True:
            page = await self.list_tasks(
                source_session_id=session_id,
                page_num=page_num,
                page_size=self._REPLAY_PAGE_SIZE,
                access_context=access_context,
                request_auth=request_auth,
            )
            total = page.total
            rows.extend(page.rows)
            if len(rows) >= total or not page.rows:
                break
            page_num += 1
        return TaskMetadataPageResponse(rows=rows, total=total)

    def _create_repository(self) -> TaskMetadataRepository:
        return TaskMetadataRepository()

    def _build_snapshot(
        self,
        request: TaskMetadataCreateRequest,
        existing: TaskMetadataSnapshot | None,
    ) -> TaskMetadataSnapshot:
        repository = self._repository or self._create_repository()
        if existing is not None:
            repository.upsert_snapshot(existing)
        return repository.build_snapshot(request, default_task_type=self._TASK_TYPE)

    async def _query_existing_row(self, client: RuoYiClient, task_id: str) -> dict | None:
        result = await client.get_page(
            self._LIST_ENDPOINT,
            resource=self._RESOURCE,
            operation="query-by-task-id",
            params={"taskId": task_id, "pageNum": 1, "pageSize": 1},
        )
        rows = result.raw.get("rows", [])
        return rows[0] if rows else None

    def _snapshot_from_ruoyi_row(
        self,
        row: dict,
        *,
        operation: str,
        endpoint: str,
    ) -> TaskMetadataSnapshot:
        try:
            return snapshot_from_ruoyi_row(row, expected_task_type=self._TASK_TYPE)
        except ValueError as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    @staticmethod
    def _format_query_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.strftime(RUOYI_DATETIME_FORMAT)
