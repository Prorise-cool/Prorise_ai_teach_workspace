"""Story 3.4: 视频功能域路由。

承载 POST /api/v1/video/tasks（异步创建）以及原有的
bootstrap / 元数据 CRUD / session replay 路由。
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.security import AccessContext, get_access_context
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.video.schemas import (
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.schemas.video_task import (
    CreateVideoTaskRequest,
    CreateVideoTaskResponseEnvelope,
    IdempotentConflictResponse,
    IdempotentConflictResponseEnvelope,
    VideoErrorCode,
)
from app.features.video.service import VideoService
from app.features.video.services.create_task import (
    create_video_task as do_create_video_task,
)
from app.schemas.common import build_error_envelope, build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.task_framework.status import TaskStatus

logger = get_logger("app.features.video.routes")

router = APIRouter(prefix="/video", tags=["video"])
service = VideoService()


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "视频功能域 bootstrap 基线",
            "content": {"application/json": {"example": build_feature_bootstrap_example("video")}}
        }
    }
)
async def video_bootstrap() -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


# ---------------------------------------------------------------------------
# POST /api/v1/video/tasks —— 异步任务创建（Story 3.4 AC 1-7）
# ---------------------------------------------------------------------------

@router.post(
    "/tasks",
    status_code=202,
    response_model=CreateVideoTaskResponseEnvelope,
    responses={
        202: {"description": "任务创建成功，异步处理中"},
        409: {"description": "幂等键冲突，任务已存在", "model": IdempotentConflictResponseEnvelope},
        422: {"description": "输入校验失败"},
        403: {"description": "权限不足"},
        500: {"description": "内部错误"},
    },
    summary="创建视频生成任务",
    description="接收视频任务输入，异步受理并返回 202 Accepted。",
)
async def create_video_task_endpoint(
    payload: CreateVideoTaskRequest,
    request: Request,
    access: AccessContext = Depends(get_access_context),
) -> JSONResponse:
    """POST /api/v1/video/tasks 创建视频任务。

    AC 1: 返回 202 Accepted + {taskId, taskType, status, createdAt}
    AC 5: 错误遵循统一 {code, msg, data} 结构
    AC 6: clientRequestId 幂等处理
    AC 7: P95 < 500ms
    """
    runtime_store = request.app.state.runtime_store
    scheduler = request.app.state.task_scheduler

    result = await do_create_video_task(
        payload,
        user_id=access.user_id,
        request_id=access.request_id,
        runtime_store=runtime_store,
        scheduler=scheduler,
    )

    # 幂等冲突 → 409
    if isinstance(result, IdempotentConflictResponse):
        return JSONResponse(
            status_code=409,
            content=IdempotentConflictResponseEnvelope(
                code=409,
                msg="任务已存在",
                data=result,
            ).model_dump(mode="json", by_alias=True),
        )

    # 正常创建 → 202
    return JSONResponse(
        status_code=202,
        content=CreateVideoTaskResponseEnvelope(
            code=202,
            msg="任务创建成功",
            data=result,
        ).model_dump(mode="json", by_alias=True),
    )


# ---------------------------------------------------------------------------
# 以下为原有元数据 CRUD 路由（Story 10.4 元数据持久化）
# ---------------------------------------------------------------------------

@router.post("/tasks/metadata", response_model=VideoTaskMetadataPreviewResponse)
async def create_video_task_metadata(payload: VideoTaskMetadataCreateRequest) -> VideoTaskMetadataPreviewResponse:
    return await service.persist_task(payload)


@router.get("/tasks", response_model=VideoTaskMetadataPageResponse)
async def list_video_tasks(
    status: TaskStatus | None = None,
    user_id: str | None = Query(default=None, alias="userId"),
    source_session_id: str | None = Query(default=None, alias="sourceSessionId"),
    updated_from: datetime | None = Query(default=None, alias="updatedFrom"),
    updated_to: datetime | None = Query(default=None, alias="updatedTo"),
    page_num: int = Query(default=1, alias="pageNum", ge=1),
    page_size: int = Query(default=10, alias="pageSize", ge=1, le=100)
) -> VideoTaskMetadataPageResponse:
    return await service.list_tasks(
        status=status,
        user_id=user_id,
        source_session_id=source_session_id,
        updated_from=updated_from,
        updated_to=updated_to,
        page_num=page_num,
        page_size=page_size,
)


@router.get("/tasks/{task_id}", response_model=VideoTaskMetadataSnapshot)
async def get_video_task(task_id: str) -> VideoTaskMetadataSnapshot:
    snapshot = await service.get_task(task_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Video task not found")
    return snapshot


@router.get("/sessions/{session_id}/replay", response_model=VideoTaskMetadataPageResponse)
async def replay_video_session(session_id: str) -> VideoTaskMetadataPageResponse:
    return await service.replay_session(session_id)
