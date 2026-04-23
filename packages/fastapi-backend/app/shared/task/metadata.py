"""任务元数据模型与内存仓库，管理视频/课堂任务的生命周期状态。"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from threading import RLock
from typing import Any

from pydantic import BaseModel, Field, field_serializer, model_validator

from app.shared.datetime_utils import format_ruoyi_datetime as _shared_format_ruoyi_datetime
from app.shared.ruoyi.mapper import RuoYiMapper
from app.shared.task_framework.status import TaskStatus


class TaskType(StrEnum):
    """任务类型枚举：视频或课堂。"""
    VIDEO = "video"
    CLASSROOM = "classroom"


def _format_ruoyi_datetime(value: datetime | None) -> str | None:
    """向后兼容别名，转发到 ``app.shared.datetime_utils.format_ruoyi_datetime``。"""
    return _shared_format_ruoyi_datetime(value)


def _coerce_task_type(task_type: str | None, *, default_task_type: TaskType) -> str:
    if task_type in TASK_TABLE_BY_TYPE:
        return task_type or default_task_type.value
    return default_task_type.value


def _require_task_type(task_type: object, *, expected_task_type: TaskType | None = None) -> TaskType:
    try:
        normalized_task_type = TaskType(str(task_type))
    except ValueError as exc:
        raise ValueError(f"unsupported task_type: {task_type}") from exc

    if expected_task_type is not None and normalized_task_type != expected_task_type:
        raise ValueError(
            f"unexpected task_type: {normalized_task_type.value}, expected {expected_task_type.value}"
        )
    return normalized_task_type


def _coerce_status(status: TaskStatus | str | None) -> TaskStatus | None:
    if status is None or isinstance(status, TaskStatus):
        return status
    try:
        return TaskStatus(status)
    except ValueError:
        return None


class TaskMetadataCreateRequest(BaseModel):
    """任务元数据创建/更新请求。"""
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
    """任务元数据持久化快照。"""
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
        """将快照转换为 RuoYi camelCase 写入 payload。"""
        payload = self.model_dump(mode="python")
        for field_name in ("created_at", "started_at", "completed_at", "failed_at", "updated_at"):
            value = payload.get(field_name)
            if isinstance(value, datetime) and value.tzinfo is not None:
                payload[field_name] = value.astimezone(UTC).replace(tzinfo=None)
        return TASK_METADATA_RUOYI_MAPPER.to_ruoyi(payload)


class TaskMetadataPreviewResponse(BaseModel):
    """任务元数据持久化预览响应，含快照与 RuoYi payload。"""
    table_name: str
    task: TaskMetadataSnapshot
    ruoyi_payload: dict[str, Any]


class TaskMetadataPageResponse(BaseModel):
    """任务元数据分页查询响应。"""
    rows: list[TaskMetadataSnapshot]
    total: int = Field(ge=0)


TASK_TABLE_BY_TYPE: dict[str, str] = {
    TaskType.VIDEO.value: "xm_video_task",
    TaskType.CLASSROOM.value: "xm_classroom_session"
}


TASK_METADATA_RUOYI_MAPPER = RuoYiMapper(
    field_aliases={
        "task_id": "taskId",
        "user_id": "userId",
        "task_type": "taskType",
        "status": "taskState",
        "summary": "summary",
        "result_ref": "resultRef",
        "detail_ref": "detailRef",
        "error_summary": "errorSummary",
        "source_session_id": "sourceSessionId",
        "source_artifact_ref": "sourceArtifactRef",
        "replay_hint": "replayHint",
        "created_at": "createTime",
        "started_at": "startTime",
        "completed_at": "completeTime",
        "failed_at": "failTime",
        "updated_at": "updateTime"
    },
    status_fields={"status": {status.value: status.value for status in TaskStatus}},
    datetime_fields={"created_at", "started_at", "completed_at", "failed_at", "updated_at"}
)


def snapshot_from_ruoyi_row(
    row: dict[str, Any],
    *,
    expected_task_type: TaskType | None = None
) -> TaskMetadataSnapshot:
    """从 RuoYi 数据行构建 TaskMetadataSnapshot。"""
    normalized = TASK_METADATA_RUOYI_MAPPER.from_ruoyi(row)
    normalized.pop("id", None)
    if "user_id" in normalized and normalized["user_id"] is not None:
        normalized["user_id"] = str(normalized["user_id"])
    task_type = _require_task_type(normalized.get("task_type"), expected_task_type=expected_task_type)
    normalized["task_type"] = task_type.value
    normalized["table_name"] = TASK_TABLE_BY_TYPE[task_type.value]
    return TaskMetadataSnapshot.model_validate(normalized)


class TaskMetadataRepository:
    """任务元数据内存仓库，支持 CRUD、分页和会话回放。"""

    def __init__(self) -> None:
        self._lock = RLock()
        self._records: dict[str, TaskMetadataSnapshot] = {}

    def clear(self) -> None:
        """清空所有内存记录。"""
        with self._lock:
            self._records.clear()

    def build_snapshot(self, request: TaskMetadataCreateRequest, *, default_task_type: TaskType) -> TaskMetadataSnapshot:
        """从创建请求构建快照，合并已有记录的字段。"""
        now = datetime.now(UTC)
        with self._lock:
            existing = self._records.get(request.task_id)
            task_type = _coerce_task_type(
                request.task_type or (existing.task_type if existing else None),
                default_task_type=default_task_type,
            )
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

            return TaskMetadataSnapshot(
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
                source_artifact_ref=(
                    request.source_artifact_ref
                    if request.source_artifact_ref is not None
                    else (existing.source_artifact_ref if existing else None)
                ),
                replay_hint=(
                    request.replay_hint
                    or (existing.replay_hint if existing else None)
                    or request.result_ref
                    or request.detail_ref
                    or request.source_artifact_ref
                    or request.task_id
                ),
                created_at=created_at,
                started_at=started_at,
                completed_at=completed_at,
                failed_at=failed_at,
                updated_at=updated_at,
            )

    def upsert_snapshot(self, snapshot: TaskMetadataSnapshot) -> TaskMetadataSnapshot:
        """插入或更新任务快照。"""
        with self._lock:
            self._records[snapshot.task_id] = snapshot
            return snapshot

    def save_task(self, request: TaskMetadataCreateRequest, *, default_task_type: TaskType) -> TaskMetadataSnapshot:
        """构建并保存任务快照。"""
        snapshot = self.build_snapshot(request, default_task_type=default_task_type)
        return self.upsert_snapshot(snapshot)

    def get_task(self, task_id: str) -> TaskMetadataSnapshot | None:
        """按 task_id 查询任务快照。"""
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
        """按条件筛选任务列表，按更新时间降序排列。"""
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
            rows = [item for item in rows if item.source_session_id == source_session_id]
        if updated_from is not None:
            rows = [item for item in rows if item.updated_at >= updated_from]
        if updated_to is not None:
            rows = [item for item in rows if item.updated_at <= updated_to]

        return sorted(rows, key=lambda item: (item.updated_at, item.task_id), reverse=True)

    def replay_session(self, session_id: str, *, task_type: str | None = None) -> TaskMetadataPageResponse:
        """按会话 ID 回放关联的任务列表。"""
        rows = self.list_tasks(task_type=task_type, source_session_id=session_id)
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
        """分页查询任务列表。"""
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
