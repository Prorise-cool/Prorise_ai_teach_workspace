"""视频功能域路由模块。"""

import mimetypes
from datetime import datetime
from functools import lru_cache

from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import FileResponse, JSONResponse

from app.api.routes.tasks import get_task_events as get_shared_task_events
from app.api.routes.tasks import get_task_status as get_shared_task_status
from app.core.config import get_settings
from app.core.security import AccessContext, get_access_context
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.video.models.create_task import (
    CreateVideoTaskAcceptedPayload,
    CreateVideoTaskRequest,
    CreateVideoTaskSuccessEnvelope,
    IdempotentConflictEnvelope,
    IdempotentConflictPayload,
)
from app.features.video.models.preprocess import VideoPreprocessSuccessEnvelope
from app.features.video.models.voice import VideoVoiceListResponseEnvelope
from app.features.video.pipeline.models import (
    PublishedVideoPageResponseEnvelope,
    PublishOperationResponseEnvelope,
    VideoResultDetailResponseEnvelope,
    VideoTaskPreviewResponseEnvelope,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.schemas import (
    VideoTaskMetadataCreateRequest,
    VideoTaskMetadataPageResponse,
    VideoTaskMetadataPreviewResponse,
    VideoTaskMetadataSnapshot,
)
from app.features.video.service import VideoService
from app.features.video.service.cancel_task import (
    cancel_video_task as cancel_video_task_service,
)
from app.features.video.service.delete_task import (
    delete_video_task as delete_video_task_service,
)
from app.features.video.service.create_task import (
    create_video_task,
    ensure_video_task_create_permission,
)
from app.features.video.service.preprocess import PreprocessService
from app.features.video.service.voice_catalog import VideoVoiceCatalogService
from app.providers.factory import get_provider_factory
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.schemas.common import (
    ErrorResponseEnvelope,
    TaskSnapshotResponseEnvelope,
    build_success_envelope,
)
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.task_framework.status import TaskStatus

router = APIRouter(prefix="/video", tags=["video"])


@lru_cache
def get_video_service() -> VideoService:
    """获取缓存的视频服务单例。"""
    return VideoService()


@lru_cache
def get_video_preprocess_service() -> PreprocessService:
    """获取缓存的预处理服务单例。"""
    return PreprocessService()


@lru_cache
def get_video_voice_catalog_service() -> VideoVoiceCatalogService:
    """获取缓存的音色目录服务单例。"""
    return VideoVoiceCatalogService(
        resolver=ProviderRuntimeResolver(
            settings=get_settings(),
            provider_factory=get_provider_factory(),
        )
    )


def _public_result_url(request: Request, result_id: str) -> str:
    """生成匿名可读的视频公开详情链接。"""

    return str(request.url_for("get_public_video_result_detail", result_id=result_id))


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "视频功能域 bootstrap 基线",
            "content": {
                "application/json": {
                    "example": build_feature_bootstrap_example("video")
                }
            },
        }
    },
)
async def video_bootstrap(
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """返回视频功能域 bootstrap 基线信息。"""
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post(
    "/preprocess",
    response_model=VideoPreprocessSuccessEnvelope,
    summary="图片预处理（校验、存储与 OCR）",
)
async def preprocess_image(
    file: UploadFile = File(..., description="图片文件（JPEG/PNG/WebP，最大 10MB）"),
    access_context: AccessContext = Depends(get_access_context),
    preprocess_service: PreprocessService = Depends(get_video_preprocess_service),
) -> dict[str, object]:
    """上传并预处理图片，执行校验、存储与 OCR 识别。"""
    result = await preprocess_service.preprocess(
        file_bytes=await file.read(),
        filename=file.filename or "upload-image",
        content_type=file.content_type,
    )
    return build_success_envelope(result, msg="预处理完成")


@router.get("/assets/{asset_key:path}", include_in_schema=False)
async def get_local_video_asset(asset_key: str) -> Response:
    """开发态读取本地落盘的视频流水线产物。"""
    settings = get_settings()
    if settings.environment != "development":
        raise HTTPException(
            status_code=404, detail="Asset route is only available in development"
        )

    store = LocalAssetStore.from_settings(settings)
    try:
        file_path = store.resolve_path_from_key(asset_key)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Asset not found") from exc

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")

    media_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(path=file_path, media_type=media_type)


@router.get("/voices", response_model=VideoVoiceListResponseEnvelope)
async def list_video_voices(
    access_context: AccessContext = Depends(get_access_context),
    service: VideoVoiceCatalogService = Depends(get_video_voice_catalog_service),
) -> dict[str, object]:
    """查询当前可用的视频配音音色列表。"""
    ensure_video_task_create_permission(access_context)
    payload = await service.list_voices(
        access_token=access_context.token,
        client_id=access_context.client_id,
    )
    return VideoVoiceListResponseEnvelope(data=payload).model_dump(
        mode="json", by_alias=True
    )


@router.post(
    "/tasks",
    status_code=202,
    response_model=CreateVideoTaskSuccessEnvelope,
    responses={
        409: {
            "model": IdempotentConflictEnvelope,
            "description": "幂等键冲突，返回已有任务",
        },
    },
)
async def create_video_task_endpoint(
    payload: CreateVideoTaskRequest,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    metadata_service: VideoService = Depends(get_video_service),
) -> dict[str, object] | JSONResponse:
    """创建视频生成任务，支持幂等键冲突检测。"""
    ensure_video_task_create_permission(access_context)
    result = await create_video_task(
        payload,
        access_context=access_context,
        runtime_store=request.app.state.runtime_store,
        scheduler=request.app.state.task_scheduler,
        metadata_service=metadata_service,
    )
    if isinstance(result, IdempotentConflictPayload):
        return JSONResponse(
            status_code=409,
            content=IdempotentConflictEnvelope(data=result).model_dump(
                mode="json", by_alias=True
            ),
        )
    return CreateVideoTaskSuccessEnvelope(
        data=CreateVideoTaskAcceptedPayload.model_validate(result)
    ).model_dump(mode="json", by_alias=True)


@router.post("/tasks/metadata", response_model=VideoTaskMetadataPreviewResponse)
async def create_video_task_metadata(
    payload: VideoTaskMetadataCreateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> VideoTaskMetadataPreviewResponse:
    """创建或更新视频任务元数据记录。"""
    return await service.persist_task(payload, access_context=access_context)


@router.get("/tasks", response_model=VideoTaskMetadataPageResponse)
async def list_video_tasks(
    status: TaskStatus | None = None,
    user_id: str | None = Query(default=None, alias="userId"),
    source_session_id: str | None = Query(default=None, alias="sourceSessionId"),
    updated_from: datetime | None = Query(default=None, alias="updatedFrom"),
    updated_to: datetime | None = Query(default=None, alias="updatedTo"),
    page_num: int = Query(default=1, alias="pageNum", ge=1),
    page_size: int = Query(default=10, alias="pageSize", ge=1, le=100),
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> VideoTaskMetadataPageResponse:
    """分页查询视频任务元数据列表。"""
    return await service.list_tasks(
        status=status,
        user_id=user_id,
        source_session_id=source_session_id,
        updated_from=updated_from,
        updated_to=updated_to,
        page_num=page_num,
        page_size=page_size,
        access_context=access_context,
    )


@router.get("/tasks/{task_id}", response_model=VideoTaskMetadataSnapshot)
async def get_video_task(
    task_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> VideoTaskMetadataSnapshot:
    """按任务 ID 查询单条视频任务元数据。"""
    snapshot = await service.get_task(task_id, access_context=access_context)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Video task not found")
    return snapshot


@router.post(
    "/tasks/{task_id}/cancel",
    response_model=TaskSnapshotResponseEnvelope,
    responses={
        403: {"model": ErrorResponseEnvelope, "description": "仅任务创建者可取消"},
        404: {"model": ErrorResponseEnvelope, "description": "任务不存在"},
        409: {"model": ErrorResponseEnvelope, "description": "任务已处于终态"},
    },
)
async def cancel_video_task_endpoint(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """取消视频任务并返回最新任务快照。"""
    payload = await cancel_video_task_service(
        task_id,
        runtime_store=request.app.state.runtime_store,
        access_context=access_context,
        service=service,
    )
    return build_success_envelope(payload, msg="任务已取消")


@router.delete(
    "/tasks/{task_id}",
    response_model=dict,
    responses={
        403: {"model": ErrorResponseEnvelope, "description": "仅任务创建者可删除"},
        404: {"model": ErrorResponseEnvelope, "description": "任务不存在"},
        409: {"model": ErrorResponseEnvelope, "description": "仅终态任务可删除"},
    },
)
async def delete_video_task_endpoint(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """删除已结束的视频任务。"""
    result = await delete_video_task_service(
        task_id,
        runtime_store=request.app.state.runtime_store,
        access_context=access_context,
        service=service,
    )
    return build_success_envelope(
        {
            "taskId": result["task_id"],
            "status": result["status"],
        },
        msg="任务已删除",
    )


@router.get("/tasks/{task_id}/result", response_model=VideoResultDetailResponseEnvelope)
async def get_video_task_result(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """获取视频任务的完整结果详情。"""
    payload = await service.get_result_detail(
        task_id,
        runtime_store=request.app.state.runtime_store,
        access_context=access_context,
    )
    if payload.result is not None:
        payload = payload.model_copy(
            update={"public_url": _public_result_url(request, payload.result.result_id)}
        )
    return build_success_envelope(payload)


@router.get(
    "/public/{result_id}",
    response_model=VideoResultDetailResponseEnvelope,
    responses={
        404: {
            "model": ErrorResponseEnvelope,
            "description": "公开视频不存在或未公开",
        }
    },
)
async def get_public_video_result_detail(
    result_id: str,
    request: Request,
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """匿名读取公开视频结果详情。"""

    payload = await service.get_public_result_detail(
        result_id,
        runtime_store=request.app.state.runtime_store,
    )
    if payload.result is not None:
        payload = payload.model_copy(
            update={"public_url": _public_result_url(request, payload.result.result_id)}
        )
    return build_success_envelope(payload)


@router.get(
    "/tasks/{task_id}/preview",
    response_model=VideoTaskPreviewResponseEnvelope,
    responses={
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或预览运行态已过期",
        }
    },
)
async def get_video_task_preview(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """获取视频等待页渐进式预览数据。"""
    payload = await service.get_preview_detail(
        task_id,
        runtime_store=request.app.state.runtime_store,
        access_context=access_context,
    )
    return build_success_envelope(payload)


@router.get(
    "/tasks/{task_id}/status",
    response_model=TaskSnapshotResponseEnvelope,
    responses={
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或运行态已过期",
        }
    },
)
async def get_video_task_status(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
) -> dict[str, object] | JSONResponse:
    """查询视频任务运行态快照。"""
    return await get_shared_task_status(task_id, request, access_context)


@router.get(
    "/tasks/{task_id}/events",
    response_model=None,
    responses={
        200: {
            "description": "按需补发 `Last-Event-ID` 之后缺失的任务事件",
            "content": {
                "text/event-stream": {
                    "example": (
                        "id: video_20260329161500_ab12cd34:evt:000004\n"
                        "event: progress\n"
                        'data: {"taskId":"video_20260329161500_ab12cd34"}\n\n'
                    )
                }
            },
        },
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或运行态已过期",
        },
    },
)
async def get_video_task_events(
    task_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
    access_context: AccessContext = Depends(get_access_context),
) -> Response:
    """以 SSE 补发 Last-Event-ID 之后缺失的视频任务事件。"""
    return await get_shared_task_events(task_id, request, last_event_id, access_context)


@router.post(
    "/tasks/{task_id}/publish", response_model=PublishOperationResponseEnvelope
)
async def publish_video_task(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """公开发布已完成的视频任务。"""
    payload = await service.publish_task(
        task_id,
        access_context=access_context,
        runtime_store=request.app.state.runtime_store,
    )
    return build_success_envelope(payload, msg="公开发布成功")


@router.delete(
    "/tasks/{task_id}/publish", response_model=PublishOperationResponseEnvelope
)
async def unpublish_video_task(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """取消已公开发布的视频任务。"""
    payload = await service.unpublish_task(
        task_id,
        access_context=access_context,
        runtime_store=request.app.state.runtime_store,
    )
    return build_success_envelope(payload, msg="已取消公开")


@router.get("/published", response_model=PublishedVideoPageResponseEnvelope)
async def list_published_video_tasks(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, alias="pageSize", ge=1, le=50),
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> dict[str, object]:
    """分页查询已公开发布的视频卡片列表。"""
    payload = await service.list_published_tasks(
        page=page,
        page_size=page_size,
        runtime_store=request.app.state.runtime_store,
        access_context=access_context,
    )
    return build_success_envelope(payload)


@router.get(
    "/sessions/{session_id}/replay", response_model=VideoTaskMetadataPageResponse
)
async def replay_video_session(
    session_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: VideoService = Depends(get_video_service),
) -> VideoTaskMetadataPageResponse:
    """回放指定会话下的视频任务元数据。"""
    return await service.replay_session(session_id, access_context=access_context)
