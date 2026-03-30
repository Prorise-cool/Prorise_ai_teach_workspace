import importlib

from dramatiq import Worker
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.shared.task_framework.demo_task import DemoTask
from app.shared.task_framework.scheduler import create_task_context


def _load_stub_runtime(monkeypatch):
    monkeypatch.setenv("FASTAPI_DRAMATIQ_BROKER_BACKEND", "stub")
    get_settings.cache_clear()

    import app.worker as worker_module
    import app.core.lifespan as lifespan_module
    import app.main as main_module

    worker_module = importlib.reload(worker_module)
    importlib.reload(lifespan_module)
    main_module = importlib.reload(main_module)
    worker_module.runtime_store.clear()
    return worker_module, main_module


def test_demo_task_dispatches_through_dramatiq_worker_and_completes(monkeypatch) -> None:
    worker_module, main_module = _load_stub_runtime(monkeypatch)
    worker = Worker(worker_module.broker, worker_timeout=100)
    worker.start()

    try:
        with TestClient(main_module.create_app()) as client:
            scheduler = client.app.state.task_scheduler
            context = create_task_context(
                prefix="video",
                task_type="demo",
                user_id="student-1",
                request_id="gateway_request_demo_001",
                source_module="video",
            )

            receipt = scheduler.enqueue_task(task_type="demo", context=context)
            queued_state = client.app.state.runtime_store.get_task_state(context.task_id)

            assert receipt.message_id
            assert queued_state["internalStatus"] == "queued"
            assert queued_state["status"] == "pending"

            worker_module.broker.join(worker_module.task_actor.queue_name)
            worker.join()

            completed_state = client.app.state.runtime_store.get_task_state(context.task_id)
            completed_events = client.app.state.runtime_store.get_task_events(context.task_id)

            assert completed_state["internalStatus"] == "succeeded"
            assert completed_state["status"] == "completed"
            assert completed_state["progress"] == 100
            assert [event.event for event in completed_events] == ["progress", "completed"]
    finally:
        worker.stop()
        worker_module.runtime_store.clear()
        get_settings.cache_clear()


def test_failed_demo_task_does_not_remain_processing(monkeypatch) -> None:
    worker_module, main_module = _load_stub_runtime(monkeypatch)
    worker = Worker(worker_module.broker, worker_timeout=100)
    worker.start()

    try:
        with TestClient(main_module.create_app()) as client:
            scheduler = client.app.state.task_scheduler
            context = create_task_context(
                prefix="video",
                task_type="demo",
                user_id="student-2",
                request_id="gateway_request_demo_002",
                source_module="video",
            )
            context.metadata["should_fail"] = True

            scheduler.enqueue_task(task_type="demo", context=context)

            worker_module.broker.join(worker_module.task_actor.queue_name, fail_fast=True)
            worker.join()

            failed_state = client.app.state.runtime_store.get_task_state(context.task_id)
            failed_events = client.app.state.runtime_store.get_task_events(context.task_id)

            assert failed_state["internalStatus"] == "error"
            assert failed_state["status"] == "failed"
            assert failed_state["errorCode"] == "TASK_UNHANDLED_EXCEPTION"
            assert [event.event for event in failed_events] == ["progress", "failed"]
    finally:
        worker.stop()
        worker_module.runtime_store.clear()
        get_settings.cache_clear()


def test_multiple_task_types_can_share_the_same_queue_runtime(monkeypatch) -> None:
    worker_module, main_module = _load_stub_runtime(monkeypatch)
    worker_module.register_task("demo-secondary", lambda context: DemoTask(context))
    worker = Worker(worker_module.broker, worker_timeout=100)
    worker.start()

    try:
        with TestClient(main_module.create_app()) as client:
            scheduler = client.app.state.task_scheduler
            primary_context = create_task_context(
                prefix="video",
                task_type="demo",
                user_id="student-3",
                request_id="gateway_request_demo_003",
                source_module="video",
            )
            secondary_context = create_task_context(
                prefix="classroom",
                task_type="demo-secondary",
                user_id="student-4",
                request_id="gateway_request_demo_004",
                source_module="classroom",
            )

            scheduler.enqueue_task(task_type="demo", context=primary_context)
            scheduler.enqueue_task(task_type="demo-secondary", context=secondary_context)

            worker_module.broker.join(worker_module.task_actor.queue_name)
            worker.join()

            primary_state = client.app.state.runtime_store.get_task_state(primary_context.task_id)
            secondary_state = client.app.state.runtime_store.get_task_state(secondary_context.task_id)

            assert primary_state["status"] == "completed"
            assert secondary_state["status"] == "completed"
            assert primary_state["taskType"] == "demo"
            assert secondary_state["taskType"] == "demo-secondary"
    finally:
        worker.stop()
        worker_module.runtime_store.clear()
        get_settings.cache_clear()
