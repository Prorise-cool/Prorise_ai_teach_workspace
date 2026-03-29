from pydantic import BaseModel, Field

from app.core.logging import format_trace_timestamp

class TaskProgressEvent(BaseModel):
    event: str
    task_id: str
    task_type: str
    status: str
    progress: int = Field(ge=0, le=100)
    message: str
    request_id: str | None = None
    timestamp: str = Field(default_factory=format_trace_timestamp)
    error_code: str | None = None


def encode_sse_event(payload: TaskProgressEvent) -> str:
    body = payload.model_dump_json()
    return f"event: {payload.event}\ndata: {body}\n\n"
