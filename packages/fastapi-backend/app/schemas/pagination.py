"""分页查询通用模型。"""

from pydantic import Field

from app.schemas.common import CamelCaseModel
from app.shared.task_framework.contracts import TaskContractPayload


class TaskListItemPayload(TaskContractPayload):
    """任务列表单条数据。"""
    id: str | None = None
    title: str | None = None


class TaskListResponseEnvelope(CamelCaseModel):
    """任务列表分页响应信封。"""
    code: int = Field(default=200)
    msg: str = Field(default="查询成功")
    rows: list[TaskListItemPayload]
    total: int = Field(ge=0)
    request_id: str | None = None


def build_page_envelope(
    rows: list[TaskListItemPayload],
    *,
    total: int,
    request_id: str | None = None,
    msg: str = "查询成功"
) -> dict[str, object]:
    """构建分页响应信封。"""
    return {
        "code": 200,
        "msg": msg,
        "rows": [row.model_dump(mode="json", by_alias=True) for row in rows],
        "total": total,
        "requestId": request_id
    }
