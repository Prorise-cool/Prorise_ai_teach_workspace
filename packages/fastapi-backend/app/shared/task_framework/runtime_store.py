from __future__ import annotations

from dataclasses import dataclass

from app.core.sse import TaskProgressEvent
from app.shared.task_framework.runtime import TaskRuntimeSnapshot


@dataclass(slots=True, frozen=True)
class TaskRuntimeRecoveryState:
    task_id: str
    snapshot: dict[str, object] | None
    events: tuple[TaskProgressEvent, ...]

    @property
    def latest_event_id(self) -> str | None:
        if not self.events:
            return None
        return self.events[-1].id


def build_task_event(
    *,
    event: str,
    snapshot: TaskRuntimeSnapshot,
    context: dict[str, object] | None = None
) -> TaskProgressEvent:
    event_context = dict(context or {})
    raw_stage = event_context.get("stage")
    raw_result = event_context.get("result")

    return TaskProgressEvent(
        event=event,
        task_id=snapshot.task_id,
        task_type=snapshot.task_type,
        status=snapshot.status,
        progress=snapshot.progress,
        message=snapshot.message,
        request_id=snapshot.request_id,
        error_code=snapshot.error_code,
        context=event_context,
        stage=raw_stage if isinstance(raw_stage, str) else None,
        result=raw_result if isinstance(raw_result, dict) else None
    )
