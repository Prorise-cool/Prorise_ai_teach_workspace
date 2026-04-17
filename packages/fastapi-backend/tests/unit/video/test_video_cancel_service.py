from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.errors import AppError
from app.core.security import AccessContext
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_preview_state,
)
from app.features.video.service.cancel_task import cancel_video_task
from app.infra.redis_client import RuntimeStore
from app.shared.task_framework.status import TaskInternalStatus, TaskStatus


def _build_access_context(*, user_id: str = "10001") -> AccessContext:
    return AccessContext(
        user_id=user_id,
        username="video_student",
        roles=("student",),
        permissions=("*:*:*",),
        token="test-token",
        client_id="test-client-id",
        request_id="req-video-cancel-service",
        online_ttl_seconds=600,
    )


def _build_runtime_store() -> RuntimeStore:
    return RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")


def test_cancel_video_task_marks_runtime_and_persists_cancelled_metadata() -> None:
    runtime_store = _build_runtime_store()
    runtime_store.set_task_state(
        task_id="vtask_cancel_001",
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="任务处理中",
        progress=42,
        request_id="req_cancel_001",
        user_id="10001",
        source="video",
        context={"currentStage": "render"},
    )
    VideoRuntimeStateStore(runtime_store, "vtask_cancel_001").save_preview(
        build_preview_state(
            task_id="vtask_cancel_001",
            summary="处理中摘要",
            knowledge_points=["导数"],
            sections=[],
            status="processing",
            preview_available=True,
        )
    )
    service = MagicMock()
    service.build_task_request.return_value = SimpleNamespace(task_id="vtask_cancel_001")
    service.persist_task = AsyncMock(return_value=SimpleNamespace())

    payload = asyncio.run(
        cancel_video_task(
            "vtask_cancel_001",
            runtime_store=runtime_store,
            access_context=_build_access_context(),
            service=service,
        )
    )

    state = runtime_store.get_task_state("vtask_cancel_001")
    cancel_request = runtime_store.get_runtime_value(
        "xm_video_task:vtask_cancel_001:cancel_request"
    )
    preview = runtime_store.get_runtime_value("xm_video_task:vtask_cancel_001:preview")
    events = runtime_store.get_task_events("vtask_cancel_001")

    assert payload.status == "cancelled"
    assert payload.error_code == "TASK_CANCELLED"
    assert payload.last_event_id is not None
    assert state is not None
    assert state["status"] == "cancelled"
    assert state["errorCode"] == "TASK_CANCELLED"
    assert state["context"]["cancelRequested"] is True
    assert cancel_request == {
        "requestedAt": cancel_request["requestedAt"],
        "requestedBy": "10001",
    }
    assert preview is not None
    assert preview["status"] == "cancelled"
    assert events[-1].event == "cancelled"
    assert events[-1].status == "cancelled"
    service.build_task_request.assert_called_once()
    _, kwargs = service.build_task_request.call_args
    assert kwargs["task_id"] == "vtask_cancel_001"
    assert kwargs["user_id"] == "10001"
    assert kwargs["status"] == TaskStatus.CANCELLED
    assert kwargs["summary"] == "任务已取消"
    assert isinstance(kwargs["updated_at"], datetime)
    service.persist_task.assert_awaited_once()


def test_cancel_video_task_rejects_missing_task() -> None:
    runtime_store = _build_runtime_store()

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            cancel_video_task(
                "vtask_cancel_missing",
                runtime_store=runtime_store,
                access_context=_build_access_context(),
                service=MagicMock(),
            )
        )

    assert exc_info.value.code == "COMMON_NOT_FOUND"
    assert exc_info.value.status_code == 404


def test_cancel_video_task_rejects_non_owner() -> None:
    runtime_store = _build_runtime_store()
    runtime_store.set_task_state(
        task_id="vtask_cancel_forbidden",
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="任务处理中",
        progress=12,
        request_id="req_cancel_forbidden",
        user_id="10001",
        source="video",
    )

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            cancel_video_task(
                "vtask_cancel_forbidden",
                runtime_store=runtime_store,
                access_context=_build_access_context(user_id="20002"),
                service=MagicMock(),
            )
        )

    assert exc_info.value.code == "AUTH_PERMISSION_DENIED"
    assert exc_info.value.status_code == 403


def test_cancel_video_task_rejects_terminal_status() -> None:
    runtime_store = _build_runtime_store()
    runtime_store.set_task_state(
        task_id="vtask_cancel_terminal",
        task_type="video",
        internal_status=TaskInternalStatus.SUCCEEDED,
        message="任务执行完成",
        progress=100,
        request_id="req_cancel_terminal",
        user_id="10001",
        source="video",
    )

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            cancel_video_task(
                "vtask_cancel_terminal",
                runtime_store=runtime_store,
                access_context=_build_access_context(),
                service=MagicMock(),
            )
        )

    assert exc_info.value.code == "TASK_NOT_CANCELLABLE"
    assert exc_info.value.status_code == 409
