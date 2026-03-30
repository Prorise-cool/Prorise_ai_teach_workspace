from fastapi import APIRouter

from app.schemas.common import (
    ErrorResponseEnvelope,
    TaskSnapshotPayload,
    TaskSnapshotResponseEnvelope,
    build_success_envelope
)
from app.schemas.examples import (
    CONFLICT_ERROR_EXAMPLE,
    FORBIDDEN_ERROR_EXAMPLE,
    INTERNAL_ERROR_EXAMPLE,
    TASK_LIST_SUCCESS_EXAMPLE,
    TASK_SNAPSHOT_SUCCESS_EXAMPLE,
    UNAUTHORIZED_ERROR_EXAMPLE
)
from app.schemas.pagination import (
    TaskListItemPayload,
    TaskListResponseEnvelope,
    build_page_envelope
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get(
    "/task-snapshot",
    response_model=TaskSnapshotResponseEnvelope,
    responses={
        200: {
            "description": "任务状态快照示例",
            "content": {"application/json": {"example": TASK_SNAPSHOT_SUCCESS_EXAMPLE}}
        },
        401: {
            "model": ErrorResponseEnvelope,
            "description": "未登录或会话过期",
            "content": {"application/json": {"example": UNAUTHORIZED_ERROR_EXAMPLE}}
        },
        403: {
            "model": ErrorResponseEnvelope,
            "description": "已登录但无权限",
            "content": {"application/json": {"example": FORBIDDEN_ERROR_EXAMPLE}}
        },
        409: {
            "model": ErrorResponseEnvelope,
            "description": "任务执行冲突或失败",
            "content": {"application/json": {"example": CONFLICT_ERROR_EXAMPLE}}
        },
        500: {
            "model": ErrorResponseEnvelope,
            "description": "服务内部异常",
            "content": {"application/json": {"example": INTERNAL_ERROR_EXAMPLE}}
        }
    }
)
async def get_task_snapshot_contract() -> dict[str, object]:
    payload = TaskSnapshotPayload(
        task_id="video_20260329161500_ab12cd34",
        task_type="video",
        status="processing",
        progress=45,
        message="正在生成分镜与脚本",
        timestamp="2026-03-29T16:15:00Z",
        request_id="req_20260329_processing",
        error_code=None,
    )
    return build_success_envelope(payload)


@router.get(
    "/tasks",
    response_model=TaskListResponseEnvelope,
    responses={
        200: {
            "description": "分页任务列表示例",
            "content": {"application/json": {"example": TASK_LIST_SUCCESS_EXAMPLE}}
        },
        401: {
            "model": ErrorResponseEnvelope,
            "description": "未登录或会话过期",
            "content": {"application/json": {"example": UNAUTHORIZED_ERROR_EXAMPLE}}
        },
        403: {
            "model": ErrorResponseEnvelope,
            "description": "已登录但无权限",
            "content": {"application/json": {"example": FORBIDDEN_ERROR_EXAMPLE}}
        },
        500: {
            "model": ErrorResponseEnvelope,
            "description": "服务内部异常",
            "content": {"application/json": {"example": INTERNAL_ERROR_EXAMPLE}}
        }
    }
)
async def get_task_list_contract() -> dict[str, object]:
    rows = [
        TaskListItemPayload(
            id="video_20260329161500_ab12cd34",
            title="任务 video_20260329161500_ab12cd34",
            task_id="video_20260329161500_ab12cd34",
            task_type="video",
            status="processing",
            progress=45,
            message="正在生成分镜与脚本",
            timestamp="2026-03-29T16:15:00Z",
            request_id="req_20260329_processing",
            error_code=None
        ),
        TaskListItemPayload(
            id="classroom_20260329162000_ef56gh78",
            title="任务 classroom_20260329162000_ef56gh78",
            task_id="classroom_20260329162000_ef56gh78",
            task_type="classroom",
            status="completed",
            progress=100,
            message="课堂任务执行完成",
            timestamp="2026-03-29T16:20:00Z",
            request_id="req_20260329_completed",
            error_code=None
        )
    ]
    return build_page_envelope(rows, total=2, request_id="req_20260329_list")
