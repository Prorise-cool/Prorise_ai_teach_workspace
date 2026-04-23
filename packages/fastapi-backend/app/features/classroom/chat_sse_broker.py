"""课堂 chat SSE broker —— in-memory 环形缓冲，支持 Last-Event-ID 重放。

Wave 2 Task 2：内部切到 :class:`EventBuffer` 统一抽象（与
``InMemorySseBroker`` 共用存储层），外部 API（publish / replay / drop）
保持原签名与返回值，FastAPI 路由与 ``chat_sse_broker`` 单例无感。

设计约束（Wave 1.6 scope B 延续）：
- 3 个公开方法：publish / replay / drop
- 每 channel 一个环形缓冲，上限 ``MAX_EVENTS_PER_CHANNEL = 200``
- 不做 Redis 持久化：worker 重启后 chat 流本来就会重跑
"""
from __future__ import annotations

from dataclasses import dataclass

from app.infra.event_bus import EventBuffer


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
        self._buffer: EventBuffer[ChatBrokerEvent] = EventBuffer(
            max_events_per_channel=max_events_per_channel
        )

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
        self._buffer.append(channel, record)
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
        return self._buffer.replay_after(
            channel,
            after_event_id=after_event_id,
            event_id_of=lambda ev: ev.event_id,
        )

    def drop(self, channel: str) -> None:
        """释放 channel 的缓冲。流结束时调用，防止内存无限增长。"""
        self._buffer.drop(channel)


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
