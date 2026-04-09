"""视频任务创建服务。"""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.errors import AppError
from app.core.logging import format_trace_timestamp, get_logger
from app.core.security import AccessContext, has_permission
from app.features.video.create_task_models import (
    CreateVideoTaskAcceptedPayload,
    CreateVideoTaskRequest,
    IdempotentConflictPayload,
)
from app.features.video.schemas import VideoTaskMetadataCreateRequest
from app.features.video.service import VideoService
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.scheduler import TaskScheduler, generate_task_id
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, TaskStatus

logger = get_logger("app.features.video.create_task")

VIDEO_TASK_TYPE = "video"
VIDEO_TASK_CREATE_PERMISSION = "video:task:add"
IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
IDEMPOTENCY_KEY_PREFIX = "xm_idempotent:video"


def ensure_video_task_create_permission(access_context: AccessContext) -> None:
    """校验当前用户是否拥有视频任务创建权限。"""
    if has_permission(access_context.permissions, VIDEO_TASK_CREATE_PERMISSION):
        return

    raise AppError(
        code="AUTH_PERMISSION_DENIED",
        message=f"当前账号缺少权限：{VIDEO_TASK_CREATE_PERMISSION}",
        status_code=403,
        details={
            "required_permission": VIDEO_TASK_CREATE_PERMISSION,
            "request_id": access_context.request_id,
        },
    )


def build_idempotency_key(user_id: str, client_request_id: str) -> str:
    """构建幂等键。"""
    return f"{IDEMPOTENCY_KEY_PREFIX}:{user_id}:{client_request_id}"


def generate_video_task_id() -> str:
    """生成唯一的视频任务 ID。"""
    return generate_task_id("vtask")


def validate_create_request(request: CreateVideoTaskRequest) -> dict[str, object]:
    """校验视频任务创建请求的输入参数。"""
    source_payload = request.source_payload

    if request.input_type == "text":
        text = source_payload.get("text")
        normalized_text = text.strip() if isinstance(text, str) else ""

        if not normalized_text:
            raise AppError(
                code=TaskErrorCode.VIDEO_INPUT_EMPTY.value,
                message="输入内容为空，请填写后重新提交",
                status_code=422,
                details={"field": "sourcePayload.text"},
            )
        if len(normalized_text) > 5000:
            raise AppError(
                code=TaskErrorCode.VIDEO_INPUT_TOO_LONG.value,
                message="输入内容不能超过 5000 个字符",
                status_code=422,
                details={"field": "sourcePayload.text", "maxLength": 5000},
            )
        return {"text": normalized_text}

    image_ref = source_payload.get("imageRef")
    normalized_image_ref = image_ref.strip() if isinstance(image_ref, str) else ""
    if not normalized_image_ref:
        raise AppError(
            code=TaskErrorCode.INVALID_INPUT.value,
            message="图片输入缺少 imageRef",
            status_code=422,
            details={"field": "sourcePayload.imageRef"},
        )

    ocr_text = source_payload.get("ocrText")
    normalized_ocr_text = ocr_text.strip() if isinstance(ocr_text, str) else None
    if normalized_ocr_text and len(normalized_ocr_text) > 5000:
        raise AppError(
            code=TaskErrorCode.VIDEO_INPUT_TOO_LONG.value,
            message="OCR 文本不能超过 5000 个字符",
            status_code=422,
            details={"field": "sourcePayload.ocrText", "maxLength": 5000},
        )

    return {
        "imageRef": normalized_image_ref,
        "ocrText": normalized_ocr_text or None,
    }


def normalize_voice_preference(request: CreateVideoTaskRequest) -> dict[str, str] | None:
    """归一化音色偏好为可序列化字典。"""
    if request.voice_preference is None:
        return None
    payload = request.voice_preference.model_dump(mode="json", by_alias=True, exclude_none=True)
    normalized = {
        str(key): str(value).strip()
        for key, value in payload.items()
        if isinstance(value, str) and value.strip()
    }
    return normalized or None


def initialize_task_runtime_state(
    runtime_store: RuntimeStore,
    *,
    task_id: str,
    created_at: str,
    request_id: str | None,
    user_id: str,
    source_payload: dict[str, object],
    voice_preference: dict[str, str] | None = None,
) -> dict[str, object]:
    """在 Redis 中初始化任务运行态。"""
    context = {"sourcePayload": source_payload}
    if voice_preference is not None:
        context["voicePreference"] = voice_preference
    return runtime_store.set_task_state(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        internal_status=TaskInternalStatus.QUEUED,
        message="任务已创建，等待处理",
        progress=0,
        request_id=request_id,
        user_id=user_id,
        source="video.create_task",
        context=context,
        created_at=created_at,
    )


def mark_dispatch_failure(
    runtime_store: RuntimeStore,
    *,
    task_id: str,
    created_at: str,
    request_id: str | None,
) -> None:
    """将任务标记为分发失败状态。"""
    runtime_store.set_task_state(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        internal_status=TaskInternalStatus.ERROR,
        message="任务分发失败",
        progress=0,
        request_id=request_id,
        error_code=TaskErrorCode.VIDEO_DISPATCH_FAILED,
        source="video.create_task",
        created_at=created_at,
    )


def read_idempotent_conflict(
    runtime_store: RuntimeStore,
    *,
    key: str,
) -> IdempotentConflictPayload | None:
    """从 Redis 读取幂等冲突信息。"""
    payload = runtime_store.get_runtime_value(key)
    if not isinstance(payload, dict):
        return None

    task_id = payload.get("taskId")
    if not isinstance(task_id, str) or not task_id:
        return None

    runtime_state = runtime_store.get_task_state(task_id) or {}
    status = runtime_state.get("status") or payload.get("status") or TaskStatus.PENDING.value
    created_at = runtime_state.get("createdAt") or payload.get("createdAt")

    return IdempotentConflictPayload(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        status=str(status),
        created_at=str(created_at) if created_at is not None else None,
    )


async def persist_video_task_metadata(
    metadata_service: VideoService,
    *,
    task_id: str,
    access_context: AccessContext,
    request: CreateVideoTaskRequest,
    source_payload: dict[str, object],
    created_at: str,
) -> None:
    """持久化视频任务元数据到 RuoYi，失败时降级。"""
    created_at_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    if request.input_type == "text":
        summary = str(source_payload["text"])[:200]
    else:
        summary = str(source_payload.get("ocrText") or "图片题目待解析")[:200]

    metadata_request = VideoTaskMetadataCreateRequest(
        task_id=task_id,
        user_id=access_context.user_id,
        status=TaskStatus.PENDING,
        summary=summary or "视频任务待处理",
        created_at=created_at_dt,
        updated_at=created_at_dt,
    )

    try:
        await metadata_service.persist_task(
            metadata_request,
            access_context=access_context,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Persist video task metadata degraded task_id=%s", task_id, exc_info=exc)


async def create_video_task(
    request: CreateVideoTaskRequest,
    *,
    access_context: AccessContext,
    runtime_store: RuntimeStore,
    scheduler: TaskScheduler,
    metadata_service: VideoService,
) -> CreateVideoTaskAcceptedPayload | IdempotentConflictPayload:
    """创建视频任务的完整流程：校验、幂等检测、入队、持久化。"""
    source_payload = validate_create_request(request)
    voice_preference = normalize_voice_preference(request)
    idempotency_key = build_idempotency_key(access_context.user_id, request.client_request_id)

    conflict = read_idempotent_conflict(runtime_store, key=idempotency_key)
    if conflict is not None:
        return conflict

    task_id = generate_video_task_id()
    created_at = format_trace_timestamp()
    if not runtime_store.claim_runtime_value(
        idempotency_key,
        {
            "taskId": task_id,
            "status": TaskStatus.PENDING.value,
            "createdAt": created_at,
            "userId": access_context.user_id,
        },
        ttl_seconds=IDEMPOTENCY_TTL_SECONDS,
    ):
        return read_idempotent_conflict(runtime_store, key=idempotency_key) or IdempotentConflictPayload(
            task_id=task_id,
            task_type=VIDEO_TASK_TYPE,
            status=TaskStatus.PENDING.value,
            created_at=created_at,
        )

    initialize_task_runtime_state(
        runtime_store,
        task_id=task_id,
        created_at=created_at,
        request_id=access_context.request_id,
        user_id=access_context.user_id,
        source_payload=source_payload,
        voice_preference=voice_preference,
    )
    await persist_video_task_metadata(
        metadata_service,
        task_id=task_id,
        access_context=access_context,
        request=request,
        source_payload=source_payload,
        created_at=created_at,
    )

    context = TaskContext(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        user_id=access_context.user_id,
        request_id=access_context.request_id,
        source_module="video.create_task",
        metadata={
            "inputType": request.input_type,
            "sourcePayload": source_payload,
            "userProfile": request.user_profile or {},
            "voicePreference": voice_preference or {},
        },
        created_at=created_at,
    )

    try:
        scheduler.enqueue_task(task_type=VIDEO_TASK_TYPE, context=context)
    except Exception as exc:  # noqa: BLE001
        logger.error("Enqueue video task failed task_id=%s", task_id, exc_info=exc)
        mark_dispatch_failure(
            runtime_store,
            task_id=task_id,
            created_at=created_at,
            request_id=access_context.request_id,
        )
        runtime_store.delete_runtime_value(idempotency_key)
        raise AppError(
            code=TaskErrorCode.VIDEO_DISPATCH_FAILED.value,
            message="任务分发失败，请稍后重试",
            status_code=500,
            retryable=True,
            task_id=task_id,
        ) from exc

    runtime_store.set_runtime_value(
        idempotency_key,
        {
            "taskId": task_id,
            "status": TaskStatus.PENDING.value,
            "createdAt": created_at,
            "userId": access_context.user_id,
        },
        ttl_seconds=IDEMPOTENCY_TTL_SECONDS,
    )

    return CreateVideoTaskAcceptedPayload(
        task_id=task_id,
        task_type=VIDEO_TASK_TYPE,
        status=TaskStatus.PENDING.value,
        created_at=created_at,
    )
