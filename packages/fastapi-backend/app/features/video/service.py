from app.features.video.schemas import (
    VideoBootstrapResponse,
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.core.errors import IntegrationError
from app.features.video.task_metadata import (
    TASK_METADATA_RUOYI_MAPPER,
    TaskType,
    snapshot_from_ruoyi_row,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_mapper import RUOYI_DATETIME_FORMAT
from app.shared.task_framework.status import TaskStatus
from datetime import datetime


class VideoService:
    _REPLAY_PAGE_SIZE = 100
    _RESOURCE = "video-task"

    def __init__(self, repository=None, client_factory=None) -> None:
        self._repository = repository
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> VideoBootstrapResponse:
        return VideoBootstrapResponse()

    async def persist_task(self, request: VideoTaskMetadataCreateRequest) -> VideoTaskMetadataPreviewResponse:
        async with self._client_factory() as client:
            existing_row = await self._query_existing_row(client, request.task_id)
            existing_snapshot = (
                self._snapshot_from_ruoyi_row(
                    existing_row,
                    operation="query-by-task-id",
                    endpoint="/video/task/list"
                )
                if existing_row is not None
                else None
            )
            snapshot = self._build_snapshot(request, existing_snapshot)
            ruoyi_payload = snapshot.to_ruoyi_payload()
            if existing_row is None:
                await client.post_single(
                    "/video/task",
                    resource=self._RESOURCE,
                    operation="create",
                    json_body=ruoyi_payload,
                    retry_enabled=False
                )
            else:
                await client.put_single(
                    "/video/task",
                    resource=self._RESOURCE,
                    operation="update",
                    json_body={"id": existing_row["id"], **ruoyi_payload},
                    retry_enabled=False
                )
        return VideoTaskMetadataPreviewResponse(
            table_name=snapshot.table_name,
            task=snapshot,
            ruoyi_payload=ruoyi_payload
        )

    async def get_task(self, task_id: str) -> VideoTaskMetadataSnapshot | None:
        async with self._client_factory() as client:
            row = await self._query_existing_row(client, task_id)
        return (
            self._snapshot_from_ruoyi_row(
                row,
                operation="query-by-task-id",
                endpoint="/video/task/list"
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
    ) -> VideoTaskMetadataPageResponse:
        async with self._client_factory() as client:
            result = await client.get_page(
                "/video/task/list",
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
                mapper=TASK_METADATA_RUOYI_MAPPER
            )
        rows = [
            self._snapshot_from_ruoyi_row(row, operation="page", endpoint="/video/task/list")
            for row in result.rows
        ]
        return VideoTaskMetadataPageResponse(rows=rows, total=result.total)

    async def replay_session(self, session_id: str) -> VideoTaskMetadataPageResponse:
        rows: list[VideoTaskMetadataSnapshot] = []
        page_num = 1
        total = 0
        while True:
            page = await self.list_tasks(
                source_session_id=session_id,
                page_num=page_num,
                page_size=self._REPLAY_PAGE_SIZE,
            )
            total = page.total
            rows.extend(page.rows)
            if len(rows) >= total or not page.rows:
                break
            page_num += 1
        return VideoTaskMetadataPageResponse(rows=rows, total=total)

    def _build_snapshot(
        self,
        request: VideoTaskMetadataCreateRequest,
        existing: VideoTaskMetadataSnapshot | None
    ) -> VideoTaskMetadataSnapshot:
        if self._repository is None:
            from app.features.video.task_metadata import TaskMetadataRepository
            repository = TaskMetadataRepository()
            if existing is not None:
                repository.upsert_snapshot(existing)
            return repository.build_snapshot(request, default_task_type=TaskType.VIDEO)
        self._repository.upsert_snapshot(existing) if existing is not None else None
        return self._repository.build_snapshot(request, default_task_type=TaskType.VIDEO)

    async def _query_existing_row(self, client: RuoYiClient, task_id: str) -> dict | None:
        result = await client.get_page(
            "/video/task/list",
            resource=self._RESOURCE,
            operation="query-by-task-id",
            params={"taskId": task_id, "pageNum": 1, "pageSize": 1}
        )
        rows = result.raw.get("rows", [])
        return rows[0] if rows else None

    def _snapshot_from_ruoyi_row(
        self,
        row: dict,
        *,
        operation: str,
        endpoint: str
    ) -> VideoTaskMetadataSnapshot:
        try:
            return snapshot_from_ruoyi_row(row, expected_task_type=TaskType.VIDEO)
        except ValueError as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    def _invalid_response_error(self, *, operation: str, endpoint: str, reason: str) -> IntegrationError:
        return IntegrationError(
            service="ruoyi",
            resource=self._RESOURCE,
            operation=operation,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details={"endpoint": endpoint, "reason": reason}
        )

    @staticmethod
    def _format_query_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.strftime(RUOYI_DATETIME_FORMAT)
