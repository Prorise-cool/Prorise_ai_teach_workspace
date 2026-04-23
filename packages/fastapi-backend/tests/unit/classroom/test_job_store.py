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
