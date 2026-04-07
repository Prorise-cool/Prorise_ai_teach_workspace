"""任务框架契约模型。

定义统一的任务状态枚举与任务载荷 schema，供 SSE 事件、任务快照等场景消费。

``CamelCaseModel`` 从 ``app.schemas._camel`` 统一导入，保证基类全局唯一。
"""

from typing import Literal

from pydantic import Field

from app.schemas._camel import CamelCaseModel


TaskStatusValue = Literal["pending", "processing", "completed", "failed", "cancelled"]


class TaskContractPayload(CamelCaseModel):
    """任务进度 SSE 事件 payload 契约。

    对应前端 ``TaskProgressEvent`` 的 ``data`` 字段结构，
    字段定义遵循 ``2-5-sse-事件类型payload-与-broker-契约冻结`` 规范。
    """

    task_id: str
    task_type: str
    status: TaskStatusValue
    progress: int = Field(ge=0, le=100)
    message: str
    timestamp: str = Field(
        description="UTC ISO 8601 时间，例如 2026-03-29T16:15:00Z"
    )
    request_id: str | None
    error_code: str | None
    current_stage: str | None = None
    stage_label: str | None = None
    stage_progress: int | None = Field(default=None, ge=0, le=100)
