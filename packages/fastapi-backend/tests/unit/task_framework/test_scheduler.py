import asyncio

from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.key_builder import build_task_events_key, build_task_runtime_key
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.demo_task import DemoTask
from app.shared.task_framework.publisher import InMemoryTaskEventPublisher
from app.shared.task_framework.runtime import InMemoryTaskRuntimeRecorder
from app.shared.task_framework.scheduler import TaskScheduler, create_task_context
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, TaskStatus


class OrderedTask(BaseTask):
    def __init__(self, context: TaskContext) -> None:
        super().__init__(context)
        self.calls: list[str] = []

    async def prepare(self) -> None:
        self.calls.append("prepare")

    async def run(self) -> TaskResult:
        self.calls.append("run")
        return TaskResult.completed(
            "任务执行完成",
            progress=100,
            context={"requestId": self.context.request_id or ""}
        )

    async def finalize(self, result: TaskResult) -> TaskResult:
        self.calls.append("finalize")
        return result


class ExplodingTask(OrderedTask):
    async def run(self) -> TaskResult:
        self.calls.append("run")
        raise RuntimeError("provider offline")

    async def handle_error(self, exc: Exception) -> TaskResult:
        self.calls.append("handle_error")
        return await super().handle_error(exc)


class DomainFailureError(RuntimeError):
    def __init__(self, message: str, *, error_code: str) -> None:
        super().__init__(message)
        self.error_code = error_code


class DomainExplodingTask(OrderedTask):
    async def run(self) -> TaskResult:
        self.calls.append("run")
        raise DomainFailureError(
            "bulk code generation failed",
            error_code="VIDEO_MANIM_GEN_FAILED",
        )

    async def handle_error(self, exc: Exception) -> TaskResult:
        self.calls.append("handle_error")
        return await super().handle_error(exc)


class RichPayloadTask(OrderedTask):
    async def run(self) -> TaskResult:
        self.calls.append("run")
        return TaskResult.completed(
            "任务执行完成",
            progress=100,
            context={
                "stage": "completed",
                "result": {"videoId": "asset_001", "provider": "backup-chat"},
            },
        )


class CancelledTask(OrderedTask):
    async def run(self) -> TaskResult:
        self.calls.append("run")
        return TaskResult(
            status=TaskStatus.CANCELLED,
            message="任务已取消",
            progress=35,
            context={"stage": "cancelled"},
        )


def test_scheduler_preserves_context_and_lifecycle_order() -> None:
    publisher = InMemoryTaskEventPublisher()
    recorder = InMemoryTaskRuntimeRecorder()
    scheduler = TaskScheduler(event_publisher=publisher, runtime_recorder=recorder)
    context = create_task_context(
        prefix="video",
        task_type="video",
        user_id="student-1",
        request_id="gateway_request_1001",
        retry_count=2,
        source_module="video"
    )
    task = OrderedTask(context)

    result = asyncio.run(scheduler.dispatch(task))
    snapshots = recorder.replay(context.task_id)

    assert result.status == TaskStatus.COMPLETED
    assert task.calls == ["prepare", "run", "finalize"]
    assert [snapshot.internal_status for snapshot in snapshots] == [
        TaskInternalStatus.QUEUED,
        TaskInternalStatus.RUNNING,
        TaskInternalStatus.SUCCEEDED
    ]
    assert [snapshot.status for snapshot in snapshots] == [
        TaskStatus.PENDING,
        TaskStatus.PROCESSING,
        TaskStatus.COMPLETED
    ]
    assert snapshots[-1].request_id == context.request_id
    assert snapshots[-1].retry_count == 2
    assert snapshots[-1].source_module == "video"
    assert [event.event for event in publisher.events] == ["progress", "completed"]
    assert publisher.events[-1].snapshot.status == TaskStatus.COMPLETED


def test_scheduler_coerces_unhandled_exception_to_failed_snapshot() -> None:
    publisher = InMemoryTaskEventPublisher()
    recorder = InMemoryTaskRuntimeRecorder()
    scheduler = TaskScheduler(event_publisher=publisher, runtime_recorder=recorder)
    context = TaskContext(
        task_id="video_20260330123000_deadbeef",
        task_type="video",
        user_id="student-2",
        request_id="gateway_request_1002",
        retry_count=1,
        source_module="video"
    )
    task = ExplodingTask(context)

    result = asyncio.run(scheduler.dispatch(task))
    snapshots = recorder.replay(context.task_id)

    assert result.status == TaskStatus.FAILED
    assert result.error_code == TaskErrorCode.UNHANDLED_EXCEPTION
    assert task.calls == ["prepare", "run", "handle_error", "finalize"]
    assert [snapshot.internal_status for snapshot in snapshots] == [
        TaskInternalStatus.QUEUED,
        TaskInternalStatus.RUNNING,
        TaskInternalStatus.ERROR
    ]
    assert snapshots[-1].error_code == TaskErrorCode.UNHANDLED_EXCEPTION
    assert [event.event for event in publisher.events] == ["progress", "failed"]


def test_demo_task_success_and_failure_paths() -> None:
    success_scheduler = TaskScheduler(
        event_publisher=InMemoryTaskEventPublisher(),
        runtime_recorder=InMemoryTaskRuntimeRecorder()
    )
    failure_scheduler = TaskScheduler(
        event_publisher=InMemoryTaskEventPublisher(),
        runtime_recorder=InMemoryTaskRuntimeRecorder()
    )

    success_context = TaskContext(
        task_id="demo_success_001",
        task_type="demo",
        user_id="student-3",
        request_id="gateway_request_1003",
        source_module="demo"
    )
    failure_context = TaskContext(
        task_id="demo_failure_001",
        task_type="demo",
        user_id="student-4",
        request_id="gateway_request_1004",
        source_module="demo"
    )

    success_result = asyncio.run(success_scheduler.dispatch(DemoTask(success_context)))
    failure_result = asyncio.run(
        failure_scheduler.dispatch(DemoTask(failure_context, should_fail=True))
    )

    assert success_result.status == TaskStatus.COMPLETED
    assert success_result.context == {"sourceModule": "demo"}
    assert failure_result.status == TaskStatus.FAILED
    assert failure_result.error_code == TaskErrorCode.UNHANDLED_EXCEPTION


def test_scheduler_persists_snapshot_and_event_cache_into_runtime_store() -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    scheduler = TaskScheduler(runtime_store=runtime_store)
    context = create_task_context(
        prefix="video",
        task_type="video",
        user_id="student-5",
        request_id="gateway_request_1005",
        source_module="video"
    )
    task = OrderedTask(context)

    result = asyncio.run(scheduler.dispatch(task))
    snapshot = runtime_store.get_task_state(context.task_id)
    events = runtime_store.get_task_events(context.task_id)

    assert result.status == TaskStatus.COMPLETED
    assert snapshot["status"] == "completed"
    assert snapshot["userId"] == "student-5"
    assert snapshot["context"] == {"requestId": context.request_id}
    assert [event.event for event in events] == ["progress", "completed"]
    assert [event.sequence for event in events] == [1, 2]
    assert 0 < runtime_store.ttl(build_task_runtime_key(context.task_id))
    assert 0 < runtime_store.ttl(build_task_events_key(context.task_id))


def test_scheduler_preserves_domain_error_codes_in_runtime_state() -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    scheduler = TaskScheduler(runtime_store=runtime_store)
    context = create_task_context(
        prefix="video",
        task_type="video",
        user_id="student-domain",
        request_id="gateway_request_domain",
        source_module="video",
    )

    result = asyncio.run(scheduler.dispatch(DomainExplodingTask(context)))
    snapshot = runtime_store.get_task_state(context.task_id)
    events = runtime_store.get_task_events(context.task_id)

    assert result.status == TaskStatus.FAILED
    assert result.error_code == "VIDEO_MANIM_GEN_FAILED"
    assert snapshot["errorCode"] == "VIDEO_MANIM_GEN_FAILED"
    assert events[-1].event == "failed"
    assert events[-1].error_code == "VIDEO_MANIM_GEN_FAILED"


def test_scheduler_promotes_stage_and_result_to_top_level_sse_fields() -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    scheduler = TaskScheduler(runtime_store=runtime_store)
    context = create_task_context(
        prefix="video",
        task_type="video",
        user_id="student-6",
        request_id="gateway_request_1006",
        source_module="video",
    )

    result = asyncio.run(scheduler.dispatch(RichPayloadTask(context)))
    completed_event = runtime_store.get_task_events(context.task_id)[-1]

    assert result.status == TaskStatus.COMPLETED
    assert completed_event.event == "completed"
    assert completed_event.stage == "completed"
    assert completed_event.result == {
        "videoId": "asset_001",
        "provider": "backup-chat",
    }
    assert completed_event.context == {
        "stage": "completed",
        "result": {"videoId": "asset_001", "provider": "backup-chat"},
    }


def test_scheduler_emits_cancelled_as_terminal_event() -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    scheduler = TaskScheduler(runtime_store=runtime_store)
    context = create_task_context(
        prefix="video",
        task_type="video",
        user_id="student-7",
        request_id="gateway_request_1007",
        source_module="video",
    )

    result = asyncio.run(scheduler.dispatch(CancelledTask(context)))
    terminal_event = runtime_store.get_task_events(context.task_id)[-1]

    assert result.status == TaskStatus.CANCELLED
    assert terminal_event.event == "cancelled"
    assert terminal_event.status == TaskStatus.CANCELLED


def test_scheduler_returns_receipt_when_message_mapping_write_fails_after_dispatch() -> None:
    register_calls: list[tuple[str, str]] = []

    class FailingMappingRuntimeStore(RuntimeStore):
        def set_message_mapping(self, message_id: str, task_id: str) -> None:
            register_calls.append((message_id, task_id))
            raise RuntimeError("mapping down")

    runtime_store = FailingMappingRuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://memory",
    )
    scheduler = TaskScheduler(
        runtime_store=runtime_store,
        queue_dispatcher=lambda task_type, payload: "msg_queued_001",
    )
    context = create_task_context(
        prefix="video",
        task_type="demo",
        user_id="student-8",
        request_id="gateway_request_1008",
        source_module="video",
    )

    from app.shared.task_framework.scheduler import register_task

    register_task("demo", lambda task_context: DemoTask(task_context))
    receipt = scheduler.enqueue_task(task_type="demo", context=context)

    assert receipt.message_id == "msg_queued_001"
    assert receipt.task_id == context.task_id
    assert register_calls == [("msg_queued_001", context.task_id)]
