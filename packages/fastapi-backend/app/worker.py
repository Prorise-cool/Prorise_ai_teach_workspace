"""Dramatiq Worker 入口与任务消费器。"""

from __future__ import annotations


import asyncio
import time
from threading import Lock

import dramatiq
from dramatiq.middleware.time_limit import TimeLimitExceeded

from app.core.config import get_settings
from app.core.logging import (
    EMPTY_TRACE_VALUE,
    bind_trace_context,
    format_trace_timestamp,
    get_logger,
    reset_trace_context,
)
from app.features.video.pipeline.models import VideoResultDetail, VideoStage
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_failure,
    merge_result_detail,
)
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
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus

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

logger = get_logger("app.worker")


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
            time_limit=settings.dramatiq_task_time_limit_ms,
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


def _resolve_video_timeout_stage(state: dict[str, object] | None) -> VideoStage:
    context = state.get("context") if isinstance(state, dict) else None
    if isinstance(context, dict):
        for key in ("currentStage", "current_stage", "stage"):
            raw_value = context.get(key)
            if not isinstance(raw_value, str):
                continue
            try:
                return VideoStage(raw_value)
            except ValueError:
                continue
    return VideoStage.RENDER


def _persist_video_timeout_detail(
    *,
    context: TaskContext,
    message: str,
    error_code: TaskErrorCode,
    state: dict[str, object] | None,
) -> None:
    if runtime_store is None:
        return

    runtime = VideoRuntimeStateStore(runtime_store, context.task_id)
    current = runtime.load_model("result_detail", VideoResultDetail)
    if current is not None and current.status == "completed":
        return

    failure = build_failure(
        task_id=context.task_id,
        stage=_resolve_video_timeout_stage(state),
        error_code=error_code,
        message=message,
        failed_at=format_trace_timestamp(),
    )
    detail = merge_result_detail(
        current,
        status="failed",
        failure=failure.model_dump(mode="json", by_alias=True),
    )
    runtime.save_model("result_detail", detail)


def _emit_worker_timeout_snapshot(
    *,
    scheduler: TaskScheduler,
    context: TaskContext,
    task_type: str,
    elapsed_ms: int,
    budget_ms: int,
) -> None:
    if runtime_store is None:
        return

    state = runtime_store.get_task_state(context.task_id)
    existing_context = state.get("context") if isinstance(state, dict) else None
    payload = dict(existing_context) if isinstance(existing_context, dict) else {}
    payload.update(
        {
            "workerTimeout": True,
            "elapsedMs": elapsed_ms,
            "timeLimitMs": budget_ms,
            "timedOutAt": format_trace_timestamp(),
        }
    )
    progress = int(state.get("progress") or 0) if isinstance(state, dict) else 0
    message = f"任务执行超时，已达到 Worker 上限 {budget_ms}ms"

    scheduler._emit_snapshot(
        context=context,
        internal_status=TaskInternalStatus.ERROR,
        progress=progress,
        message=message,
        error_code=TaskErrorCode.EXECUTION_TIMEOUT,
        event="failed",
        payload=payload,
    )

    if task_type == "video":
        _persist_video_timeout_detail(
            context=context,
            message=message,
            error_code=TaskErrorCode.EXECUTION_TIMEOUT,
            state=state,
        )


def consume_task_message(task_type: str, context_payload: dict[str, object]) -> dict[str, object]:
    """消费 Dramatiq 任务消息并同步执行。"""
    _ensure_initialized()
    context = deserialize_task_context(context_payload)
    budget_ms = int(getattr(settings, "dramatiq_task_time_limit_ms", 0) or 0)
    trace_tokens = bind_trace_context(
        request_id=context.request_id or EMPTY_TRACE_VALUE,
        task_id=context.task_id,
        error_code=EMPTY_TRACE_VALUE,
    )
    started_at = time.monotonic()
    task = build_task(task_type, context)
    scheduler = TaskScheduler(runtime_store=runtime_store)

    try:
        logger.info(
            "Task worker execution started task_type=%s budget_ms=%s",
            task_type,
            budget_ms,
        )
        try:
            result = asyncio.run(scheduler.dispatch(task, emit_queued_snapshot=False))
        except TimeLimitExceeded:
            elapsed_ms = round((time.monotonic() - started_at) * 1000)
            error_tokens = bind_trace_context(
                error_code=TaskErrorCode.EXECUTION_TIMEOUT.value
            )
            try:
                logger.error(
                    "Task worker execution exceeded time limit task_type=%s "
                    "elapsed_ms=%s budget_ms=%s",
                    task_type,
                    elapsed_ms,
                    budget_ms,
                )
            finally:
                reset_trace_context(error_tokens)

            _emit_worker_timeout_snapshot(
                scheduler=scheduler,
                context=context,
                task_type=task_type,
                elapsed_ms=elapsed_ms,
                budget_ms=budget_ms,
            )
            return {
                "taskId": context.task_id,
                "taskType": task_type,
                "status": "failed",
                "progress": 0,
                "message": f"任务执行超时，已达到 Worker 上限 {budget_ms}ms",
                "errorCode": TaskErrorCode.EXECUTION_TIMEOUT.value,
            }

        elapsed_ms = round((time.monotonic() - started_at) * 1000)
        logger.info(
            "Task worker execution finished task_type=%s status=%s elapsed_ms=%s budget_ms=%s",
            task_type,
            result.status.value,
            elapsed_ms,
            budget_ms,
        )
        return {
            "taskId": context.task_id,
            "taskType": task_type,
            "status": result.status.value,
            "progress": result.progress,
            "message": result.message,
            "errorCode": str(result.error_code) if result.error_code is not None else None,
        }
    finally:
        reset_trace_context(trace_tokens)


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
