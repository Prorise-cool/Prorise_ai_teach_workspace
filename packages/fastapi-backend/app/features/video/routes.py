from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import AccessContext, require_permissions
from app.features.video.schemas import (
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.service import VideoService
from app.shared.task_framework.status import TaskStatus

router = APIRouter(prefix="/video", tags=["video"])
service = VideoService()
VIDEO_TASK_LIST_PERMISSION = "video:task:list"
VIDEO_TASK_QUERY_PERMISSION = "video:task:query"
VIDEO_TASK_ADD_PERMISSION = "video:task:add"


@router.get("/bootstrap")
async def video_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()


@router.post("/tasks", response_model=VideoTaskMetadataPreviewResponse)
async def create_video_task(
    payload: VideoTaskMetadataCreateRequest,
    _: AccessContext = Depends(require_permissions(VIDEO_TASK_ADD_PERMISSION))
) -> VideoTaskMetadataPreviewResponse:
    return await service.persist_task(payload)


@router.get("/tasks", response_model=VideoTaskMetadataPageResponse)
async def list_video_tasks(
    _: AccessContext = Depends(require_permissions(VIDEO_TASK_LIST_PERMISSION)),
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
async def get_video_task(
    task_id: str,
    _: AccessContext = Depends(require_permissions(VIDEO_TASK_QUERY_PERMISSION))
) -> VideoTaskMetadataSnapshot:
    snapshot = await service.get_task(task_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Video task not found")
    return snapshot


@router.get("/sessions/{session_id}/replay", response_model=VideoTaskMetadataPageResponse)
async def replay_video_session(
    session_id: str,
    _: AccessContext = Depends(require_permissions(VIDEO_TASK_QUERY_PERMISSION))
) -> VideoTaskMetadataPageResponse:
    return await service.replay_session(session_id)
