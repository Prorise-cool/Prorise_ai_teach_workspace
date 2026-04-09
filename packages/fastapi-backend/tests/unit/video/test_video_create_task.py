from __future__ import annotations

import asyncio
from collections.abc import Iterator
from contextlib import contextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.errors import AppError
from app.core.security import (
    AccessContext,
    RuoYiAccessProfile,
    get_security_runtime_store,
    has_permission,
)
from app.features.video.routes import get_video_service, get_video_voice_catalog_service
from app.features.video.create_task_models import CreateVideoTaskRequest
from app.features.video.service import VideoService
from app.features.video.voice_models import VideoVoiceListPayload, VideoVoiceOption
from app.features.video.services.create_task import (
    VIDEO_TASK_CREATE_PERMISSION,
    build_idempotency_key,
    create_video_task,
    persist_video_task_metadata,
)
from app.infra.redis_client import RuntimeStore
from app.main import create_app
from app.shared.task_framework.scheduler import TaskDispatchReceipt, TaskScheduler
from app.shared.task_framework.status import TaskStatus

VALID_TOKEN = "valid-access-token"


def build_access_context(
    *,
    user_id: str = "10001",
    permissions: tuple[str, ...] = (VIDEO_TASK_CREATE_PERMISSION,),
) -> AccessContext:
    return AccessContext(
        user_id=user_id,
        username="student_demo",
        roles=("student",),
        permissions=permissions,
        token=VALID_TOKEN,
        client_id="test-client-id",
        request_id="req_test_video_create",
        online_ttl_seconds=600,
    )


@contextmanager
def video_client(
    monkeypatch,
    *,
    permissions: tuple[str, ...] = (VIDEO_TASK_CREATE_PERMISSION,),
) -> Iterator[tuple[TestClient, RuntimeStore]]:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://test",
    )
    runtime_store.set_online_token_record(
        VALID_TOKEN,
        {
            "tokenId": VALID_TOKEN,
            "userName": "student_demo",
        },
        ttl_seconds=600,
    )

    async def fake_load_ruoyi_access_profile(
        access_token: str,
        *,
        client_id: str | None = None,
    ) -> RuoYiAccessProfile:
        return RuoYiAccessProfile(
            user_id="10001",
            username=f"user-{access_token}",
            roles=("student",),
            permissions=permissions,
        )

    app = create_app()
    app.dependency_overrides[get_security_runtime_store] = lambda: runtime_store
    monkeypatch.setattr(
        "app.core.security.load_ruoyi_access_profile",
        fake_load_ruoyi_access_profile,
    )
    monkeypatch.setattr(
        "app.features.video.services.create_task.persist_video_task_metadata",
        AsyncMock(return_value=None),
    )

    try:
        with TestClient(app) as client:
            scheduler = MagicMock(spec=TaskScheduler)
            scheduler.enqueue_task.return_value = TaskDispatchReceipt(
                task_id="unused",
                task_type="video",
                message_id="msg_test_001",
                status=TaskStatus.PENDING,
            )
            client.app.state.runtime_store = runtime_store
            client.app.state.task_scheduler = scheduler
            yield client, runtime_store
    finally:
        app.dependency_overrides.clear()


def test_build_idempotency_key_includes_user_id() -> None:
    assert build_idempotency_key("user_a", "client_001") == "xm_idempotent:video:user_a:client_001"


@pytest.mark.parametrize(
    ("permissions", "required_permission", "expected"),
    [
        ((VIDEO_TASK_CREATE_PERMISSION,), VIDEO_TASK_CREATE_PERMISSION, True),
        (("*:*:*",), VIDEO_TASK_CREATE_PERMISSION, True),
        (("video:*:*",), VIDEO_TASK_CREATE_PERMISSION, True),
        (("video:task:*",), VIDEO_TASK_CREATE_PERMISSION, True),
        (("video:*:add",), VIDEO_TASK_CREATE_PERMISSION, True),
        (("classroom:*:*",), VIDEO_TASK_CREATE_PERMISSION, False),
        ((), VIDEO_TASK_CREATE_PERMISSION, False),
    ],
)
def test_has_permission_supports_ruoyi_wildcard_patterns(
    permissions: tuple[str, ...],
    required_permission: str,
    expected: bool,
) -> None:
    assert has_permission(permissions, required_permission) is expected


def test_create_video_task_marks_failed_and_clears_idempotency_when_dispatch_fails() -> None:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    scheduler = MagicMock(spec=TaskScheduler)
    scheduler.enqueue_task.side_effect = RuntimeError("broker down")
    metadata_service = MagicMock(spec=VideoService)

    with patch(
        "app.features.video.services.create_task.persist_video_task_metadata",
        new=AsyncMock(return_value=None),
    ):
        with pytest.raises(AppError) as exc_info:
            asyncio.run(
                create_video_task(
                    CreateVideoTaskRequest(
                        input_type="text",
                        source_payload={"text": "证明洛必达法则为什么成立，请给出完整推导。"},
                        client_request_id="client_retry_001",
                    ),
                    access_context=build_access_context(),
                    runtime_store=runtime_store,
                    scheduler=scheduler,
                    metadata_service=metadata_service,
                )
            )

    assert exc_info.value.code == "VIDEO_DISPATCH_FAILED"
    runtime_keys = [key for key in runtime_store.storage if key.startswith("xm_idempotent:video:")]
    assert runtime_keys == []

    states = [value for key, value in runtime_store.storage.items() if key.startswith("xm_task:")]
    assert len(states) == 1
    assert states[0]["status"] == "failed"
    assert states[0]["errorCode"] == "VIDEO_DISPATCH_FAILED"
    assert states[0]["createdAt"]
    runtime_auth_keys = [key for key in runtime_store.storage if key.startswith("xm_video_runtime_auth:")]
    assert runtime_auth_keys == []


def test_persist_video_task_metadata_passes_access_context_to_video_service() -> None:
    metadata_service = MagicMock(spec=VideoService)
    metadata_service.persist_task = AsyncMock(return_value=None)
    access_context = build_access_context()

    asyncio.run(
        persist_video_task_metadata(
            metadata_service,
            task_id="video-task-001",
            access_context=access_context,
            request=CreateVideoTaskRequest(
                input_type="text",
                source_payload={"text": "解释勾股定理为什么成立。"},
                client_request_id="persist-metadata-001",
            ),
            source_payload={"text": "解释勾股定理为什么成立。"},
            created_at="2026-04-08T12:00:00Z",
        )
    )

    metadata_service.persist_task.assert_awaited_once()
    _, kwargs = metadata_service.persist_task.await_args
    assert kwargs["access_context"] == access_context


def test_create_video_task_route_returns_202_and_initial_runtime_state(monkeypatch) -> None:
    with video_client(monkeypatch) as (client, runtime_store):
        response = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json={
                "inputType": "text",
                "sourcePayload": {
                    "text": "证明洛必达法则为什么成立，请给出完整推导。",
                },
                "voicePreference": {
                    "voiceCode": "zh_female_yingyujiaoxue_uranus_bigtts",
                },
                "clientRequestId": "video_create_001",
            },
        )

    assert response.status_code == 202
    payload = response.json()
    assert payload["code"] == 202
    assert payload["data"]["taskType"] == "video"
    task_id = payload["data"]["taskId"]
    state = runtime_store.get_task_state(task_id)
    assert state is not None
    assert state["status"] == "pending"
    assert state["createdAt"] == payload["data"]["createdAt"]
    assert state["context"]["voicePreference"]["voiceCode"] == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert "accessToken" not in state["context"]
    assert runtime_store.get_runtime_value(f"xm_video_runtime_auth:{task_id}") == {
        "accessToken": VALID_TOKEN,
    }


def test_create_video_task_route_returns_409_for_same_user_same_client_request_id(monkeypatch) -> None:
    request_payload = {
        "inputType": "text",
        "sourcePayload": {
            "text": "证明洛必达法则为什么成立，请给出完整推导。",
        },
        "clientRequestId": "video_create_conflict_001",
    }

    with video_client(monkeypatch) as (client, _):
        first = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json=request_payload,
        )
        second = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json=request_payload,
        )

    assert first.status_code == 202
    assert second.status_code == 409
    assert second.json()["data"]["taskId"] == first.json()["data"]["taskId"]


def test_create_video_task_route_returns_403_when_permission_missing(monkeypatch) -> None:
    with video_client(monkeypatch, permissions=()) as (client, _):
        response = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json={
                "inputType": "text",
                "sourcePayload": {"text": "一道合法的文本输入，长度已经足够。"},
                "clientRequestId": "video_create_forbidden_001",
            },
        )

    assert response.status_code == 403
    payload = response.json()
    assert payload["data"]["error_code"] == "AUTH_PERMISSION_DENIED"
    assert payload["data"]["details"]["required_permission"] == VIDEO_TASK_CREATE_PERMISSION


def test_create_video_task_route_accepts_super_admin_wildcard_permission(monkeypatch) -> None:
    with video_client(monkeypatch, permissions=("*:*:*",)) as (client, _):
        response = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json={
                "inputType": "text",
                "sourcePayload": {"text": "一道合法的文本输入，长度已经足够。"},
                "clientRequestId": "video_create_super_admin_001",
            },
        )

    assert response.status_code == 202


def test_video_voice_route_returns_runtime_voice_options(monkeypatch) -> None:
    captured_auth: dict[str, str | None] = {}

    class FakeVoiceCatalogService:
        async def list_voices(
            self,
            *,
            access_token: str | None = None,
            client_id: str | None = None,
        ) -> VideoVoiceListPayload:
            captured_auth["access_token"] = access_token
            captured_auth["client_id"] = client_id
            return VideoVoiceListPayload(
                voices=[
                    VideoVoiceOption(
                        voice_code="zh_female_yingyujiaoxue_uranus_bigtts",
                        voice_name="tina老师 2.0",
                        provider_id="volcengine-zh_female_yingyujiaoxue_uranus_bigtts",
                        provider_name="豆包标准语音播报",
                        resource_code="doubao-voice-tina-2-0",
                        language_code="zh-CN",
                        is_default=True,
                    )
                ]
            )

    with video_client(monkeypatch) as (client, _):
        client.app.dependency_overrides[get_video_voice_catalog_service] = lambda: FakeVoiceCatalogService()
        response = client.get(
            "/api/v1/video/voices",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["voices"][0]["voiceCode"] == "zh_female_yingyujiaoxue_uranus_bigtts"
    assert payload["data"]["voices"][0]["voiceName"] == "tina老师 2.0"
    assert captured_auth == {"access_token": VALID_TOKEN, "client_id": None}


def test_create_video_task_route_wraps_request_validation_error(monkeypatch) -> None:
    with video_client(monkeypatch) as (client, _):
        response = client.post(
            "/api/v1/video/tasks",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json={
                "inputType": "text",
                "clientRequestId": "video_create_invalid_001",
            },
        )

    assert response.status_code == 422
    payload = response.json()
    assert payload["data"]["error_code"] == "TASK_INVALID_INPUT"


def test_video_metadata_route_moves_to_tasks_metadata(monkeypatch) -> None:
    fake_metadata_response = {
        "table_name": "xm_video_task",
        "task": {
            "task_id": "video_meta_001",
            "user_id": "student_001",
            "task_type": "video",
            "table_name": "xm_video_task",
            "status": "pending",
            "summary": "元数据写入测试",
            "result_ref": None,
            "detail_ref": None,
            "error_summary": None,
            "source_session_id": None,
            "source_artifact_ref": None,
            "replay_hint": "video_meta_001",
            "created_at": "2026-04-06 20:00:00",
            "started_at": None,
            "completed_at": None,
            "failed_at": None,
            "updated_at": "2026-04-06 20:00:00",
        },
        "ruoyi_payload": {},
    }
    fake_service = MagicMock(spec=VideoService)
    fake_service.persist_task = AsyncMock(return_value=fake_metadata_response)

    with video_client(monkeypatch) as (client, _):
        client.app.dependency_overrides[get_video_service] = lambda: fake_service
        response = client.post(
            "/api/v1/video/tasks/metadata",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
            json={
                "task_id": "video_meta_001",
                "user_id": "student_001",
                "status": "pending",
                "summary": "元数据写入测试",
            },
        )

    assert response.status_code == 200
    assert response.json()["task"]["task_id"] == "video_meta_001"
