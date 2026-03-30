import asyncio

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
