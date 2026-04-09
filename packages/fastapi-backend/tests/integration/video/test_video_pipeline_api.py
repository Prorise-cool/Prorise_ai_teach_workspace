from __future__ import annotations

import asyncio
import json
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime

import httpx
from fastapi.testclient import TestClient

from app.core.errors import IntegrationError
from app.core.security import AccessContext, RuoYiAccessProfile, get_security_runtime_store
from tests.conftest import override_auth
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import PublishState
from app.features.video.pipeline.sandbox import LocalSandboxExecutor
from app.features.video.pipeline.services import VideoPipelineService
from app.features.video.routes import get_video_service
from app.features.video.service import VideoService
from app.features.video.tasks.video_task_actor import VideoTask
from app.infra.redis_client import RuntimeStore
from app.main import create_app
from app.providers.factory import get_provider_factory
from app.shared.cos_client import CosClient
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.ruoyi_client import RuoYiClient
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.scheduler import TaskScheduler

VALID_TOKEN = "video-publish-token"


def _build_client_factory(handler):
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return factory


def _build_video_service(tmp_path, state: dict[str, object]) -> VideoService:
    def build_publication_row(payload: dict[str, object], *, existing: dict[str, object] | None) -> dict[str, object]:
        now = datetime(2026, 4, 6, 20, 0, 0).replace(microsecond=0)
        updated_at = now.replace(second=len(state["publications"]) + 1).strftime("%Y-%m-%d %H:%M:%S")
        created_at = existing["createdAt"] if existing is not None else updated_at
        work_id = existing["workId"] if existing is not None else len(state["publications"]) + 1
        version = existing["version"] + 1 if existing is not None else 0
        return {
            "tableName": "xm_user_work",
            "workId": work_id,
            "workType": payload.get("workType", "video"),
            "taskRefId": payload["taskRefId"],
            "userId": str(payload["userId"]),
            "title": payload.get("title") or (existing["title"] if existing is not None else ""),
            "description": payload.get("description") or (existing.get("description") if existing is not None else None),
            "coverUrl": payload.get("coverUrl") or (existing.get("coverUrl") if existing is not None else None),
            "isPublic": bool(payload.get("isPublic")),
            "status": payload.get("status") or (existing["status"] if existing is not None else "normal"),
            "publishedAt": updated_at if payload.get("isPublic") else None,
            "createdAt": created_at,
            "updatedAt": updated_at,
            "version": version,
        }

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        if request.url.path == "/video/task/list":
            task_id = request.url.params.get("taskId")
            task_state = request.url.params.get("taskState")
            rows = state["video"]
            if task_id:
                rows = [row for row in rows if row["taskId"] == task_id]
            if task_state:
                rows = [row for row in rows if row["taskState"] == task_state]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "rows": rows, "total": len(rows)})
        if request.method == "POST" and request.url.path == "/video/task":
            row = {"id": len(state["video"]) + 1, **payload}
            state["video"].append(row)
            state.setdefault("video_write_requests", []).append({"method": request.method, "payload": payload})
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "PUT" and request.url.path == "/video/task":
            row = {"id": payload["id"], **{key: value for key, value in payload.items() if key != "id"}}
            state["video"] = [row]
            state.setdefault("video_write_requests", []).append({"method": request.method, "payload": payload})
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "POST" and request.url.path == "/internal/xiaomai/video/publications":
            existing = next(
                (item for item in state["publications"] if item["taskRefId"] == payload["taskRefId"]),
                None,
            )
            row = build_publication_row(payload, existing=existing)
            if existing is None:
                state["publications"].append(row)
            else:
                state["publications"] = [
                    row if item["taskRefId"] == payload["taskRefId"] else item for item in state["publications"]
                ]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "GET" and request.url.path.startswith("/internal/xiaomai/video/publications/"):
            task_ref_id = request.url.path.rsplit("/", 1)[-1]
            row = next((item for item in state["publications"] if item["taskRefId"] == task_ref_id), None)
            if row is None:
                return httpx.Response(200, json={"code": 404, "msg": "not found", "data": None})
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "GET" and request.url.path == "/internal/xiaomai/video/publications":
            rows = [
                item
                for item in state["publications"]
                if item["workType"] == request.url.params.get("workType", "video")
                and item["status"] == request.url.params.get("status", "normal")
                and int(item["isPublic"]) == int(request.url.params.get("isPublic", "1"))
            ]
            rows.sort(key=lambda item: item["updatedAt"], reverse=True)
            page_num = int(request.url.params.get("pageNum", "1"))
            page_size = int(request.url.params.get("pageSize", "12"))
            start = max(page_num - 1, 0) * page_size
            end = start + page_size
            return httpx.Response(
                200,
                json={"code": 200, "msg": "ok", "rows": rows[start:end], "total": len(rows)},
            )
        if request.method == "POST" and request.url.path == "/internal/xiaomai/video/session-artifacts":
            state["session_artifacts"][payload["sessionRefId"]] = payload
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "msg": "ok",
                    "data": {
                        "tableName": "xm_session_artifact",
                        "sessionType": payload["sessionType"],
                        "sessionRefId": payload["sessionRefId"],
                        "payloadRef": payload.get("payloadRef"),
                        "syncedCount": len(payload.get("artifacts", [])),
                        "artifacts": payload.get("artifacts", []),
                    },
                },
            )
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    return VideoService(
        client_factory=_build_client_factory(handler),
        asset_store=asset_store,
    )


class InlinePipelineTask(VideoTask):
    def __init__(self, context: TaskContext, *, pipeline_service: VideoPipelineService, runtime_store, metadata_service) -> None:
        super().__init__(context, runtime_store=runtime_store, metadata_service=metadata_service)
        self.pipeline_service = pipeline_service

    async def run(self):
        return await self.pipeline_service.run(self)


def _run_pipeline(*, tmp_path, runtime_store: RuntimeStore, video_service: VideoService) -> str:
    pipeline_service = VideoPipelineService(
        runtime_store=runtime_store,
        metadata_service=video_service,
        provider_factory=get_provider_factory(),
        settings=type(
            "SettingsOverride",
            (),
            {
                "default_llm_provider": "stub-llm",
                "default_tts_provider": "stub-tts",
                "video_asset_root": str(tmp_path),
                "video_target_duration_seconds": 120,
                "video_min_duration_seconds": 90,
                "video_max_duration_seconds": 180,
                "video_fix_max_attempts": 2,
                "video_ffmpeg_timeout_seconds": 1,
                "video_upload_retry_attempts": 2,
                "video_publish_cache_ttl_seconds": 600,
                "video_output_audio_format": "mp3",
                "video_output_audio_sample_rate": 44100,
                "video_output_audio_bitrate": "192k",
                "video_sandbox_cpu_count": 1.0,
                "video_sandbox_memory_mb": 2048,
                "video_sandbox_timeout_seconds": 120,
                "video_sandbox_tmp_size_mb": 1024,
            },
        )(),
        asset_store=video_service._asset_store,
        sandbox_executor=LocalSandboxExecutor(),
    )
    task_id = "video_pipeline_api_001"
    context = TaskContext(
        task_id=task_id,
        task_type="video",
        user_id="10001",
        request_id="req_video_pipeline_api_001",
        source_module="test",
        metadata={
            "inputType": "text",
            "sourcePayload": {"text": "证明勾股定理，并解释为什么这个方法成立。"},
            "userProfile": {"subject": "math", "grade": "junior"},
        },
    )
    task = InlinePipelineTask(
        context,
        pipeline_service=pipeline_service,
        runtime_store=runtime_store,
        metadata_service=video_service,
    )
    scheduler = TaskScheduler(runtime_store=runtime_store)
    result = asyncio.run(scheduler.dispatch(task, emit_queued_snapshot=False))
    assert result.status.value == "completed"
    return task_id


@contextmanager
def api_client(
    tmp_path,
    runtime_store: RuntimeStore,
    video_service: VideoService,
    access_context: AccessContext | None = None,
) -> Iterator[TestClient]:
    app = create_app()
    effective_access_context = access_context or AccessContext(
        user_id="10001",
        username="student_demo",
        roles=("student",),
        permissions=("*:*:*",),
        token=VALID_TOKEN,
        client_id="test-client-id",
        request_id="test-req-id",
        online_ttl_seconds=86400,
    )
    override_auth(app, effective_access_context)
    app.dependency_overrides[get_video_service] = lambda: video_service
    app.dependency_overrides[get_security_runtime_store] = lambda: runtime_store
    runtime_store.set_online_token_record(
        effective_access_context.token,
        {"tokenId": effective_access_context.token, "userName": effective_access_context.username},
        ttl_seconds=600,
    )

    app.state.runtime_store = runtime_store
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def test_video_pipeline_result_and_publish_api_flow(tmp_path, monkeypatch) -> None:
    state = {"video": [], "publications": [], "session_artifacts": {}}
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    video_service = _build_video_service(tmp_path, state)
    service_request_auth = RuoYiRequestAuth(
        access_token="service-token",
        client_id="service-client-id",
    )
    monkeypatch.setattr(
        "app.features.video.pipeline.orchestrator.load_ruoyi_service_auth",
        lambda: service_request_auth,
    )
    monkeypatch.setattr(
        "app.features.video.service.load_ruoyi_service_auth",
        lambda: service_request_auth,
    )
    task_id = _run_pipeline(tmp_path=tmp_path, runtime_store=runtime_store, video_service=video_service)

    async def fake_load_ruoyi_access_profile(access_token: str, *, client_id: str | None = None) -> RuoYiAccessProfile:
        return RuoYiAccessProfile(
            user_id="10001",
            username="student_demo",
            roles=("student",),
            permissions=("video:task:add",),
        )

    monkeypatch.setattr("app.core.security.load_ruoyi_access_profile", fake_load_ruoyi_access_profile)

    with api_client(tmp_path, runtime_store, video_service) as client:
        result_response = client.get(f"/api/v1/video/tasks/{task_id}/result")
        publish_response = client.post(
            f"/api/v1/video/tasks/{task_id}/publish",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )
        detail_ref = state["video"][0]["detailRef"]
        detail = video_service._asset_store.read_result_detail(detail_ref)
        detail_key = video_service._asset_store.ref_to_key(detail_ref)
        video_service._asset_store.write_json(
            detail_key,
            detail.model_copy(update={"publish_state": PublishState()}).model_dump(mode="json", by_alias=True),
        )
        published_result_response = client.get(f"/api/v1/video/tasks/{task_id}/result")
        list_response = client.get("/api/v1/video/published", params={"page": 1, "pageSize": 12})
        unpublish_response = client.delete(
            f"/api/v1/video/tasks/{task_id}/publish",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )
        unpublished_result_response = client.get(f"/api/v1/video/tasks/{task_id}/result")
        list_after_response = client.get("/api/v1/video/published", params={"page": 1, "pageSize": 12})

    assert result_response.status_code == 200
    assert result_response.json()["data"]["publishState"]["published"] is False
    assert result_response.json()["data"]["result"]["taskId"] == task_id
    assert result_response.json()["data"]["result"]["videoUrl"].endswith(f"/video/{task_id}/output.mp4")
    assert result_response.json()["data"]["result"]["coverUrl"].endswith(f"/video/{task_id}/cover.jpg")

    assert task_id in state["session_artifacts"]
    assert len(state["session_artifacts"][task_id]["artifacts"]) == 6
    assert state["session_artifacts"][task_id]["artifacts"][0]["artifactType"] == "timeline"

    assert publish_response.status_code == 200
    assert publish_response.json()["data"]["published"] is True
    assert publish_response.json()["data"]["card"]["resultId"] == f"video_result_{task_id}"
    assert publish_response.json()["data"]["publishedAt"] is not None

    assert published_result_response.status_code == 200
    assert published_result_response.json()["data"]["publishState"]["published"] is True
    assert published_result_response.json()["data"]["publishState"]["publishedAt"] is not None

    assert list_response.status_code == 200
    assert list_response.json()["data"]["total"] == 1
    assert list_response.json()["data"]["rows"][0]["resultId"] == f"video_result_{task_id}"
    assert list_response.json()["data"]["rows"][0]["duration"] == 120

    assert unpublish_response.status_code == 200
    assert unpublish_response.json()["data"]["published"] is False
    assert state["publications"][0]["isPublic"] is False

    assert unpublished_result_response.status_code == 200
    assert unpublished_result_response.json()["data"]["publishState"]["published"] is False

    assert list_after_response.status_code == 200
    assert list_after_response.json()["data"]["total"] == 0


def test_video_pipeline_persists_completed_metadata_once_with_artifact_ref(tmp_path) -> None:
    state = {"video": [], "publications": [], "session_artifacts": {}, "video_write_requests": []}
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    video_service = _build_video_service(tmp_path, state)

    _run_pipeline(tmp_path=tmp_path, runtime_store=runtime_store, video_service=video_service)

    assert len(state["video_write_requests"]) == 1
    write_request = state["video_write_requests"][0]
    assert write_request["method"] == "POST"
    assert write_request["payload"]["sourceArtifactRef"].endswith("/video/video_pipeline_api_001/artifact-graph.json")
    assert write_request["payload"]["detailRef"].endswith("/video/video_pipeline_api_001/result-detail.json")


def test_video_result_detail_falls_back_to_local_publish_state_when_publication_overlay_unavailable(
    tmp_path,
    monkeypatch,
) -> None:
    state = {"video": [], "publications": [], "session_artifacts": {}}
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    video_service = _build_video_service(tmp_path, state)
    task_id = _run_pipeline(tmp_path=tmp_path, runtime_store=runtime_store, video_service=video_service)

    detail_ref = state["video"][0]["detailRef"]
    detail = video_service._asset_store.read_result_detail(detail_ref)
    detail_key = video_service._asset_store.ref_to_key(detail_ref)
    video_service._asset_store.write_json(
        detail_key,
        detail.model_copy(
            update={"publish_state": PublishState(published=True, published_at="2026-04-06T20:00:00Z")}
        ).model_dump(mode="json", by_alias=True),
    )

    async def fake_load_ruoyi_access_profile(access_token: str, *, client_id: str | None = None) -> RuoYiAccessProfile:
        return RuoYiAccessProfile(
            access_token=access_token,
            user_id="10001",
            username="video-owner",
            permissions={"video:task:read"},
            roles={"student"},
        )

    async def fail_get_publication(task_ref_id: str, *, access_context: AccessContext | None = None):
        raise IntegrationError(
            service="ruoyi",
            resource="video-publication",
            operation="get",
            code="RUOYI_UNAVAILABLE",
            message="RuoYi service unavailable",
            status_code=502,
            retryable=True,
        )

    monkeypatch.setattr("app.core.security.load_ruoyi_access_profile", fake_load_ruoyi_access_profile)
    monkeypatch.setattr(video_service._publication_service, "get_publication", fail_get_publication)

    with api_client(tmp_path, runtime_store, video_service) as client:
        response = client.get(f"/api/v1/video/tasks/{task_id}/result")

    assert response.status_code == 200
    assert response.json()["data"]["publishState"]["published"] is True
    assert response.json()["data"]["publishState"]["publishedAt"] == "2026-04-06T20:00:00Z"


def test_video_pipeline_result_detail_rejects_non_owner(tmp_path) -> None:
    state = {"video": [], "publications": [], "session_artifacts": {}}
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    video_service = _build_video_service(tmp_path, state)
    task_id = _run_pipeline(tmp_path=tmp_path, runtime_store=runtime_store, video_service=video_service)

    with api_client(
        tmp_path,
        runtime_store,
        video_service,
        access_context=AccessContext(
            user_id="20002",
            username="another_student",
            roles=("student",),
            permissions=("*:*:*",),
            token="another-video-token",
            client_id="test-client-id",
            request_id="test-req-id-unauthorized",
            online_ttl_seconds=86400,
        ),
    ) as client:
        response = client.get(f"/api/v1/video/tasks/{task_id}/result")

    assert response.status_code == 403
    assert response.json()["data"]["error_code"] == "AUTH_PERMISSION_DENIED"
