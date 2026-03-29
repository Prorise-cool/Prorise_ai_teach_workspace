from pydantic import BaseModel, Field

from app.schemas.common import TaskStatusValue


class TaskListItemPayload(BaseModel):
    task_id: str
    task_type: str
    status: TaskStatusValue
    progress: int = Field(ge=0, le=100)
    updated_at: str = Field(
        description="UTC ISO 8601 时间，例如 2026-03-29T16:15:00Z"
    )


class TaskListResponseEnvelope(BaseModel):
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    rows: list[TaskListItemPayload]
    total: int = Field(ge=0)


def build_page_envelope(
    rows: list[TaskListItemPayload],
    *,
    total: int,
    msg: str = "查询成功"
) -> dict[str, object]:
    return {
        "code": 200,
        "msg": msg,
        "rows": [row.model_dump(mode="json") for row in rows],
        "total": total
    }

