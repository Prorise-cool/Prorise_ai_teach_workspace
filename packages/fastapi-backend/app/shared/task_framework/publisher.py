"""任务事件发布器，提供 Protocol 接口和内存/SSE broker 两种实现。"""

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
    """调度器内部事件，封装事件名称、运行态快照和上下文。"""
    event: str
    snapshot: TaskRuntimeSnapshot
    context: dict[str, object] = field(default_factory=dict)


TaskPublishedEvent = TaskDispatchEvent | TaskProgressEvent


class TaskEventPublisher(Protocol):
    """任务事件发布器协议。"""

    def publish(self, event: TaskPublishedEvent) -> None:
        """将框架事件发布到外部传输层。"""


class InMemoryTaskEventPublisher:
    """内存事件发布器，用于测试场景的事件收集。"""

    def __init__(self) -> None:
        self.events: list[TaskPublishedEvent] = []

    def publish(self, event: TaskPublishedEvent) -> None:
        """将事件追加到内存列表。"""
        self.events.append(event)


class BrokerTaskEventPublisher:
    """基于 InMemorySseBroker 的事件发布器，将事件转发到 SSE broker。"""

    def __init__(self, broker: InMemorySseBroker) -> None:
        """初始化，绑定 SSE broker 实例。"""
        self._broker = broker

    def publish(self, event: TaskPublishedEvent) -> None:
        """将事件转换为 TaskProgressEvent 后发布到 SSE broker。"""
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
