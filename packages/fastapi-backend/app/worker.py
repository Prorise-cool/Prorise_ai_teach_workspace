from __future__ import annotations

import asyncio

import dramatiq

from app.core.config import get_settings
from app.features.video.service import VideoService
from app.features.video.tasks.video_task_actor import VideoTask
from app.infra.redis_client import create_dramatiq_broker, create_runtime_store
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.demo_task import DemoTask
from app.shared.task_framework.scheduler import (
    TaskScheduler,
    build_task,
    deserialize_task_context,
    register_task,
)


def build_demo_task(context: TaskContext) -> DemoTask:
    return DemoTask(
        context,
        should_fail=bool(context.metadata.get("should_fail", False)),
    )


def build_video_worker_task(context: TaskContext) -> VideoTask:
    return VideoTask(
        context,
        runtime_store=runtime_store,
        metadata_service=video_metadata_service,
    )


settings = get_settings()
runtime_store = create_runtime_store(settings)
broker = create_dramatiq_broker(settings)
video_metadata_service = VideoService()
dramatiq.set_broker(broker)
register_task("demo", build_demo_task)
register_task("video", build_video_worker_task)


def consume_task_message(task_type: str, context_payload: dict[str, object]) -> dict[str, object]:
    context = deserialize_task_context(context_payload)
    task = build_task(task_type, context)
    scheduler = TaskScheduler(runtime_store=runtime_store)
    result = asyncio.run(scheduler.dispatch(task, emit_queued_snapshot=False))
    return {
        "taskId": context.task_id,
        "taskType": task_type,
        "status": result.status.value,
        "progress": result.progress,
        "message": result.message,
        "errorCode": result.error_code.value if result.error_code is not None else None,
    }


task_actor = dramatiq.actor(
    queue_name=settings.dramatiq_queue_name,
    actor_name="execute_task",
    max_retries=0,
)(consume_task_message)


def send_task_message(task_type: str, context_payload: dict[str, object]) -> str:
    message = task_actor.send(task_type, context_payload)
    return message.message_id


def create_web_task_scheduler() -> TaskScheduler:
    return TaskScheduler(runtime_store=runtime_store, queue_dispatcher=send_task_message)
