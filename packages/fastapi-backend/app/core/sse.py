from pydantic import Field

from app.core.logging import format_trace_timestamp
from app.shared.task_framework.contracts import TaskContractPayload


class TaskProgressEvent(TaskContractPayload):
    event: str
    context: dict[str, object] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=format_trace_timestamp)


def encode_sse_event(payload: TaskProgressEvent) -> str:
    body = payload.model_dump_json(by_alias=True)
    return f"event: {payload.event}\ndata: {body}\n\n"
