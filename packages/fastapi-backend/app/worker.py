"""Dramatiq Worker 入口与任务消费器。"""

from __future__ import annotations


import asyncio
from threading import Lock

import dramatiq

from app.core.config import get_settings
from app.features.video.service import VideoService
from app.features.video.tasks.video_task_actor import VideoTask
from app.infra.redis_client import RuntimeStore, create_dramatiq_broker, create_runtime_store
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.demo_task import DemoTask
from app.shared.task_framework.scheduler import (
    TaskScheduler,
    build_task,
    deserialize_task_context,
    register_task,
)

# ---------------------------------------------------------------------------
# 延迟初始化：避免 import app.worker 时立即创建 Redis 连接和加载配置
# ---------------------------------------------------------------------------

_init_lock = Lock()
_initialized = False

settings: object = None
runtime_store: RuntimeStore | None = None
broker: object = None
video_metadata_service: VideoService | None = None
task_actor: object = None


def _ensure_initialized() -> None:
    """首次调用时执行模块级初始化，后续调用直接返回。线程安全。"""
    global _initialized, settings, runtime_store, broker, video_metadata_service, task_actor

    if _initialized:
        return

    with _init_lock:
        if _initialized:
            return

        settings = get_settings()
        runtime_store = create_runtime_store(settings)
        broker = create_dramatiq_broker(settings)
        video_metadata_service = VideoService()
        dramatiq.set_broker(broker)
        register_task("demo", build_demo_task)
        register_task("video", build_video_worker_task)

        task_actor = dramatiq.actor(
            queue_name=settings.dramatiq_queue_name,
            actor_name="execute_task",
            max_retries=0,
        )(consume_task_message)

        _initialized = True


def get_runtime_store() -> RuntimeStore:
    """获取运行态存储实例（延迟初始化）。"""
    _ensure_initialized()
    assert runtime_store is not None
    return runtime_store


def get_broker():
    """获取 Dramatiq broker 实例（延迟初始化）。"""
    _ensure_initialized()
    return broker


def build_demo_task(context: TaskContext) -> DemoTask:
    """构建 DemoTask 实例的工厂函数。"""
    return DemoTask(
        context,
        should_fail=bool(context.metadata.get("should_fail", False)),
    )


def build_video_worker_task(context: TaskContext) -> VideoTask:
    """构建 VideoTask 实例的 Worker 工厂函数。"""
    _ensure_initialized()
    return VideoTask(
        context,
        runtime_store=runtime_store,
        metadata_service=video_metadata_service,
    )


def consume_task_message(task_type: str, context_payload: dict[str, object]) -> dict[str, object]:
    """消费 Dramatiq 任务消息并同步执行。"""
    _ensure_initialized()
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


def send_task_message(task_type: str, context_payload: dict[str, object]) -> str:
    """发送任务消息到 Dramatiq 队列。"""
    _ensure_initialized()
    message = task_actor.send(task_type, context_payload)
    return message.message_id


def create_web_task_scheduler() -> TaskScheduler:
    """创建面向 Web 层的任务调度器。"""
    _ensure_initialized()
    return TaskScheduler(runtime_store=runtime_store, queue_dispatcher=send_task_message)


def _reset_module_state() -> None:
    """仅供测试使用：重置模块级状态以便 reload 或重新初始化。"""
    global _initialized, settings, runtime_store, broker, video_metadata_service, task_actor
    with _init_lock:
        _initialized = False
        settings = None
        runtime_store = None
        broker = None
        video_metadata_service = None
        task_actor = None


# dramatiq 发现 actor 时需要模块已被初始化，通过 dramatiq CLI 加载时触发
# 当 dramatiq 以 `python -m dramatiq app.worker` 启动时，模块被 import 后
# dramatiq 会扫描模块级的 actor，因此需要在模块加载时立即初始化
_ensure_initialized()
