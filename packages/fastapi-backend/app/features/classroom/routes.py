"""课堂功能域路由聚合。

Wave 1 重构：把原 ``app.features.openmaic.routes`` 拆分到
``routes_generation.py`` / ``routes_chat.py`` / ``routes_pdf_search.py``，
本模块继续承载任务元数据 CRUD + bootstrap + sessions/replay。
所有子 router 共用 ``/classroom`` 前缀。
"""

from functools import lru_cache
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, Response
from fastapi.responses import JSONResponse

from app.api.routes.tasks import get_task_events as get_shared_task_events
from app.api.routes.tasks import get_task_status as get_shared_task_status
from app.core.security import AccessContext, get_access_context
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.classroom.routes_chat import router as _chat_router
from app.features.classroom.routes_generation import router as _generation_router
from app.features.classroom.routes_pdf_search import router as _pdf_search_router
from app.features.classroom.schemas import (
    ClassroomTaskMetadataCreateRequest,
    ClassroomTaskMetadataPageResponse,
    ClassroomTaskMetadataPreviewResponse,
    ClassroomTaskMetadataSnapshot,
)
from app.features.classroom.publication import (
    ClassroomPublishResult,
    PublishedClassroomCardPage,
    get_classroom_publication_state,
    list_published_classrooms,
    publish_classroom_task,
    unpublish_classroom_task,
)
from app.features.classroom.service import ClassroomService
from app.schemas.common import ErrorResponseEnvelope, TaskSnapshotResponseEnvelope, build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.task_framework.status import TaskStatus

router = APIRouter(prefix="/classroom", tags=["classroom"])
router.include_router(_generation_router)
router.include_router(_chat_router)
router.include_router(_pdf_search_router)


@lru_cache
def get_classroom_service() -> ClassroomService:
    """获取缓存的课堂服务单例。"""
    return ClassroomService()


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "课堂功能域 bootstrap 基线",
            "content": {"application/json": {"example": build_feature_bootstrap_example("classroom")}}
        }
    }
)
async def classroom_bootstrap(
    service: ClassroomService = Depends(get_classroom_service),
) -> dict[str, object]:
    """返回课堂功能域 bootstrap 基线。"""
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/tasks", response_model=ClassroomTaskMetadataPreviewResponse)
async def create_classroom_task(
    payload: ClassroomTaskMetadataCreateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> ClassroomTaskMetadataPreviewResponse:
    """创建课堂任务元数据。"""
    return await service.persist_task(payload, access_context=access_context)


@router.get("/tasks", response_model=ClassroomTaskMetadataPageResponse)
async def list_classroom_tasks(
    status: TaskStatus | None = None,
    user_id: str | None = Query(default=None, alias="userId"),
    source_session_id: str | None = Query(default=None, alias="sourceSessionId"),
    updated_from: datetime | None = Query(default=None, alias="updatedFrom"),
    updated_to: datetime | None = Query(default=None, alias="updatedTo"),
    page_num: int = Query(default=1, alias="pageNum", ge=1),
    page_size: int = Query(default=10, alias="pageSize", ge=1, le=100),
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> ClassroomTaskMetadataPageResponse:
    """分页查询课堂任务列表。"""
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


@router.get("/tasks/{task_id}", response_model=ClassroomTaskMetadataSnapshot)
async def get_classroom_task(
    task_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> ClassroomTaskMetadataSnapshot:
    """按任务 ID 查询单条课堂任务。"""
    snapshot = await service.get_task(task_id, access_context=access_context)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Classroom task not found")
    return snapshot


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
async def get_classroom_task_status(
    task_id: str,
    request: Request,
    access_context: AccessContext = Depends(get_access_context),
) -> dict[str, object] | JSONResponse:
    """查询课堂任务运行态快照。"""
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
                        "id: classroom_20260329161500_ab12cd34:evt:000004\n"
                        "event: progress\n"
                        "data: {\"taskId\":\"classroom_20260329161500_ab12cd34\"}\n\n"
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
async def get_classroom_task_events(
    task_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
    access_context: AccessContext = Depends(get_access_context),
) -> Response:
    """以 SSE 补发课堂任务事件。"""
    return await get_shared_task_events(task_id, request, last_event_id, access_context)


@router.get("/sessions/{session_id}/replay", response_model=ClassroomTaskMetadataPageResponse)
async def replay_classroom_session(
    session_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> ClassroomTaskMetadataPageResponse:
    """回放指定会话的课堂任务记录。"""
    return await service.replay_session(session_id, access_context=access_context)


# ── 公开发布 ────────────────────────────────────────────────────────────────
#
# 所有响应都用 build_success_envelope 包成 {code, msg, data: payload}，
# 对齐前端 unwrapEnvelope(response).data.data 的约定，避免前端拿到 undefined。


@router.get("/tasks/{task_id}/publish")
async def get_classroom_publish_state(
    task_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> dict[str, object]:
    """读取当前课堂的公开状态，给前端 PublishToggle 挂载时初始化。"""
    payload = await get_classroom_publication_state(
        service, task_id, access_context=access_context,
    )
    return build_success_envelope(payload)


@router.post("/tasks/{task_id}/publish")
async def publish_classroom(
    task_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> dict[str, object]:
    """将已完成的课堂公开发布（写入 xm_user_work, work_type=classroom）。"""
    payload = await publish_classroom_task(
        service, task_id, access_context=access_context,
    )
    return build_success_envelope(payload, msg="公开发布成功")


@router.delete("/tasks/{task_id}/publish")
async def unpublish_classroom(
    task_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: ClassroomService = Depends(get_classroom_service),
) -> dict[str, object]:
    """取消已公开的课堂。"""
    payload = await unpublish_classroom_task(
        service, task_id, access_context=access_context,
    )
    return build_success_envelope(payload, msg="已取消公开")


@router.get("/published")
async def list_public_classrooms(
    page_num: int = Query(default=1, alias="pageNum", ge=1),
    page_size: int = Query(default=12, alias="pageSize", ge=1, le=50),
    access_context: AccessContext = Depends(get_access_context),
) -> dict[str, object]:
    """分页查询所有已公开的课堂卡片。"""
    payload = await list_published_classrooms(
        page=page_num, page_size=page_size, access_context=access_context,
    )
    return build_success_envelope(payload)
