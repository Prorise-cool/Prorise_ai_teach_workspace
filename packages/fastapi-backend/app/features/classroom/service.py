from app.features.classroom.schemas import (
    ClassroomBootstrapResponse,
    ClassroomTaskMetadataCreateRequest,
    ClassroomTaskMetadataPageResponse,
    ClassroomTaskMetadataPreviewResponse,
    ClassroomTaskMetadataSnapshot,
)
from app.features.video.task_metadata import (
    TASK_METADATA_RUOYI_MAPPER,
    TaskType,
    snapshot_from_ruoyi_row,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_mapper import RUOYI_DATETIME_FORMAT
from app.shared.task_framework.status import TaskStatus
from datetime import datetime


class ClassroomService:
    _REPLAY_PAGE_SIZE = 100

    def __init__(self, repository=None, client_factory=None) -> None:
        self._repository = repository
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> ClassroomBootstrapResponse:
        return ClassroomBootstrapResponse()

    async def persist_task(self, request: ClassroomTaskMetadataCreateRequest) -> ClassroomTaskMetadataPreviewResponse:
        async with self._client_factory() as client:
            existing_row = await self._query_existing_row(client, request.task_id)
            existing_snapshot = snapshot_from_ruoyi_row(existing_row) if existing_row is not None else None
            snapshot = self._build_snapshot(request, existing_snapshot)
            ruoyi_payload = snapshot.to_ruoyi_payload()
            if existing_row is None:
                await client.post_single(
                    "/classroom/session",
                    resource="classroom-session",
                    operation="create",
                    json_body=ruoyi_payload,
                    retry_enabled=False
                )
            else:
                await client.put_single(
                    "/classroom/session",
                    resource="classroom-session",
                    operation="update",
                    json_body={"id": existing_row["id"], **ruoyi_payload},
                    retry_enabled=False
                )
        return ClassroomTaskMetadataPreviewResponse(
            table_name=snapshot.table_name,
            task=snapshot,
            ruoyi_payload=ruoyi_payload
        )

    async def get_task(self, task_id: str) -> ClassroomTaskMetadataSnapshot | None:
        async with self._client_factory() as client:
            row = await self._query_existing_row(client, task_id)
        return snapshot_from_ruoyi_row(row) if row is not None else None

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
    ) -> ClassroomTaskMetadataPageResponse:
        async with self._client_factory() as client:
            result = await client.get_page(
                "/classroom/session/list",
                resource="classroom-session",
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
            ClassroomTaskMetadataSnapshot.model_validate({**row, "table_name": "xm_classroom_session"})
            for row in result.rows
        ]
        return ClassroomTaskMetadataPageResponse(rows=rows, total=result.total)

    async def replay_session(self, session_id: str) -> ClassroomTaskMetadataPageResponse:
        rows: list[ClassroomTaskMetadataSnapshot] = []
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
        return ClassroomTaskMetadataPageResponse(rows=rows, total=total)

    def _build_snapshot(
        self,
        request: ClassroomTaskMetadataCreateRequest,
        existing: ClassroomTaskMetadataSnapshot | None
    ) -> ClassroomTaskMetadataSnapshot:
        if self._repository is None:
            from app.features.video.task_metadata import TaskMetadataRepository
            repository = TaskMetadataRepository()
            if existing is not None:
                repository.upsert_snapshot(existing)
            return repository.build_snapshot(request, default_task_type=TaskType.CLASSROOM)
        self._repository.upsert_snapshot(existing) if existing is not None else None
        return self._repository.build_snapshot(request, default_task_type=TaskType.CLASSROOM)

    async def _query_existing_row(self, client: RuoYiClient, task_id: str) -> dict | None:
        result = await client.get_page(
            "/classroom/session/list",
            resource="classroom-session",
            operation="query-by-task-id",
            params={"taskId": task_id, "pageNum": 1, "pageSize": 1}
        )
        rows = result.raw.get("rows", [])
        return rows[0] if rows else None

    @staticmethod
    def _format_query_datetime(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.strftime(RUOYI_DATETIME_FORMAT)
