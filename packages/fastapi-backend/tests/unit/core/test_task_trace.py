import asyncio
import re

from app.infra.sse_broker import InMemorySseBroker
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.scheduler import TaskScheduler, create_task_context, generate_task_id
from app.shared.task_framework.status import TaskStatus

TASK_ID_PATTERN = re.compile(r"^video_\d{14}_[0-9a-f]{8}$")


class SuccessfulDemoTask(BaseTask):
    async def run(self) -> TaskResult:
        self.logger.info("Demo task running")
        return TaskResult(status=TaskStatus.COMPLETED, message="任务执行完成")


class FailingDemoTask(BaseTask):
    async def run(self) -> TaskResult:
        self.logger.info("Demo task failing")
        raise RuntimeError("provider offline")


def test_generate_task_id_matches_architecture_rule() -> None:
    assert TASK_ID_PATTERN.fullmatch(generate_task_id("video"))


def test_create_task_context_preserves_request_id_and_logs_creation(caplog) -> None:
    request_id = "gateway_request_1234"

    with caplog.at_level("INFO"):
        context = create_task_context(
            prefix="video",
            task_type="video",
            user_id="student-1",
            request_id=request_id
        )

    assert context.request_id == request_id
    assert TASK_ID_PATTERN.fullmatch(context.task_id)

    creation_records = [
        record
        for record in caplog.records
        if record.name == "app.task.scheduler" and "Task context created" in record.getMessage()
    ]
    assert creation_records
    assert creation_records[-1].request_id == request_id
    assert creation_records[-1].task_id == context.task_id


def test_task_scheduler_keeps_request_id_and_task_id_through_success_logs_and_sse(caplog) -> None:
    broker = InMemorySseBroker()
    scheduler = TaskScheduler(broker)
    context = TaskContext(
        task_id=generate_task_id("video"),
        task_type="video",
        user_id="student-1",
        request_id="gateway_request_5678"
    )

    with caplog.at_level("INFO"):
        result = asyncio.run(scheduler.dispatch(SuccessfulDemoTask(context)))

    assert result.status == TaskStatus.COMPLETED

    events = broker.replay(context.task_id)
    assert [event.event for event in events] == ["progress", "completed"]
    assert all(event.task_id == context.task_id for event in events)
    assert all(event.request_id == context.request_id for event in events)
    assert all(
        re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", event.timestamp)
        for event in events
    )

    trace_records = [
        record
        for record in caplog.records
        if record.name in {"app.task.scheduler", "app.tasks.video", "app.infra.sse_broker"}
    ]
    assert trace_records
    assert any(
        record.request_id == context.request_id and record.task_id == context.task_id
        for record in trace_records
    )


def test_task_scheduler_keeps_task_id_in_failure_logs_and_sse(caplog) -> None:
    broker = InMemorySseBroker()
    scheduler = TaskScheduler(broker)
    context = TaskContext(
        task_id=generate_task_id("video"),
        task_type="video",
        user_id="student-1",
        request_id="gateway_request_9012"
    )

    with caplog.at_level("INFO"):
        result = asyncio.run(scheduler.dispatch(FailingDemoTask(context)))

    assert result.status == TaskStatus.FAILED
    assert result.error_code == "TASK_UNHANDLED_EXCEPTION"

    events = broker.replay(context.task_id)
    assert [event.event for event in events] == ["progress", "failed"]
    assert events[-1].error_code == "TASK_UNHANDLED_EXCEPTION"
    assert all(event.request_id == context.request_id for event in events)

    failure_records = [
        record
        for record in caplog.records
        if record.name == "app.task.scheduler" and record.levelname in {"ERROR", "CRITICAL"}
    ]
    assert failure_records
    assert failure_records[-1].request_id == context.request_id
    assert failure_records[-1].task_id == context.task_id
    assert failure_records[-1].error_code == "TASK_UNHANDLED_EXCEPTION"
