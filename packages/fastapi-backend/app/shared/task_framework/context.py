from dataclasses import dataclass, field

from app.core.logging import format_trace_timestamp


@dataclass(slots=True)
class TaskContext:
    task_id: str
    task_type: str
    user_id: str | None
    request_id: str | None = None
    retry_count: int = 0
    source_module: str = "shared"
    metadata: dict[str, object] = field(default_factory=dict)
    created_at: str = field(default_factory=format_trace_timestamp)
