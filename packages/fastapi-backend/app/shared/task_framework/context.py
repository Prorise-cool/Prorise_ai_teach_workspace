from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(slots=True)
class TaskContext:
    task_id: str
    task_type: str
    user_id: str | None
    retry_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
