from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.security import AccessContext
from app.features.video.routes import get_video_service
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    build_preview_state,
)
from app.main import create_app
from app.shared.task_framework.status import TaskInternalStatus, TaskStatus
from tests.conftest import override_auth


def _build_access_context(*, user_id: str = "10001") -> AccessContext:
    return AccessContext(
        user_id=user_id,
        username="video_student",
        roles=("student",),
        permissions=("*:*:*",),
        token="test-token",
        client_id="test-client-id",
        request_id="req-video-delete-route",
        online_ttl_seconds=600,
    )


class _StubVideoService:
    def __init__(self) -> None:
        self.persist_task = AsyncMock(return_value=SimpleNamespace())
        self.build_task_request_calls: list[dict[str, object]] = []

    def build_task_request(self, **kwargs):  # noqa: ANN003
        self.build_task_request_calls.append(kwargs)
        return SimpleNamespace(**kwargs)


def _build_client(
    *,
    access_context: AccessContext | None = None,
    service: _StubVideoService | None = None,
) -> tuple[TestClient, _StubVideoService]:
    app = create_app()
    override_auth(app, access_context or _build_access_context())
    resolved_service = service or _StubVideoService()
    app.dependency_overrides[get_video_service] = lambda: resolved_service
    return TestClient(app), resolved_service


def test_video_delete_route_removes_terminal_task_runtime_after_metadata_persist() -> None:
    client, service = _build_client()

    with client:
        runtime_store = client.app.state.runtime_store
        runtime_store.clear()
        runtime_store.set_task_state(
            task_id="vtask_delete_001",
            task_type="video",
            internal_status=TaskInternalStatus.SUCCEEDED,
            message="任务执行完成",
            progress=100,
            request_id="req_delete_001",
            user_id="10001",
            source="video",
            context={"currentStage": "completed"},
        )
        VideoRuntimeStateStore(runtime_store, "vtask_delete_001").save_preview(
            build_preview_state(
                task_id="vtask_delete_001",
                summary="已完成摘要",
                knowledge_points=["导数"],
                sections=[],
                status="completed",
                preview_available=True,
            )
        )

        response = client.delete("/api/v1/video/tasks/vtask_delete_001")
        state = runtime_store.get_task_state("vtask_delete_001")
        preview = runtime_store.get_runtime_value("xm_video_task:vtask_delete_001:preview")

    assert response.status_code == 200
    assert response.json()["data"] == {"taskId": "vtask_delete_001", "status": "deleted"}
    assert state is None
    assert preview is None
    service.persist_task.assert_awaited_once()
    assert service.build_task_request_calls[0]["status"] == TaskStatus.CANCELLED
    assert service.build_task_request_calls[0]["summary"] == "任务已删除"


def test_video_delete_route_rejects_non_owner() -> None:
    client, _ = _build_client(access_context=_build_access_context(user_id="20002"))

    with client:
        runtime_store = client.app.state.runtime_store
        runtime_store.clear()
        runtime_store.set_task_state(
            task_id="vtask_delete_forbidden",
            task_type="video",
            internal_status=TaskInternalStatus.SUCCEEDED,
            message="任务执行完成",
            progress=100,
            request_id="req_delete_forbidden",
            user_id="10001",
            source="video",
        )

        response = client.delete("/api/v1/video/tasks/vtask_delete_forbidden")

    assert response.status_code == 403
    assert response.json()["data"]["error_code"] == "AUTH_PERMISSION_DENIED"


def test_video_delete_route_returns_404_when_task_missing() -> None:
    client, service = _build_client()

    with client:
        runtime_store = client.app.state.runtime_store
        runtime_store.clear()
        response = client.delete("/api/v1/video/tasks/vtask_delete_missing")

    assert response.status_code == 404
    assert response.json()["data"]["error_code"] == "COMMON_NOT_FOUND"
    service.persist_task.assert_not_awaited()
