"""ClassroomRuntimeStateStore 单测。

覆盖运行态生命周期：create → set_status/progress → set_result / set_error
→ get_status 返回快照，以及 exists / 未知 task 兜底。
"""
from __future__ import annotations

import pytest

from app.features.classroom.jobs.job_store import (
    ClassroomRuntimeStateStore,
    JobStore,
)
from app.infra.redis_client import RuntimeStore


@pytest.fixture
def store() -> ClassroomRuntimeStateStore:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    return ClassroomRuntimeStateStore(runtime_store)


def test_create_initializes_pending_with_zero_progress(store: ClassroomRuntimeStateStore) -> None:
    store.create("t-1")
    snapshot = store.get_status("t-1")
    assert snapshot == {
        "status": "pending",
        "progress": 0,
        "classroom": None,
        "error": None,
        "message": None,
    }
    assert store.exists("t-1")


def test_get_status_unknown_task_returns_not_found_placeholder(store: ClassroomRuntimeStateStore) -> None:
    snapshot = store.get_status("missing")
    assert snapshot["status"] == "pending"
    assert snapshot["error"] == "Task not found"
    assert not store.exists("missing")


def test_set_status_and_message_roundtrip(store: ClassroomRuntimeStateStore) -> None:
    store.create("t-2")
    store.set_status("t-2", "running", message="正在生成场景")

    snapshot = store.get_status("t-2")
    assert snapshot["status"] == "running"
    assert snapshot["message"] == "正在生成场景"
    # no transition to ready → classroom still None
    assert snapshot["classroom"] is None


def test_set_progress_clamps_out_of_range(store: ClassroomRuntimeStateStore) -> None:
    store.create("t-3")
    store.set_progress("t-3", -10)
    assert store.get_status("t-3")["progress"] == 0

    store.set_progress("t-3", 250)
    assert store.get_status("t-3")["progress"] == 100

    store.set_progress("t-3", 42)
    assert store.get_status("t-3")["progress"] == 42


def test_set_result_marks_ready_and_returns_classroom_payload(store: ClassroomRuntimeStateStore) -> None:
    store.create("t-4")
    payload = {"scenes": [{"id": "s1", "type": "slide"}]}
    store.set_result("t-4", payload)

    snapshot = store.get_status("t-4")
    assert snapshot["status"] == "ready"
    assert snapshot["progress"] == 100
    assert snapshot["classroom"] == payload
    assert snapshot["error"] is None


def test_set_error_transitions_to_failed_and_surfaces_error(store: ClassroomRuntimeStateStore) -> None:
    store.create("t-5")
    store.set_error("t-5", "LLM timeout")

    snapshot = store.get_status("t-5")
    assert snapshot["status"] == "failed"
    assert snapshot["error"] == "LLM timeout"
    # classroom only populated when status == ready
    assert snapshot["classroom"] is None


def test_ready_does_not_surface_stale_error(store: ClassroomRuntimeStateStore) -> None:
    """ready 状态只读 classroom，不读 error（即便 error key 曾被写过）。"""
    store.create("t-6")
    store.set_error("t-6", "transient")
    store.set_result("t-6", {"ok": True})

    snapshot = store.get_status("t-6")
    assert snapshot["status"] == "ready"
    assert snapshot["error"] is None
    assert snapshot["classroom"] == {"ok": True}


def test_job_store_alias_is_same_class() -> None:
    assert JobStore is ClassroomRuntimeStateStore


# ── Phase 3：任务框架协议桥接 ───────────────────────────────────────────────


def test_create_publishes_task_framework_snapshot_and_event(
    store: ClassroomRuntimeStateStore,
) -> None:
    """create() 后应可通过 load_task_recovery_state 拿到 snapshot + connected 事件。"""
    store.create("t-sse-1", user_id="u-1", request_id="req-1")

    recovery = store._store.load_task_recovery_state("t-sse-1")
    assert recovery.snapshot is not None
    assert recovery.snapshot["taskType"] == "classroom"
    assert recovery.snapshot["status"] == "pending"
    assert recovery.snapshot["userId"] == "u-1"
    assert len(recovery.events) >= 1
    assert recovery.events[0].task_id == "t-sse-1"


def test_set_status_appends_progress_event_with_classroom_status_context(
    store: ClassroomRuntimeStateStore,
) -> None:
    store.create("t-sse-2", user_id="u-2", request_id=None)
    store.set_status("t-sse-2", "generating_outline", message="生成大纲中…")

    recovery = store._store.load_task_recovery_state("t-sse-2")
    progress_events = [e for e in recovery.events if e.event == "progress"]
    assert progress_events, "expected at least one progress event after set_status"
    latest = progress_events[-1]
    assert latest.status == "processing"
    assert latest.message == "生成大纲中…"
    assert latest.context.get("classroomStatus") == "generating_outline"


def test_set_result_emits_completed_event_with_task_status_completed(
    store: ClassroomRuntimeStateStore,
) -> None:
    store.create("t-sse-3", user_id="u-3")
    store.set_result("t-sse-3", {"id": "cls-1", "scenes": []})

    recovery = store._store.load_task_recovery_state("t-sse-3")
    completed = [e for e in recovery.events if e.event == "completed"]
    assert completed, "expected a completed event after set_result"
    evt = completed[-1]
    assert evt.status == "completed"
    assert evt.progress == 100
    assert evt.context.get("result", {}).get("classroomId") == "cls-1"


def test_set_error_emits_failed_event_with_error_code(
    store: ClassroomRuntimeStateStore,
) -> None:
    store.create("t-sse-4", user_id="u-4")
    store.set_error("t-sse-4", "LLM timeout")

    recovery = store._store.load_task_recovery_state("t-sse-4")
    failed = [e for e in recovery.events if e.event == "failed"]
    assert failed, "expected a failed event after set_error"
    evt = failed[-1]
    assert evt.status == "failed"
    assert evt.error_code == "TASK_UNHANDLED_EXCEPTION"
    assert evt.message == "LLM timeout"


def test_snapshot_user_id_preserved_for_owner_check(
    store: ClassroomRuntimeStateStore,
) -> None:
    """SSE 端点会按 snapshot.userId 做归属校验，meta 中的 userId 必须一路透传。"""
    store.create("t-sse-5", user_id="owner-123")
    store.set_progress("t-sse-5", 42)

    recovery = store._store.load_task_recovery_state("t-sse-5")
    assert recovery.snapshot is not None
    assert recovery.snapshot["userId"] == "owner-123"
