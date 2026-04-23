"""SSE 事件统一抽象。

提供 ``PublishableEvent`` Protocol 与线程安全的 ``EventBuffer`` 通用实现，
供 ``InMemorySseBroker``（video/tasks）与 ``ChatSseBroker``（classroom chat）
共同复用。具体 broker 保留各自的对外 API（backward compat），内部委托给
``EventBuffer`` 完成缓冲 / 重放逻辑。

设计目标（Wave 2 Task 1）：
- 通用环形缓冲，按 channel 隔离，按 event_id 断线续传
- 不侵入现有 TaskProgressEvent / ChatBrokerEvent schema
- 线程安全，支持并发 publish / replay
"""
from __future__ import annotations

import threading
from collections import deque
from typing import Generic, Protocol, TypeVar, runtime_checkable


DEFAULT_MAX_EVENTS_PER_CHANNEL = 200


@runtime_checkable
class PublishableEvent(Protocol):
    """SSE broker 可发布事件契约。

    任何满足以下字段 / 属性的事件都能进入 :class:`EventBuffer`：

    - ``event_id``: 全局唯一标识，用于断线续传定位
    - ``event_name``: 事件类型（progress / completed / chat_message ...）
    - ``channel``: 归属 channel（task_id / conversation_id）
    """

    @property
    def event_id(self) -> str: ...

    @property
    def event_name(self) -> str: ...

    @property
    def channel(self) -> str: ...


T = TypeVar("T")


class EventBuffer(Generic[T]):
    """线程安全的多 channel 事件环形缓冲。

    泛型 ``T`` 由具体 broker 约束——``InMemorySseBroker`` 用
    ``TaskProgressEvent``，``ChatSseBroker`` 用 ``ChatBrokerEvent``。
    缓冲层只关心 ``event_id`` 字符串，由调用方通过 ``event_id_of`` 抽出。
    """

    def __init__(self, max_events_per_channel: int = DEFAULT_MAX_EVENTS_PER_CHANNEL) -> None:
        """初始化缓冲，每 channel 独立 deque。"""
        self._channels: dict[str, deque[T]] = {}
        self._max = max_events_per_channel
        self._lock = threading.Lock()

    def append(self, channel: str, event: T) -> T:
        """把事件追加到指定 channel 尾部；channel 首次出现时初始化。"""
        with self._lock:
            buf = self._channels.get(channel)
            if buf is None:
                buf = deque(maxlen=self._max)
                self._channels[channel] = buf
            buf.append(event)
        return event

    def snapshot(self, channel: str) -> list[T]:
        """返回 channel 的事件快照。不存在则返回空列表。"""
        with self._lock:
            buf = self._channels.get(channel)
            if buf is None:
                return []
            return list(buf)

    def replay_after(
        self,
        channel: str,
        *,
        after_event_id: str | None,
        event_id_of: "callable[[T], str]",
        resolve_sequence: "callable[[str], int | None] | None" = None,
    ) -> list[T]:
        """返回 channel 中 ``after_event_id`` 之后的事件。

        ``after_event_id`` 为 None / 空 → 全量；
        优先 ``resolve_sequence`` 把 event_id 解析为序列号（task progress 用），
        否则退化为精确 event_id 匹配（chat broker 用）；
        未知 ID 默认回退为全量（由调用方决定日志 / 告警策略）。
        """
        events = self.snapshot(channel)
        if not after_event_id:
            return events

        if resolve_sequence is not None:
            threshold = resolve_sequence(after_event_id)
            if threshold is not None:
                return [ev for ev in events if _sequence_of(ev) > threshold]

        for idx, ev in enumerate(events):
            if event_id_of(ev) == after_event_id:
                return events[idx + 1 :]
        return events

    def drop(self, channel: str) -> None:
        """释放 channel 缓冲。流结束 / 长时间空闲时调用。"""
        with self._lock:
            self._channels.pop(channel, None)


def _sequence_of(event: object) -> int:
    """尽力抽出事件序列号，抽不到时当 0。

    ``TaskProgressEvent`` 有 ``sequence`` 字段；其他事件类型无该概念，
    退化为 0 让调用方统一按 event_id 匹配策略。
    """
    sequence = getattr(event, "sequence", None)
    return sequence if isinstance(sequence, int) else 0


__all__ = [
    "DEFAULT_MAX_EVENTS_PER_CHANNEL",
    "EventBuffer",
    "PublishableEvent",
]
