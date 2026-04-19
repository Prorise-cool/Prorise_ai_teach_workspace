from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import AccessContext
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_preview_state,
)
from app.features.video.runtime_auth import save_video_runtime_auth
from app.features.video.service.delete_task import delete_video_task
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
        request_id="req-video-delete-service",
        online_ttl_seconds=600,
    )


def _build_runtime_store() -> RuntimeStore:
    return RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")


def test_delete_video_task_persists_metadata_before_clearing_runtime_state() -> None:
    runtime_store = _build_runtime_store()
    access_context = _build_access_context()
    runtime_store.set_task_state(
        task_id="vtask_delete_001",
        task_type="video",
        internal_status=TaskInternalStatus.SUCCEEDED,
        message="任务执行完成",
        progress=100,
        request_id="req_delete_001",
        user_id="10001",
        source="video",
    )
    runtime = VideoRuntimeStateStore(runtime_store, "vtask_delete_001")
    runtime.save_preview(
        build_preview_state(
            task_id="vtask_delete_001",
            summary="处理中摘要",
            knowledge_points=["导数"],
            sections=[],
            status="completed",
            preview_available=True,
        )
    )
    runtime.save_cancel_request({"requestedAt": "2026-04-19T06:16:00Z", "requestedBy": "10001"})
    runtime.append_fix_log({"stage": "render", "attempt": 1})
    save_video_runtime_auth(runtime_store, task_id="vtask_delete_001", access_context=access_context)

    service = MagicMock()
    service.build_task_request.return_value = SimpleNamespace(task_id="vtask_delete_001")

    async def persist_side_effect(*_args, **_kwargs) -> SimpleNamespace:
        assert runtime_store.get_task_state("vtask_delete_001") is not None
        assert runtime.load_preview() is not None
        return SimpleNamespace()

    service.persist_task = AsyncMock(side_effect=persist_side_effect)

    payload = asyncio.run(
        delete_video_task(
            "vtask_delete_001",
            runtime_store=runtime_store,
            access_context=access_context,
            service=service,
        )
    )

    assert payload == {"task_id": "vtask_delete_001", "status": "deleted"}
    assert runtime_store.get_task_state("vtask_delete_001") is None
    assert runtime.load_preview() is None
    assert runtime.load_cancel_request() is None
    assert runtime.load_fix_logs() == []
    assert runtime_store.get_runtime_value("xm_video_runtime_auth:vtask_delete_001") is None
    assert runtime_store.get_task_events("vtask_delete_001") == []
    service.build_task_request.assert_called_once()
    _, kwargs = service.build_task_request.call_args
    assert kwargs["task_id"] == "vtask_delete_001"
    assert kwargs["user_id"] == "10001"
    assert kwargs["status"] == TaskStatus.CANCELLED
    assert kwargs["summary"] == "任务已删除"
    assert isinstance(kwargs["updated_at"], datetime)
    service.persist_task.assert_awaited_once()


def test_delete_video_task_keeps_runtime_state_when_metadata_persist_fails() -> None:
    runtime_store = _build_runtime_store()
    access_context = _build_access_context()
    runtime_store.set_task_state(
        task_id="vtask_delete_rollback",
        task_type="video",
        internal_status=TaskInternalStatus.SUCCEEDED,
        message="任务执行完成",
        progress=100,
        request_id="req_delete_rollback",
        user_id="10001",
        source="video",
    )
    runtime = VideoRuntimeStateStore(runtime_store, "vtask_delete_rollback")
    runtime.save_preview(
        build_preview_state(
            task_id="vtask_delete_rollback",
            summary="处理中摘要",
            knowledge_points=["导数"],
            sections=[],
            status="completed",
            preview_available=True,
        )
    )
    runtime.save_cancel_request({"requestedAt": "2026-04-19T06:18:00Z", "requestedBy": "10001"})
    runtime.append_fix_log({"stage": "render", "attempt": 2})
    save_video_runtime_auth(runtime_store, task_id="vtask_delete_rollback", access_context=access_context)

    service = MagicMock()
    service.build_task_request.return_value = SimpleNamespace(task_id="vtask_delete_rollback")
    service.persist_task = AsyncMock(side_effect=RuntimeError("ruoyi unavailable"))

    with pytest.raises(RuntimeError, match="ruoyi unavailable"):
        asyncio.run(
            delete_video_task(
                "vtask_delete_rollback",
                runtime_store=runtime_store,
                access_context=access_context,
                service=service,
            )
        )

    assert runtime_store.get_task_state("vtask_delete_rollback") is not None
    assert runtime.load_preview() is not None
    assert runtime.load_cancel_request() is not None
    assert runtime.load_fix_logs() != []
    assert runtime_store.get_runtime_value("xm_video_runtime_auth:vtask_delete_rollback") is not None
    service.persist_task.assert_awaited_once()
