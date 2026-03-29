from collections import defaultdict

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.core.sse import TaskProgressEvent


class InMemorySseBroker:
    def __init__(self) -> None:
        self._events: dict[str, list[TaskProgressEvent]] = defaultdict(list)
        self._logger = get_logger("app.infra.sse_broker")

    def publish(self, event: TaskProgressEvent) -> None:
        tokens = bind_trace_context(
            task_id=event.task_id,
            error_code=event.error_code or EMPTY_TRACE_VALUE
        )
        try:
            self._events[event.task_id].append(event)
            self._logger.info(
                "SSE event published type=%s status=%s progress=%s",
                event.event,
                event.status,
                event.progress
            )
        finally:
            reset_trace_context(tokens)

    def replay(self, task_id: str) -> list[TaskProgressEvent]:
        tokens = bind_trace_context(task_id=task_id)
        try:
            events = list(self._events.get(task_id, []))
            self._logger.info("SSE events replayed count=%s", len(events))
            return events
        finally:
            reset_trace_context(tokens)
