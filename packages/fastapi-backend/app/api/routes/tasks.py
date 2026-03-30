from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse, Response

from app.core.logging import format_trace_timestamp
from app.core.sse import encode_sse_event
from app.infra.redis_client import RuntimeStore
from app.schemas.common import (
    ErrorResponseEnvelope,
    TaskSnapshotPayload,
    TaskSnapshotResponseEnvelope,
    build_error_envelope,
    build_success_envelope
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_runtime_store(request: Request) -> RuntimeStore:
    return cast(RuntimeStore, request.app.state.runtime_store)


def _not_found_response(task_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content=build_error_envelope(
            code=404,
            msg="未找到对应任务",
            error_code="COMMON_NOT_FOUND",
            retryable=False,
            task_id=task_id
        )
    )


def _as_context(payload: object) -> dict[str, Any]:
    return dict(payload) if isinstance(payload, dict) else {}


def _build_snapshot_payload(
    *,
    task_id: str,
    state: dict[str, object],
    last_event_id: str | None
) -> TaskSnapshotPayload:
    context = _as_context(state.get("context"))
    stage = context.get("stage")

    return TaskSnapshotPayload(
        task_id=task_id,
        task_type=str(state.get("taskType") or "unknown"),
        status=str(state.get("status") or "pending"),
        progress=int(state.get("progress") or 0),
        message=str(state.get("message") or "任务状态待恢复"),
        timestamp=str(state.get("updatedAt") or format_trace_timestamp()),
        request_id=str(state["requestId"]) if state.get("requestId") is not None else None,
        error_code=str(state["errorCode"]) if state.get("errorCode") is not None else None,
        stage=stage if isinstance(stage, str) else None,
        context=context,
        resume_from=last_event_id,
        last_event_id=last_event_id
    )


@router.get(
    "/{task_id}/status",
    response_model=TaskSnapshotResponseEnvelope,
    responses={
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或运行态已过期"
        }
    }
)
async def get_task_status(task_id: str, request: Request) -> dict[str, object] | JSONResponse:
    runtime_store = _get_runtime_store(request)
    recovery_state = runtime_store.load_task_recovery_state(task_id)

    if recovery_state.snapshot is None:
        return _not_found_response(task_id)

    payload = _build_snapshot_payload(
        task_id=task_id,
        state=recovery_state.snapshot,
        last_event_id=recovery_state.latest_event_id
    )
    return build_success_envelope(payload)


@router.get(
    "/{task_id}/snapshot",
    response_model=TaskSnapshotResponseEnvelope,
    responses={
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或运行态已过期"
        }
    }
)
async def get_task_snapshot(task_id: str, request: Request) -> dict[str, object] | JSONResponse:
    return await get_task_status(task_id, request)


@router.get(
    "/{task_id}/events",
    response_model=None,
    responses={
        200: {
            "description": "按需补发 `Last-Event-ID` 之后缺失的任务事件",
            "content": {
                "text/event-stream": {
                    "example": (
                        "id: video_20260329161500_ab12cd34:evt:000004\n"
                        "event: progress\n"
                        "data: {\"taskId\":\"video_20260329161500_ab12cd34\"}\n\n"
                    )
                }
            }
        },
        404: {
            "model": ErrorResponseEnvelope,
            "description": "任务不存在或运行态已过期"
        }
    }
)
async def get_task_events(
    task_id: str,
    request: Request,
    last_event_id: str | None = Header(default=None, alias="Last-Event-ID")
) -> Response:
    runtime_store = _get_runtime_store(request)
    recovery_state = runtime_store.load_task_recovery_state(
        task_id,
        after_event_id=last_event_id
    )

    if recovery_state.snapshot is None and not recovery_state.events:
        return _not_found_response(task_id)

    latest_event_id = runtime_store.load_task_recovery_state(task_id).latest_event_id
    payload = "".join(encode_sse_event(event) for event in recovery_state.events)
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Task-Recovery-Mode": "replay" if recovery_state.events else "snapshot-required"
    }

    if latest_event_id is not None:
        headers["X-Task-Last-Event-ID"] = latest_event_id

    return Response(content=payload, media_type="text/event-stream", headers=headers)
