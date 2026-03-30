from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TaskStatusValue = Literal["pending", "processing", "completed", "failed", "cancelled"]


def _to_camel_case(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(segment.capitalize() for segment in tail)


class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel_case,
        populate_by_name=True,
        serialize_by_alias=True
    )


class TaskContractPayload(CamelCaseModel):
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
