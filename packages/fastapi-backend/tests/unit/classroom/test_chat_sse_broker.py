"""ChatSseBroker 单测：publish / replay / drop + ring buffer cap。"""
from __future__ import annotations

import pytest

from app.features.classroom.chat_sse_broker import (
    MAX_EVENTS_PER_CHANNEL,
    ChatSseBroker,
    get_chat_sse_broker,
    reset_chat_sse_broker_for_tests,
)


@pytest.fixture(autouse=True)
def _reset():
    reset_chat_sse_broker_for_tests()
    yield
    reset_chat_sse_broker_for_tests()


def test_publish_appends_and_isolates_channels():
    b = ChatSseBroker()
    a1 = b.publish("ch-a", event_id="ch-a:1", event_name="e", data="1")
    b1 = b.publish("ch-b", event_id="ch-b:1", event_name="e", data="1")
    assert a1.event_id == "ch-a:1" and a1.event_name == "e" and a1.data == "1"
    assert b.replay("ch-a") == [a1]
    assert b.replay("ch-b") == [b1]


def test_replay_without_after_returns_all_and_unknown_channel_empty():
    b = ChatSseBroker()
    events = [b.publish("ch", event_id=f"ch:{i}", event_name="e", data=str(i)) for i in range(3)]
    assert b.replay("ch") == events
    assert b.replay("other") == []


def test_replay_after_known_event_id_returns_tail():
    b = ChatSseBroker()
    b.publish("ch", event_id="ch:1", event_name="e", data="1")
    second = b.publish("ch", event_id="ch:2", event_name="e", data="2")
    third = b.publish("ch", event_id="ch:3", event_name="e", data="3")
    assert b.replay("ch", after_event_id=second.event_id) == [third]


def test_replay_after_unknown_event_id_falls_back_to_full():
    b = ChatSseBroker()
    e1 = b.publish("ch", event_id="ch:1", event_name="e", data="1")
    e2 = b.publish("ch", event_id="ch:2", event_name="e", data="2")
    assert b.replay("ch", after_event_id="unknown-id") == [e1, e2]


def test_ring_buffer_drops_oldest_when_cap_reached():
    b = ChatSseBroker(max_events_per_channel=5)
    for i in range(8):
        b.publish("ch", event_id=f"ch:{i}", event_name="e", data=str(i))
    ids = [e.event_id for e in b.replay("ch")]
    assert ids == ["ch:3", "ch:4", "ch:5", "ch:6", "ch:7"]


def test_drop_clears_buffer_and_is_noop_for_unknown():
    b = ChatSseBroker()
    b.publish("ch", event_id="ch:1", event_name="e", data="1")
    b.drop("ch")
    assert b.replay("ch") == []
    b.drop("never-existed")  # 不应 raise


def test_singleton_and_default_cap():
    assert MAX_EVENTS_PER_CHANNEL == 200
    assert get_chat_sse_broker() is get_chat_sse_broker()
