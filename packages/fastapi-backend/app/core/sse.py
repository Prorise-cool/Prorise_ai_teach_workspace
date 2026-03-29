from datetime import UTC, datetime

from pydantic import BaseModel, Field


class TaskProgressEvent(BaseModel):
    event: str
    task_id: str
    task_type: str
    status: str
    progress: int = Field(ge=0, le=100)
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    error_code: str | None = None


def encode_sse_event(payload: TaskProgressEvent) -> str:
    body = payload.model_dump_json()
    return f"event: {payload.event}\ndata: {body}\n\n"
