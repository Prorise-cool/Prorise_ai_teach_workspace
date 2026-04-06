from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, UploadFile, File

from app.core.logging import get_logger, get_request_id
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.video.schemas import (
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.service import VideoService
from app.features.video.services.preprocess import PreprocessService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.task_framework.status import TaskStatus

logger = get_logger("video.routes")

router = APIRouter(prefix="/video", tags=["video"])
service = VideoService()
preprocess_service = PreprocessService()


@router.post(
    "/preprocess",
    tags=["video"],
    summary="图片预处理（OCR 识别与存储）",
    description="接收图片文件，完成校验、存储、OCR 识别，返回结构化预处理结果。"
                " 前端在创建视频任务前调用此接口获取 imageRef 和 ocrText。",
    responses={
        200: {"description": "预处理成功"},
        422: {"description": "文件校验失败（类型/大小/可读性）"},
        500: {"description": "存储或服务内部异常"},
    },
)
async def preprocess_image(
    file: UploadFile = File(..., description="图片文件（JPEG/PNG/WebP，最大 10MB）"),
) -> dict[str, object]:
    """图片预处理接口：校验 -> 存储 -> OCR -> 响应。"""
    request_id = get_request_id()
    logger.info(
        "Preprocess request: filename=%s content_type=%s request_id=%s",
        file.filename,
        file.content_type,
        request_id,
    )

    file_bytes = await file.read()
    result = await preprocess_service.preprocess(
        file_bytes=file_bytes,
        filename=file.filename or "unknown",
        content_type=file.content_type,
    )

    return build_success_envelope(result, msg="预处理完成")


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


@router.post("/tasks", response_model=VideoTaskMetadataPreviewResponse)
async def create_video_task(payload: VideoTaskMetadataCreateRequest) -> VideoTaskMetadataPreviewResponse:
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
