from __future__ import annotations

import pytest

from app.core.sse import TaskProgressEvent
from app.infra.redis_client import RuntimeStorageScope, RuntimeStore
from app.shared.task_framework.key_builder import (
    PROVIDER_HEALTH_TTL_SECONDS,
    TASK_EVENTS_TTL_SECONDS,
    TASK_RUNTIME_TTL_SECONDS,
    build_provider_health_key,
    build_task_events_key,
    build_task_runtime_key,
)
from app.shared.task_framework.status import TaskInternalStatus


def test_runtime_store_rejects_missing_ttl_and_long_term_scope() -> None:
    store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")

    with pytest.raises(ValueError, match="TTL"):
        store.set_runtime_value(build_task_runtime_key("task-1"), {"status": "pending"}, ttl_seconds=0)

    with pytest.raises(ValueError, match="长期业务数据"):
        store.set_runtime_value(
            build_task_runtime_key("task-1"),
            {"status": "pending"},
            ttl_seconds=60,
            scope=RuntimeStorageScope.LONG_TERM
        )

    with pytest.raises(ValueError, match="xm_"):
        store.set_runtime_value("task:1", {"status": "pending"}, ttl_seconds=60)


def test_runtime_store_uses_standard_keys_and_ttls_for_snapshot_mapping_and_health() -> None:
    store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    task_id = "video_20260330141500_ab12cd34"

    snapshot = store.set_task_state(
        task_id=task_id,
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="任务处理中",
        progress=35,
        request_id="req_task_runtime_001",
        source="video"
    )
    store.set_message_mapping("msg-1001", task_id)
    health = store.set_provider_health(
        "demo-chat",
        is_healthy=True,
        reason="probe-ok",
        checked_at="2026-03-30T14:15:00Z",
        metadata={"latencyMs": 180}
    )

    assert snapshot["taskId"] == task_id
    assert store.get_task_state(task_id)["status"] == "processing"
    assert store.get_task_state(task_id)["context"] == {}
    assert store.get_task_id_by_message("msg-1001") == task_id
    assert health["metadata"]["latencyMs"] == 180
    assert store.get_provider_health("demo-chat")["isHealthy"] is True
    assert 0 < store.ttl(build_task_runtime_key(task_id)) <= TASK_RUNTIME_TTL_SECONDS
    assert 0 < store.ttl(build_provider_health_key("demo-chat")) <= PROVIDER_HEALTH_TTL_SECONDS


def test_runtime_store_appends_events_and_builds_recovery_state() -> None:
    store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    task_id = "video_20260330142000_cd34ef56"

    store.set_task_state(
        task_id=task_id,
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="已恢复到当前进度",
        progress=48,
        request_id="req_task_runtime_002",
        source="video"
    )
    first_event = store.append_task_event(
        task_id,
        TaskProgressEvent(
            event="connected",
            task_id=task_id,
            task_type="video",
            status="pending",
            progress=0,
            message="SSE 通道已建立",
            request_id="req_task_runtime_002",
            error_code=None
        )
    )
    second_event = store.append_task_event(
        task_id,
        TaskProgressEvent(
            event="progress",
            task_id=task_id,
            task_type="video",
            status="processing",
            progress=48,
            message="任务处理中",
            request_id="req_task_runtime_002",
            error_code=None
        )
    )
    third_event = store.append_task_event(
        task_id,
        TaskProgressEvent(
            event="completed",
            task_id=task_id,
            task_type="video",
            status="completed",
            progress=100,
            message="任务执行完成",
            request_id="req_task_runtime_002",
            error_code=None,
            result={"videoId": "video_asset_001"}
        )
    )

    replayed = store.get_task_events(task_id, after_event_id=first_event.id)
    recovery = store.load_task_recovery_state(task_id, after_event_id=second_event.id)

    assert [first_event.sequence, second_event.sequence, third_event.sequence] == [1, 2, 3]
    assert [event.sequence for event in replayed] == [2, 3]
    assert recovery.snapshot["progress"] == 48
    assert [event.sequence for event in recovery.events] == [3]
    assert recovery.latest_event_id == third_event.id
    assert 0 < store.ttl(build_task_events_key(task_id)) <= TASK_EVENTS_TTL_SECONDS


def test_memory_runtime_store_expires_runtime_keys_without_redis(monkeypatch) -> None:
    clock = {"now": 1_000.0}
    monkeypatch.setattr(RuntimeStore, "_now", staticmethod(lambda: clock["now"]))
    store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    key = build_task_runtime_key("expiring-task")

    store.set_runtime_value(key, {"status": "pending"}, ttl_seconds=1)
    assert store.get_runtime_value(key) == {"status": "pending"}

    clock["now"] = 1_002.0

    assert store.get_runtime_value(key) is None
    assert store.ttl(key) == -2
