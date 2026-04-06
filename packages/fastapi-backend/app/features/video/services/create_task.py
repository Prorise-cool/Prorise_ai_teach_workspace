"""Story 3.4: 视频任务创建服务。

负责任务受理全链路：
  校验 → 幂等检查 → 生成 taskId → Redis 运行态写入
  → RuoYi 元数据写入（MVP 降级） → Dramatiq 任务分发 → 返回 202
"""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.core.errors import AppError
from app.core.logging import get_logger
from app.features.video.schemas.video_task import (
    CreateVideoTaskRequest,
    CreateVideoTaskResponse,
    IdempotentConflictResponse,
    VideoErrorCode,
)
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.key_builder import TASK_RUNTIME_TTL_SECONDS
from app.shared.task_framework.scheduler import (
    register_task,
    serialize_task_context,
)
from app.shared.task_framework.status import TaskInternalStatus

if TYPE_CHECKING:
    from app.infra.redis_client import RuntimeStore
    from app.shared.task_framework.scheduler import TaskScheduler

logger = get_logger("app.features.video.create_task")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VIDEO_TASK_TYPE = "video"
TASK_ID_PREFIX = "vtask"
IDEMPOTENT_KEY_PREFIX = "xm_idempotent:video:"
IDEMPOTENT_TTL_SECONDS = 24 * 60 * 60  # 24 小时


# ---------------------------------------------------------------------------
# Task ID 生成（ULID 风格）
# ---------------------------------------------------------------------------

def _generate_video_task_id() -> str:
    """生成 vtask_<ulid> 格式的任务 ID。

    使用时间戳 + uuid4 short 作为 MVP 实现，
    保证唯一性和时间排序能力。
    """
    from uuid import uuid4

    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    short_uuid = uuid4().hex[:12]
    return f"{TASK_ID_PREFIX}_{timestamp}_{short_uuid}"


# ---------------------------------------------------------------------------
# 幂等处理
# ---------------------------------------------------------------------------

def _build_idempotent_key(client_request_id: str) -> str:
    return f"{IDEMPOTENT_KEY_PREFIX}{client_request_id}"


def check_idempotency(
    runtime_store: RuntimeStore,
    client_request_id: str | None,
) -> IdempotentConflictResponse | None:
    """检查幂等键是否已存在。

    Returns:
        已存在时返回 IdempotentConflictResponse，否则 None。
    """
    if client_request_id is None:
        return None

    key = _build_idempotent_key(client_request_id)
    raw = runtime_store.get_runtime_value(key)
    if raw is None:
        return None

    existing = raw if isinstance(raw, dict) else {}
    return IdempotentConflictResponse(
        task_id=str(existing.get("taskId", "")),
        task_type="video",
        status=str(existing.get("status", "pending")),
        created_at=existing.get("createdAt"),
    )


def save_idempotency(
    runtime_store: RuntimeStore,
    client_request_id: str | None,
    task_id: str,
    created_at: datetime,
) -> None:
    """写入幂等键到 Redis。"""
    if client_request_id is None:
        return

    key = _build_idempotent_key(client_request_id)
    payload = {
        "taskId": task_id,
        "status": "pending",
        "createdAt": created_at.isoformat(),
    }
    runtime_store.set_runtime_value(
        key,
        payload,
        ttl_seconds=IDEMPOTENT_TTL_SECONDS,
    )


# ---------------------------------------------------------------------------
# Redis 运行态初始化
# ---------------------------------------------------------------------------

def init_task_runtime_state(
    runtime_store: RuntimeStore,
    task_id: str,
    *,
    request_id: str | None = None,
    user_id: str | None = None,
) -> dict[str, object]:
    """写入 task:{taskId}:status 运行态初始快照。

    与 SSE 事件和 GET /status 查询共享同一份数据。
    """
    return runtime_store.set_task_state(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        internal_status=TaskInternalStatus.QUEUED,
        message="任务已创建，等待处理",
        progress=0,
        request_id=request_id,
        source="video.create_task",
    )


# ---------------------------------------------------------------------------
# RuoYi 元数据写入（MVP 降级为日志 + 跳过）
# ---------------------------------------------------------------------------

async def persist_ruoyi_metadata(
    task_id: str,
    request: CreateVideoTaskRequest,
    *,
    user_id: str,
    created_at: datetime,
) -> bool:
    """写入 RuoYi 视频任务元数据。

    MVP 阶段若 RuoYi 不可用，降级为仅 Redis 运行态，不阻断创建流程。

    Returns:
        True 表示成功，False 表示降级跳过。
    """
    try:
        from app.shared.ruoyi_client import RuoYiClient

        async with RuoYiClient.from_settings() as client:
            await client.post_single(
                "/video/task",
                resource="video-task",
                operation="create",
                json_body={
                    "taskId": task_id,
                    "userId": user_id,
                    "taskType": VIDEO_TASK_TYPE,
                    "inputType": request.input_type.value,
                    "summary": request.summary or request.source_payload[:200],
                    "taskState": "pending",
                    "createTime": created_at.strftime("%Y-%m-%d %H:%M:%S"),
                },
                retry_enabled=False,
            )
        logger.info("RuoYi metadata persisted task_id=%s", task_id)
        return True
    except Exception:
        logger.warning(
            "RuoYi metadata write degraded (skipped) task_id=%s",
            task_id,
            exc_info=True,
        )
        return False


# ---------------------------------------------------------------------------
# Dramatiq 任务分发
# ---------------------------------------------------------------------------

def dispatch_to_dramatiq(
    scheduler: TaskScheduler,
    context: TaskContext,
    request: CreateVideoTaskRequest,
) -> str:
    """分发异步视频任务消息到 Dramatiq + Redis broker。

    Returns:
        message_id

    Raises:
        AppError: 分发失败时标记任务为 failed 并抛出 500。
    """
    try:
        receipt = scheduler.enqueue_task(
            task_type=VIDEO_TASK_TYPE,
            context=context,
        )
        logger.info(
            "Dramatiq message dispatched task_id=%s message_id=%s",
            context.task_id,
            receipt.message_id,
        )
        return receipt.message_id
    except Exception as exc:
        logger.error(
            "Dramatiq dispatch failed task_id=%s",
            context.task_id,
            exc_info=True,
        )
        raise AppError(
            code=VideoErrorCode.VIDEO_DISPATCH_FAILED,
            message="任务分发失败，请稍后重试",
            status_code=500,
            retryable=True,
            task_id=context.task_id,
        ) from exc


# ---------------------------------------------------------------------------
# 主服务入口
# ---------------------------------------------------------------------------

async def create_video_task(
    request: CreateVideoTaskRequest,
    *,
    user_id: str,
    request_id: str | None = None,
    runtime_store: RuntimeStore,
    scheduler: TaskScheduler,
) -> CreateVideoTaskResponse | IdempotentConflictResponse:
    """视频任务创建全链路。

    1. 幂等检查
    2. 生成 taskId
    3. Redis 运行态初始化
    4. RuoYi 元数据写入（降级）
    5. Dramatiq 任务分发
    6. 幂等键回写
    7. 返回 202 payload

    Args:
        request: 创建请求体。
        user_id: 当前用户 ID。
        request_id: 请求追踪 ID。
        runtime_store: Redis 运行态存储。
        scheduler: 任务调度器。

    Returns:
        CreateVideoTaskResponse 或 IdempotentConflictResponse。

    Raises:
        AppError: 分发失败等异常。
    """
    # Step 1: 幂等检查
    conflict = check_idempotency(runtime_store, request.client_request_id)
    if conflict is not None:
        return conflict

    # Step 2: 生成 taskId
    task_id = _generate_video_task_id()
    created_at = datetime.now(UTC)

    # Step 3: Redis 运行态初始化
    init_task_runtime_state(
        runtime_store,
        task_id,
        request_id=request_id,
        user_id=user_id,
    )

    # Step 4: RuoYi 元数据写入（MVP 降级不阻断）
    await persist_ruoyi_metadata(
        task_id,
        request,
        user_id=user_id,
        created_at=created_at,
    )

    # Step 5: 构建 TaskContext + Dramatiq 分发
    context = TaskContext(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        user_id=user_id,
        request_id=request_id,
        source_module="video.create_task",
        metadata={
            "inputType": request.input_type.value,
            "sourcePayload": request.source_payload,
            "userProfile": request.user_profile or {},
            "summary": request.summary or request.source_payload[:200],
        },
    )
    dispatch_to_dramatiq(scheduler, context, request)

    # Step 6: 幂等键回写
    save_idempotency(runtime_store, request.client_request_id, task_id, created_at)

    # Step 7: 返回 202 payload
    logger.info("Video task created task_id=%s user_id=%s", task_id, user_id)
    return CreateVideoTaskResponse(
        task_id=task_id,
        task_type="video",
        status="pending",
        created_at=created_at,
    )
