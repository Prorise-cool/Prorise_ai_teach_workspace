"""统一任务状态查询与 SSE 事件推送路由。"""
from __future__ import annotations


import asyncio
from time import monotonic
from typing import Any, AsyncIterator, cast

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

from app.core.logging import format_trace_timestamp
from app.core.sse import TaskProgressEvent, encode_sse_event
from app.infra.redis_client import RuntimeStore
from app.schemas.common import (
    ErrorResponseEnvelope,
    TaskSnapshotPayload,
    TaskSnapshotResponseEnvelope,
    build_error_envelope,
    build_success_envelope
)

router = APIRouter(prefix="/tasks", tags=["tasks"])
SSE_POLL_INTERVAL_SECONDS = 0.05
SSE_HEARTBEAT_INTERVAL_SECONDS = 15.0
TERMINAL_TASK_STATUSES = {"completed", "failed", "cancelled"}


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


def _is_terminal_status(status: object) -> bool:
    return str(status or "").lower() in TERMINAL_TASK_STATUSES


def _build_ephemeral_task_event(
    *,
    event: str,
    task_id: str,
    state: dict[str, object] | None,
    message: str
) -> TaskProgressEvent:
    current_state = state or {}
    context = _as_context(current_state.get("context"))
    raw_stage = context.get("stage")
    raw_result = context.get("result")
    raw_current_stage = context.get("currentStage")
    raw_stage_label = context.get("stageLabel")
    raw_stage_progress = context.get("stageProgress")

    return TaskProgressEvent(
        event=event,
        task_id=task_id,
        task_type=str(current_state.get("taskType") or "unknown"),
        status=str(current_state.get("status") or "pending"),
        progress=int(current_state.get("progress") or 0),
        message=message,
        timestamp=format_trace_timestamp(),
        request_id=str(current_state["requestId"]) if current_state.get("requestId") is not None else None,
        error_code=str(current_state["errorCode"]) if current_state.get("errorCode") is not None else None,
        context=context,
        stage=raw_stage if isinstance(raw_stage, str) else None,
        current_stage=(
            raw_current_stage if isinstance(raw_current_stage, str)
            else (raw_stage if isinstance(raw_stage, str) else None)
        ),
        stage_label=raw_stage_label if isinstance(raw_stage_label, str) else None,
        stage_progress=raw_stage_progress if isinstance(raw_stage_progress, int) else None,
        result=raw_result if isinstance(raw_result, dict) else None,
    )


def _build_snapshot_payload(
    *,
    task_id: str,
    state: dict[str, object],
    last_event_id: str | None
) -> TaskSnapshotPayload:
    context = _as_context(state.get("context"))
    stage = context.get("stage")
    current_stage = context.get("currentStage")
    stage_label = context.get("stageLabel")
    stage_progress = context.get("stageProgress")

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
        current_stage=(
            current_stage if isinstance(current_stage, str)
            else (stage if isinstance(stage, str) else None)
        ),
        stage_label=stage_label if isinstance(stage_label, str) else None,
        stage_progress=stage_progress if isinstance(stage_progress, int) else None,
        context=context,
        resume_from=last_event_id,
        last_event_id=last_event_id
    )


async def stream_task_events(
    *,
    task_id: str,
    request: Request,
    runtime_store: RuntimeStore,
    recovery_state: Any,
    latest_event_id: str | None
) -> AsyncIterator[str]:
    """生成任务事件 SSE 流。"""
    current_snapshot = recovery_state.snapshot
    latest_seen_event_id = latest_event_id
    last_stream_write_at = monotonic()

    yield encode_sse_event(
        _build_ephemeral_task_event(
            event="connected",
            task_id=task_id,
            state=current_snapshot,
            message="SSE 通道已建立"
        ),
        ensure_identity=False
    )

    for event in recovery_state.events:
        yield encode_sse_event(event)
        latest_seen_event_id = event.id or latest_seen_event_id
        current_snapshot = {
            "taskType": event.task_type,
            "status": event.status,
            "progress": event.progress,
            "message": event.message,
            "requestId": event.request_id,
            "errorCode": event.error_code,
            "context": event.context,
            "updatedAt": event.timestamp,
        }
        last_stream_write_at = monotonic()

    if _is_terminal_status((current_snapshot or {}).get("status")):
        return

    while not await request.is_disconnected():
        await asyncio.sleep(SSE_POLL_INTERVAL_SECONDS)
        live_state = runtime_store.load_task_recovery_state(
            task_id,
            after_event_id=latest_seen_event_id
        )
        if live_state.snapshot is not None:
            current_snapshot = live_state.snapshot

        if live_state.events:
            for event in live_state.events:
                yield encode_sse_event(event)
                latest_seen_event_id = event.id or latest_seen_event_id
                current_snapshot = {
                    "taskType": event.task_type,
                    "status": event.status,
                    "progress": event.progress,
                    "message": event.message,
                    "requestId": event.request_id,
                    "errorCode": event.error_code,
                    "context": event.context,
                    "updatedAt": event.timestamp,
                }
                last_stream_write_at = monotonic()

            if _is_terminal_status(live_state.events[-1].status):
                return
            continue

        if _is_terminal_status((current_snapshot or {}).get("status")):
            return

        if monotonic() - last_stream_write_at >= SSE_HEARTBEAT_INTERVAL_SECONDS:
            yield encode_sse_event(
                _build_ephemeral_task_event(
                    event="heartbeat",
                    task_id=task_id,
                    state=current_snapshot,
                    message="SSE 心跳保持"
                ),
                ensure_identity=False
            )
            last_stream_write_at = monotonic()


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
    """查询任务运行态快照。"""
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
    """查询任务运行态快照（snapshot 别名）。"""
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
    """以 SSE 推送任务事件流。"""
    runtime_store = _get_runtime_store(request)
    recovery_state = runtime_store.load_task_recovery_state(
        task_id,
        after_event_id=last_event_id
    )

    if recovery_state.snapshot is None and not recovery_state.events:
        return _not_found_response(task_id)

    latest_event_id = runtime_store.load_task_recovery_state(task_id).latest_event_id
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Task-Recovery-Mode": "replay" if recovery_state.events else "snapshot-required"
    }

    if latest_event_id is not None:
        headers["X-Task-Last-Event-ID"] = latest_event_id

    return StreamingResponse(
        stream_task_events(
            task_id=task_id,
            request=request,
            runtime_store=runtime_store,
            recovery_state=recovery_state,
            latest_event_id=latest_event_id
        ),
        media_type="text/event-stream",
        headers=headers
    )
