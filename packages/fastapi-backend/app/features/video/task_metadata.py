from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from threading import RLock
from typing import Any

from pydantic import BaseModel, Field, field_serializer, model_validator

from app.shared.ruoyi_mapper import RuoYiMapper, RUOYI_DATETIME_FORMAT
from app.shared.task_framework.status import TaskStatus


class TaskType(StrEnum):
    VIDEO = "video"
    CLASSROOM = "classroom"


def _format_ruoyi_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    normalized = value.astimezone(UTC) if value.tzinfo is not None else value
    return normalized.strftime(RUOYI_DATETIME_FORMAT)


def _coerce_task_type(task_type: str | None, *, default_task_type: TaskType) -> str:
    if task_type in TASK_TABLE_BY_TYPE:
        return task_type or default_task_type.value
    return default_task_type.value


def _coerce_status(status: TaskStatus | str | None) -> TaskStatus | None:
    if status is None or isinstance(status, TaskStatus):
        return status
    try:
        return TaskStatus(status)
    except ValueError:
        return None


class TaskMetadataCreateRequest(BaseModel):
    task_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    task_type: str | None = None
    status: TaskStatus = TaskStatus.PENDING
    summary: str = Field(min_length=1)
    result_ref: str | None = None
    detail_ref: str | None = None
    error_summary: str | None = None
    source_session_id: str | None = None
    source_artifact_ref: str | None = None
    replay_hint: str | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    failed_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="after")
    def populate_hint(self) -> "TaskMetadataCreateRequest":
        if self.replay_hint is None:
            self.replay_hint = self.result_ref or self.detail_ref or self.source_artifact_ref or self.task_id
        return self


class TaskMetadataSnapshot(BaseModel):
    task_id: str
    user_id: str
    task_type: str
    table_name: str
    status: TaskStatus
    summary: str
    result_ref: str | None = None
    detail_ref: str | None = None
    error_summary: str | None = None
    source_session_id: str | None = None
    source_artifact_ref: str | None = None
    replay_hint: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    failed_at: datetime | None = None
    updated_at: datetime

    @field_serializer("created_at", "started_at", "completed_at", "failed_at", "updated_at", when_used="json")
    def _serialize_datetime(self, value: datetime | None) -> str | None:
        return _format_ruoyi_datetime(value)

    def to_ruoyi_payload(self) -> dict[str, Any]:
        mapper = RuoYiMapper(
            field_aliases={
                "task_id": "task_id",
                "user_id": "user_id",
                "task_type": "task_type",
                "status": "task_state",
                "summary": "summary",
                "result_ref": "result_ref",
                "detail_ref": "detail_ref",
                "error_summary": "error_summary",
                "source_session_id": "source_session_id",
                "source_artifact_ref": "source_artifact_ref",
                "replay_hint": "replay_hint",
                "created_at": "create_time",
                "started_at": "start_time",
                "completed_at": "complete_time",
                "failed_at": "fail_time",
                "updated_at": "update_time"
            },
            status_fields={
                "status": {status.value: status.value for status in TaskStatus}
            },
            datetime_fields={
                "created_at",
                "started_at",
                "completed_at",
                "failed_at",
                "updated_at"
            }
        )
        payload = self.model_dump(mode="python")
        for field_name in ("created_at", "started_at", "completed_at", "failed_at", "updated_at"):
            value = payload.get(field_name)
            if isinstance(value, datetime) and value.tzinfo is not None:
                payload[field_name] = value.astimezone(UTC).replace(tzinfo=None)
        return mapper.to_ruoyi(payload)


class TaskMetadataPreviewResponse(BaseModel):
    table_name: str
    task: TaskMetadataSnapshot
    ruoyi_payload: dict[str, Any]


class TaskMetadataPageResponse(BaseModel):
    rows: list[TaskMetadataSnapshot]
    total: int = Field(ge=0)


TASK_TABLE_BY_TYPE: dict[str, str] = {
    TaskType.VIDEO.value: "xm_video_task",
    TaskType.CLASSROOM.value: "xm_classroom_session"
}


class TaskMetadataRepository:
    def __init__(self) -> None:
        self._lock = RLock()
        self._records: dict[str, TaskMetadataSnapshot] = {}

    def clear(self) -> None:
        with self._lock:
            self._records.clear()

    def save_task(self, request: TaskMetadataCreateRequest, *, default_task_type: TaskType) -> TaskMetadataSnapshot:
        now = datetime.now(UTC)
        with self._lock:
            existing = self._records.get(request.task_id)
            task_type = _coerce_task_type(request.task_type or (existing.task_type if existing else None), default_task_type=default_task_type)
            created_at = request.created_at or (existing.created_at if existing else now)
            updated_at = request.updated_at or now
            started_at = request.started_at or (existing.started_at if existing else None)
            completed_at = request.completed_at or (existing.completed_at if existing else None)
            failed_at = request.failed_at or (existing.failed_at if existing else None)

            if request.status == TaskStatus.PROCESSING and started_at is None:
                started_at = created_at
            if request.status == TaskStatus.COMPLETED and completed_at is None:
                completed_at = updated_at
            if request.status == TaskStatus.FAILED and failed_at is None:
                failed_at = updated_at

            snapshot = TaskMetadataSnapshot(
                task_id=request.task_id,
                user_id=request.user_id,
                task_type=task_type,
                table_name=TASK_TABLE_BY_TYPE[task_type],
                status=request.status,
                summary=request.summary,
                result_ref=request.result_ref if request.result_ref is not None else (existing.result_ref if existing else None),
                detail_ref=request.detail_ref if request.detail_ref is not None else (existing.detail_ref if existing else None),
                error_summary=request.error_summary if request.error_summary is not None else (existing.error_summary if existing else None),
                source_session_id=request.source_session_id if request.source_session_id is not None else (existing.source_session_id if existing else None),
                source_artifact_ref=request.source_artifact_ref if request.source_artifact_ref is not None else (existing.source_artifact_ref if existing else None),
                replay_hint=request.replay_hint or (existing.replay_hint if existing else None) or request.result_ref or request.detail_ref or request.source_artifact_ref or request.task_id,
                created_at=created_at,
                started_at=started_at,
                completed_at=completed_at,
                failed_at=failed_at,
                updated_at=updated_at
            )
            self._records[snapshot.task_id] = snapshot
            return snapshot

    def get_task(self, task_id: str) -> TaskMetadataSnapshot | None:
        with self._lock:
            return self._records.get(task_id)

    def list_tasks(
        self,
        *,
        task_type: str | None = None,
        status: TaskStatus | str | None = None,
        user_id: str | None = None,
        source_session_id: str | None = None,
        updated_from: datetime | None = None,
        updated_to: datetime | None = None
    ) -> list[TaskMetadataSnapshot]:
        normalized_status = _coerce_status(status)
        with self._lock:
            rows = list(self._records.values())

        if task_type is not None:
            rows = [item for item in rows if item.task_type == task_type]
        if normalized_status is not None:
            rows = [item for item in rows if item.status == normalized_status]
        if user_id is not None:
            rows = [item for item in rows if item.user_id == user_id]
        if source_session_id is not None:
            rows = [
                item for item in rows
                if item.source_session_id == source_session_id or item.task_id == source_session_id
            ]
        if updated_from is not None:
            rows = [item for item in rows if item.updated_at >= updated_from]
        if updated_to is not None:
            rows = [item for item in rows if item.updated_at <= updated_to]

        return sorted(rows, key=lambda item: (item.updated_at, item.task_id), reverse=True)

    def replay_session(self, session_id: str) -> TaskMetadataPageResponse:
        rows = [
            item for item in self.list_tasks(source_session_id=session_id)
            if item.source_session_id == session_id or item.task_id == session_id
        ]
        return TaskMetadataPageResponse(rows=rows, total=len(rows))

    def page_tasks(
        self,
        *,
        task_type: str | None = None,
        status: TaskStatus | str | None = None,
        user_id: str | None = None,
        source_session_id: str | None = None,
        updated_from: datetime | None = None,
        updated_to: datetime | None = None,
        page_num: int = 1,
        page_size: int = 10
    ) -> TaskMetadataPageResponse:
        rows = self.list_tasks(
            task_type=task_type,
            status=status,
            user_id=user_id,
            source_session_id=source_session_id,
            updated_from=updated_from,
            updated_to=updated_to
        )
        start = max(page_num - 1, 0) * page_size
        end = start + page_size
        return TaskMetadataPageResponse(rows=rows[start:end], total=len(rows))


shared_task_metadata_repository = TaskMetadataRepository()
