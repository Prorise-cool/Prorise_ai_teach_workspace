from __future__ import annotations

import importlib

from dramatiq.middleware.time_limit import TimeLimitExceeded

from app.core.config import get_settings
from app.features.video.pipeline.models import VideoResultDetail
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.shared.task_framework.scheduler import create_task_context, serialize_task_context
from app.shared.task_framework.status import TaskInternalStatus


def _load_stub_worker(monkeypatch):
    monkeypatch.setenv("FASTAPI_DRAMATIQ_BROKER_BACKEND", "stub")
    get_settings.cache_clear()

    import app.worker as worker_module

    worker_module = importlib.reload(worker_module)
    worker_module.runtime_store.clear()
    return worker_module


def test_consume_task_message_marks_timeout_and_persists_failure_detail(monkeypatch) -> None:
    worker_module = _load_stub_worker(monkeypatch)
    settings = get_settings()

    context = create_task_context(
        prefix="vtask",
        task_type="video",
        user_id="student-timeout",
        request_id="req_worker_timeout_001",
        source_module="video.create_task",
    )
    context.metadata["inputType"] = "text"
    context.metadata["sourcePayload"] = {"text": "请解释什么是一元二次方程组"}

    worker_module.runtime_store.set_task_state(
        task_id=context.task_id,
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="正在渲染动画",
        progress=68,
        request_id=context.request_id,
        user_id=context.user_id,
        source=context.source_module,
        context={
            "stage": "render",
            "stageLabel": "渲染动画",
            "stageProgress": 80,
        },
    )

    def fake_asyncio_run(coro):
        coro.close()
        raise TimeLimitExceeded()

    monkeypatch.setattr(worker_module.asyncio, "run", fake_asyncio_run)

    payload = serialize_task_context(context)
    result = worker_module.consume_task_message("video", payload)

    assert result["status"] == "failed"
    assert result["errorCode"] == "TASK_EXECUTION_TIMEOUT"

    state = worker_module.runtime_store.get_task_state(context.task_id)
    assert state is not None
    assert state["status"] == "failed"
    assert state["internalStatus"] == "error"
    assert state["progress"] == 68
    assert state["errorCode"] == "TASK_EXECUTION_TIMEOUT"
    assert state["context"]["workerTimeout"] is True
    assert state["context"]["timeLimitMs"] == settings.dramatiq_task_time_limit_ms

    events = worker_module.runtime_store.get_task_events(context.task_id)
    assert len(events) == 1
    assert events[0].event == "failed"
    assert events[0].error_code == "TASK_EXECUTION_TIMEOUT"

    runtime = VideoRuntimeStateStore(worker_module.runtime_store, context.task_id)
    detail = runtime.load_model("result_detail", VideoResultDetail)
    assert detail is not None
    assert detail.status == "failed"
    assert detail.failure is not None
    assert detail.failure.error_code == "TASK_EXECUTION_TIMEOUT"
    assert detail.failure.failed_stage == "render"

    worker_module.runtime_store.clear()
    get_settings.cache_clear()
