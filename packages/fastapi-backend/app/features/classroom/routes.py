from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.classroom.schemas import (
    ClassroomTaskMetadataCreateRequest,
    ClassroomTaskMetadataPageResponse,
    ClassroomTaskMetadataPreviewResponse,
    ClassroomTaskMetadataSnapshot,
)
from app.features.classroom.service import ClassroomService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.task_framework.status import TaskStatus

router = APIRouter(prefix="/classroom", tags=["classroom"])
service = ClassroomService()


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
async def classroom_bootstrap() -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/tasks", response_model=ClassroomTaskMetadataPreviewResponse)
async def create_classroom_task(payload: ClassroomTaskMetadataCreateRequest) -> ClassroomTaskMetadataPreviewResponse:
    return await service.persist_task(payload)


@router.get("/tasks", response_model=ClassroomTaskMetadataPageResponse)
async def list_classroom_tasks(
    status: TaskStatus | None = None,
    user_id: str | None = Query(default=None, alias="userId"),
    source_session_id: str | None = Query(default=None, alias="sourceSessionId"),
    updated_from: datetime | None = Query(default=None, alias="updatedFrom"),
    updated_to: datetime | None = Query(default=None, alias="updatedTo"),
    page_num: int = Query(default=1, alias="pageNum", ge=1),
    page_size: int = Query(default=10, alias="pageSize", ge=1, le=100)
) -> ClassroomTaskMetadataPageResponse:
    return await service.list_tasks(
        status=status,
        user_id=user_id,
        source_session_id=source_session_id,
        updated_from=updated_from,
        updated_to=updated_to,
        page_num=page_num,
        page_size=page_size,
    )


@router.get("/tasks/{task_id}", response_model=ClassroomTaskMetadataSnapshot)
async def get_classroom_task(task_id: str) -> ClassroomTaskMetadataSnapshot:
    snapshot = await service.get_task(task_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Classroom task not found")
    return snapshot


@router.get("/sessions/{session_id}/replay", response_model=ClassroomTaskMetadataPageResponse)
async def replay_classroom_session(session_id: str) -> ClassroomTaskMetadataPageResponse:
    return await service.replay_session(session_id)
