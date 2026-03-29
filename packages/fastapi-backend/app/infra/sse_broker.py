from collections import defaultdict

from app.core.sse import TaskProgressEvent


class InMemorySseBroker:
    def __init__(self) -> None:
        self._events: dict[str, list[TaskProgressEvent]] = defaultdict(list)

    def publish(self, event: TaskProgressEvent) -> None:
        self._events[event.task_id].append(event)

    def replay(self, task_id: str) -> list[TaskProgressEvent]:
        return list(self._events.get(task_id, []))
