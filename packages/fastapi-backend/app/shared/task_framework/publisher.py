from dataclasses import dataclass, field
from typing import Protocol

from app.core.sse import TaskProgressEvent
from app.infra.sse_broker import InMemorySseBroker
from app.shared.task_framework.runtime import TaskRuntimeSnapshot


@dataclass(slots=True)
class TaskDispatchEvent:
    event: str
    snapshot: TaskRuntimeSnapshot
    context: dict[str, object] = field(default_factory=dict)


class TaskEventPublisher(Protocol):
    def publish(self, event: TaskDispatchEvent) -> None:
        """Publish a framework event to an external transport."""


class InMemoryTaskEventPublisher:
    def __init__(self) -> None:
        self.events: list[TaskDispatchEvent] = []

    def publish(self, event: TaskDispatchEvent) -> None:
        self.events.append(event)


class BrokerTaskEventPublisher:
    def __init__(self, broker: InMemorySseBroker) -> None:
        self._broker = broker

    def publish(self, event: TaskDispatchEvent) -> None:
        snapshot = event.snapshot
        self._broker.publish(
            TaskProgressEvent(
                event=event.event,
                task_id=snapshot.task_id,
                task_type=snapshot.task_type,
                status=snapshot.status,
                progress=snapshot.progress,
                message=snapshot.message,
                request_id=snapshot.request_id,
                error_code=snapshot.error_code,
                context=event.context
            )
        )
