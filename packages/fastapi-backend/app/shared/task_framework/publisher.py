from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

from app.core.sse import TaskProgressEvent
from app.shared.task_framework.runtime import TaskRuntimeSnapshot
from app.shared.task_framework.runtime_store import build_task_event

if TYPE_CHECKING:
    from app.infra.sse_broker import InMemorySseBroker


@dataclass(slots=True)
class TaskDispatchEvent:
    event: str
    snapshot: TaskRuntimeSnapshot
    context: dict[str, object] = field(default_factory=dict)


TaskPublishedEvent = TaskDispatchEvent | TaskProgressEvent


class TaskEventPublisher(Protocol):
    def publish(self, event: TaskPublishedEvent) -> None:
        """Publish a framework event to an external transport."""


class InMemoryTaskEventPublisher:
    def __init__(self) -> None:
        self.events: list[TaskPublishedEvent] = []

    def publish(self, event: TaskPublishedEvent) -> None:
        self.events.append(event)


class BrokerTaskEventPublisher:
    def __init__(self, broker: InMemorySseBroker) -> None:
        self._broker = broker

    def publish(self, event: TaskPublishedEvent) -> None:
        if isinstance(event, TaskProgressEvent):
            self._broker.publish(event)
            return

        self._broker.publish(
            build_task_event(
                event=event.event,
                snapshot=event.snapshot,
                context=event.context
            )
        )
