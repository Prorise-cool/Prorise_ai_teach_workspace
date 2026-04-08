import importlib

from dramatiq import Worker
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import AccessContext
from app.providers.factory import ProviderFactory
from tests.conftest import override_auth
from app.providers.protocols import ProviderCapability, ProviderResult, ProviderRuntimeConfig
from app.providers.registry import ProviderRegistry
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.demo_task import DemoTask
from app.shared.task_framework.scheduler import create_task_context


class TimeoutLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        raise TimeoutError(f"{self.provider_id} timed out while handling {prompt}")


class BackupLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        return ProviderResult(provider=self.provider_id, content=f"backup:{prompt}")


def _build_provider_factory() -> ProviderFactory:
    registry = ProviderRegistry()
    registry.register(ProviderCapability.LLM, "timeout-chat", TimeoutLLMProvider, default_priority=1)
    registry.register(ProviderCapability.LLM, "backup-chat", BackupLLMProvider, default_priority=2)
    return ProviderFactory(registry)


class ProviderSwitchDemoTask(BaseTask):
    async def run(self) -> TaskResult:
        provider_result = await _build_provider_factory().generate_with_failover(
            [{"provider": "timeout-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
            "lesson",
            emit_switch=self.create_provider_switch_emitter(
                progress=45,
                stage="provider_failover",
            ),
        )
        return TaskResult.completed(
            message="Demo task 执行完成",
            context={
                "stage": "completed",
                "result": {
                    "provider": provider_result.provider,
                    "content": provider_result.content,
                },
            },
        )


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


def test_provider_switch_events_are_published_into_runtime_stream(monkeypatch) -> None:
    worker_module, main_module = _load_stub_runtime(monkeypatch)
    worker_module.register_task(
        "demo-provider-switch",
        lambda context: ProviderSwitchDemoTask(context),
    )
    worker = Worker(worker_module.broker, worker_timeout=100)
    worker.start()

    try:
        with TestClient(main_module.create_app()) as client:
            scheduler = client.app.state.task_scheduler
            context = create_task_context(
                prefix="video",
                task_type="demo-provider-switch",
                user_id="student-5",
                request_id="gateway_request_demo_005",
                source_module="video",
            )
            override_auth(
                client.app,
                AccessContext(
                    user_id=context.user_id,
                    username="student_demo",
                    roles=("student",),
                    permissions=("*:*:*",),
                    token="test-token-for-unit-tests",
                    client_id="test-client-id",
                    request_id=context.request_id,
                    online_ttl_seconds=86400,
                ),
            )

            scheduler.enqueue_task(task_type="demo-provider-switch", context=context)

            worker_module.broker.join(worker_module.task_actor.queue_name)
            worker.join()

            events = client.app.state.runtime_store.get_task_events(context.task_id)
            event_names = [event.event for event in events]

            assert event_names == ["progress", "provider_switch", "completed"]
            assert events[1].from_ == "timeout-chat"
            assert events[1].to == "backup-chat"
            assert events[1].stage == "provider_failover"
            assert events[2].result == {
                "provider": "backup-chat",
                "content": "backup:lesson",
            }

            response = client.get(
                f"/api/v1/tasks/{context.task_id}/events",
                headers={"Last-Event-ID": events[0].id or ""},
            )

        worker_module.runtime_store.clear()

    finally:
        worker.stop()
        get_settings.cache_clear()

    assert response.status_code == 200
    assert "event: provider_switch" in response.text
    assert '"from":"timeout-chat"' in response.text
    assert '"to":"backup-chat"' in response.text
