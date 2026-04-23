"""EventBuffer 抽象层单测。

验证环形缓冲、channel 隔离、replay_after 的 event_id 精确匹配 +
resolve_sequence 优先级、未知 id 回退全量、drop 释放。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.infra.event_bus import (
    DEFAULT_MAX_EVENTS_PER_CHANNEL,
    EventBuffer,
    PublishableEvent,
)


@dataclass(frozen=True)
class _FakeEvent:
    event_id: str
    event_name: str = "fake"
    channel: str = "c1"
    sequence: int | None = None


def _by_event_id(ev: _FakeEvent) -> str:
    return ev.event_id


def test_append_returns_event_and_persists_by_channel() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    e1 = _FakeEvent(event_id="a")
    e2 = _FakeEvent(event_id="b")

    assert buf.append("chan-1", e1) is e1
    buf.append("chan-1", e2)
    buf.append("chan-2", _FakeEvent(event_id="z"))

    assert [ev.event_id for ev in buf.snapshot("chan-1")] == ["a", "b"]
    assert [ev.event_id for ev in buf.snapshot("chan-2")] == ["z"]


def test_snapshot_unknown_channel_returns_empty_list() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    assert buf.snapshot("missing") == []


def test_replay_after_none_returns_all() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    for i in range(3):
        buf.append("c", _FakeEvent(event_id=str(i)))

    out = buf.replay_after("c", after_event_id=None, event_id_of=_by_event_id)
    assert [ev.event_id for ev in out] == ["0", "1", "2"]


def test_replay_after_known_event_id_returns_tail() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    for i in range(4):
        buf.append("c", _FakeEvent(event_id=str(i)))

    out = buf.replay_after("c", after_event_id="1", event_id_of=_by_event_id)
    assert [ev.event_id for ev in out] == ["2", "3"]


def test_replay_after_unknown_id_falls_back_to_full() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    buf.append("c", _FakeEvent(event_id="a"))
    buf.append("c", _FakeEvent(event_id="b"))

    out = buf.replay_after("c", after_event_id="does-not-exist", event_id_of=_by_event_id)
    assert [ev.event_id for ev in out] == ["a", "b"]


def test_replay_after_uses_resolve_sequence_when_provided() -> None:
    """resolve_sequence 优先：用 sequence 字段做门限，跳过精确 id 匹配。"""
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    for i in range(1, 5):
        buf.append("c", _FakeEvent(event_id=f"evt-{i}", sequence=i))

    def resolve(evt_id: str) -> int | None:
        # "evt-N" → N
        return int(evt_id.split("-")[1])

    out = buf.replay_after(
        "c",
        after_event_id="evt-2",
        event_id_of=_by_event_id,
        resolve_sequence=resolve,
    )
    assert [ev.event_id for ev in out] == ["evt-3", "evt-4"]


def test_replay_after_resolve_sequence_returns_none_falls_back_to_id_match() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    for i in range(3):
        buf.append("c", _FakeEvent(event_id=str(i)))

    out = buf.replay_after(
        "c",
        after_event_id="1",
        event_id_of=_by_event_id,
        resolve_sequence=lambda _id: None,
    )
    assert [ev.event_id for ev in out] == ["2"]


def test_ring_buffer_drops_oldest_when_over_cap() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer(max_events_per_channel=3)
    for i in range(5):
        buf.append("c", _FakeEvent(event_id=str(i)))

    assert [ev.event_id for ev in buf.snapshot("c")] == ["2", "3", "4"]


def test_drop_releases_channel_and_is_idempotent() -> None:
    buf: EventBuffer[_FakeEvent] = EventBuffer()
    buf.append("c", _FakeEvent(event_id="a"))
    buf.drop("c")
    assert buf.snapshot("c") == []
    # idempotent
    buf.drop("c")
    buf.drop("never-existed")


def test_default_cap_constant_exposed_and_non_trivial() -> None:
    assert DEFAULT_MAX_EVENTS_PER_CHANNEL >= 50


def test_publishable_event_protocol_runtime_checkable() -> None:
    """runtime_checkable Protocol 让 duck-typed 实例可 isinstance 检查。"""
    event = _FakeEvent(event_id="x")
    assert isinstance(event, PublishableEvent)
