from datetime import UTC, datetime
from uuid import uuid4

from app.shared.task_framework.base import BaseTask, TaskResult


def generate_task_id(prefix: str) -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid4().hex[:8]
    return f"{prefix}_{timestamp}_{short_uuid}"


class TaskScheduler:
    async def dispatch(self, task: BaseTask) -> TaskResult:
        return await task.run()
