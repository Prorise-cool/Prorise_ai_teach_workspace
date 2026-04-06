from __future__ import annotations

import asyncio
import json
from collections.abc import Iterator
from contextlib import contextmanager

import httpx
from fastapi.testclient import TestClient

from app.core.security import RuoYiAccessProfile, get_security_runtime_store
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.sandbox import LocalSandboxExecutor
from app.features.video.pipeline.services import VideoPipelineService
from app.features.video.routes import get_video_service
from app.features.video.service import VideoService
from app.features.video.tasks.video_task_actor import VideoTask
from app.infra.redis_client import RuntimeStore
from app.main import create_app
from app.providers.factory import get_provider_factory
from app.shared.cos_client import CosClient
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


def _build_video_service(tmp_path, state: dict[str, list[dict]]) -> VideoService:
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
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "PUT" and request.url.path == "/video/task":
            row = {"id": payload["id"], **{key: value for key, value in payload.items() if key != "id"}}
            state["video"] = [row]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
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
def api_client(tmp_path, runtime_store: RuntimeStore, video_service: VideoService) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_video_service] = lambda: video_service
    app.dependency_overrides[get_security_runtime_store] = lambda: runtime_store
    runtime_store.set_online_token_record(
        VALID_TOKEN,
        {"tokenId": VALID_TOKEN, "userName": "student_demo"},
        ttl_seconds=600,
    )

    app.state.runtime_store = runtime_store
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def test_video_pipeline_result_and_publish_api_flow(tmp_path, monkeypatch) -> None:
    state = {"video": []}
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    video_service = _build_video_service(tmp_path, state)
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
        list_response = client.get("/api/v1/video/published", params={"page": 1, "pageSize": 12})
        unpublish_response = client.delete(
            f"/api/v1/video/tasks/{task_id}/publish",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )
        list_after_response = client.get("/api/v1/video/published", params={"page": 1, "pageSize": 12})

    assert result_response.status_code == 200
    assert result_response.json()["data"]["result"]["taskId"] == task_id
    assert result_response.json()["data"]["result"]["videoUrl"].endswith(f"/video/{task_id}/output.mp4")
    assert result_response.json()["data"]["result"]["coverUrl"].endswith(f"/video/{task_id}/cover.jpg")

    assert publish_response.status_code == 200
    assert publish_response.json()["data"]["published"] is True
    assert publish_response.json()["data"]["card"]["resultId"] == f"video_result_{task_id}"

    assert list_response.status_code == 200
    assert list_response.json()["data"]["total"] == 1
    assert list_response.json()["data"]["rows"][0]["resultId"] == f"video_result_{task_id}"

    assert unpublish_response.status_code == 200
    assert unpublish_response.json()["data"]["published"] is False

    assert list_after_response.status_code == 200
    assert list_after_response.json()["data"]["total"] == 0
