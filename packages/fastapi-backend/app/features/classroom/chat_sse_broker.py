"""课堂 chat SSE broker —— in-memory 环形缓冲，支持 Last-Event-ID 重放。

与 ``app.infra.sse_broker.InMemorySseBroker`` 分离：后者硬绑
``TaskProgressEvent``（status / progress / error_code 必填），被 video / tasks
广泛使用；chat 的 ChatEvent 形状不同，独立 feature-local 实例避免污染
上游 schema。

设计约束（Wave 1.6 scope B）：
- 3 个公开方法：publish / replay / drop
- 每 channel 一个 ``deque`` 环形缓冲，上限 ``MAX_EVENTS_PER_CHANNEL = 200``
- 不做 Redis 持久化：worker 重启后 chat 流本来就会重跑
"""
from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass


MAX_EVENTS_PER_CHANNEL = 200


@dataclass(frozen=True)
class ChatBrokerEvent:
    """broker 缓存的一条事件。``data`` 是已序列化的 JSON 字符串。"""

    event_id: str
    event_name: str
    data: str


class ChatSseBroker:
    """线程安全的 in-memory chat SSE 事件 broker。"""

    def __init__(self, max_events_per_channel: int = MAX_EVENTS_PER_CHANNEL) -> None:
        self._channels: dict[str, deque[ChatBrokerEvent]] = {}
        self._max = max_events_per_channel
        self._lock = threading.Lock()

    def publish(
        self,
        channel: str,
        *,
        event_id: str,
        event_name: str,
        data: str,
    ) -> ChatBrokerEvent:
        """缓存一条事件；channel 首次出现时初始化 ring buffer。"""
        record = ChatBrokerEvent(event_id=event_id, event_name=event_name, data=data)
        with self._lock:
            buf = self._channels.get(channel)
            if buf is None:
                buf = deque(maxlen=self._max)
                self._channels[channel] = buf
            buf.append(record)
        return record

    def replay(
        self,
        channel: str,
        *,
        after_event_id: str | None = None,
    ) -> list[ChatBrokerEvent]:
        """返回 channel 中 after_event_id 之后的事件。

        ``after_event_id`` 为 None / 空 → 全量；匹配到某条 → 仅返回其后；
        未知 ID → 回退全量（避免前端丢帧）。
        """
        with self._lock:
            buf = self._channels.get(channel)
            if buf is None:
                return []
            events = list(buf)

        if not after_event_id:
            return events

        for idx, ev in enumerate(events):
            if ev.event_id == after_event_id:
                return events[idx + 1:]
        return events

    def drop(self, channel: str) -> None:
        """释放 channel 的缓冲。流结束时调用，防止内存无限增长。"""
        with self._lock:
            self._channels.pop(channel, None)


_broker: ChatSseBroker | None = None


def get_chat_sse_broker() -> ChatSseBroker:
    """全局单例，FastAPI 依赖注入入口。"""
    global _broker
    if _broker is None:
        _broker = ChatSseBroker()
    return _broker


def reset_chat_sse_broker_for_tests() -> None:
    """仅测试用：清空全局实例。"""
    global _broker
    _broker = None


__all__ = [
    "MAX_EVENTS_PER_CHANNEL",
    "ChatBrokerEvent",
    "ChatSseBroker",
    "get_chat_sse_broker",
    "reset_chat_sse_broker_for_tests",
]
