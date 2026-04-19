from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.features.video.long_term.records import (
    VideoPublicationPage,
    VideoPublicationSnapshot,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.models import (
    PublishState,
    VideoResult,
    VideoResultDetail,
    build_video_result_id,
)
from app.features.video.service import VideoService
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.status import TaskStatus
from app.shared.task_metadata import TaskMetadataSnapshot, TaskType


class _RecordingPublicationGateway:
    def __init__(self) -> None:
        self.sync_requests: list[object] = []
        self.list_request_auths: list[RuoYiRequestAuth | None] = []
        self.publication = self._build_publication(is_public=False)

    @staticmethod
    def _build_publication(*, is_public: bool) -> VideoPublicationSnapshot:
        now = datetime(2026, 4, 19, 9, 0, tzinfo=UTC)
        return VideoPublicationSnapshot(
            work_id=1,
            work_type="video",
            task_ref_id="video-task-001",
            user_id="10001",
            title="勾股定理完整讲解",
            description="勾股定理讲解",
            cover_url="https://cdn.test/cover.jpg",
            is_public=is_public,
            status="normal",
            published_at=now if is_public else None,
            created_at=now,
            updated_at=now,
            version=1,
        )

    async def sync_publication(self, request, *, access_context=None, request_auth=None):  # noqa: ANN001
        self.sync_requests.append(request)
        self.publication = self._build_publication(is_public=bool(request.is_public))
        return self.publication

    async def get_publication(self, task_ref_id: str, *, access_context=None, request_auth=None):  # noqa: ANN001
        del task_ref_id, access_context, request_auth
        return self.publication

    async def list_publications(self, *, page: int, page_size: int, access_context=None, request_auth=None):  # noqa: ANN001
        del page, page_size, access_context
        self.list_request_auths.append(request_auth)
        return VideoPublicationPage(rows=[self.publication], total=1)


class _StubVideoService(VideoService):
    def __init__(self, *, asset_store: LocalAssetStore, publication_service) -> None:
        super().__init__(asset_store=asset_store, publication_service=publication_service)
        self.snapshot: TaskMetadataSnapshot | None = None
        self.persist_task = AsyncMock(return_value=SimpleNamespace())
        self.build_task_request_calls: list[dict[str, object]] = []
        self.get_task_request_auths: list[RuoYiRequestAuth | None] = []

    def build_task_request(self, **kwargs):  # noqa: ANN003
        self.build_task_request_calls.append(kwargs)
        return SimpleNamespace(**kwargs)

    async def get_task(self, task_id: str, *, access_context=None, request_auth=None):  # noqa: ANN001
        del task_id, access_context
        self.get_task_request_auths.append(request_auth)
        return self.snapshot


def _build_snapshot(*, detail_ref: str | None = None) -> TaskMetadataSnapshot:
    now = datetime(2026, 4, 19, 9, 0, tzinfo=UTC)
    return TaskMetadataSnapshot(
        task_id="video-task-001",
        user_id="10001",
        task_type=TaskType.VIDEO.value,
        table_name="xm_video_task",
        status=TaskStatus.COMPLETED,
        summary="勾股定理讲解",
        detail_ref=detail_ref,
        created_at=now,
        updated_at=now,
    )


def _build_runtime_store() -> RuntimeStore:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    detail = VideoResultDetail(
        task_id="video-task-001",
        status="completed",
        result=VideoResult(
            task_id="video-task-001",
            video_url="https://cdn.test/video.webm",
            cover_url="https://cdn.test/cover.jpg",
            duration=23,
            summary="勾股定理讲解",
            knowledge_points=["直角三角形"],
            result_id=build_video_result_id("video-task-001"),
            completed_at="2026-04-19T09:00:00Z",
            title="勾股定理完整讲解",
        ),
        publish_state=PublishState(),
    )
    VideoRuntimeStateStore(runtime_store, "video-task-001").save_model("result_detail", detail)
    return runtime_store


def test_publish_task_uses_runtime_detail_when_detail_ref_missing(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_gateway = _RecordingPublicationGateway()
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_gateway,
    )
    service.snapshot = _build_snapshot(detail_ref=None)
    runtime_store = _build_runtime_store()

    result = asyncio.run(
        service.publish_task(
            "video-task-001",
            access_context=SimpleNamespace(user_id="10001", username="teacher"),
            runtime_store=runtime_store,
        )
    )

    persisted_detail = asset_store.read_result_detail("video/video-task-001/result-detail.json")
    runtime_detail = VideoRuntimeStateStore(runtime_store, "video-task-001").load_model(
        "result_detail", VideoResultDetail
    )

    assert result.published is True
    assert result.card is not None
    assert result.card.result_id == "vr-video-task-001"
    assert publication_gateway.sync_requests[0].task_ref_id == "video-task-001"
    assert persisted_detail.publish_state.published is True
    assert runtime_detail is not None
    assert runtime_detail.publish_state.published is True
    service.persist_task.assert_awaited_once()
    assert service.build_task_request_calls[0]["detail_ref"].endswith("/video/video-task-001/result-detail.json")


def test_unpublish_task_updates_runtime_and_asset_when_detail_ref_missing(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_gateway = _RecordingPublicationGateway()
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_gateway,
    )
    service.snapshot = _build_snapshot(detail_ref=None)
    runtime_store = _build_runtime_store()

    asyncio.run(
        service.publish_task(
            "video-task-001",
            access_context=SimpleNamespace(user_id="10001", username="teacher"),
            runtime_store=runtime_store,
        )
    )
    result = asyncio.run(
        service.unpublish_task(
            "video-task-001",
            access_context=SimpleNamespace(user_id="10001", username="teacher"),
            runtime_store=runtime_store,
        )
    )

    persisted_detail = asset_store.read_result_detail("video/video-task-001/result-detail.json")
    runtime_detail = VideoRuntimeStateStore(runtime_store, "video-task-001").load_model(
        "result_detail", VideoResultDetail
    )

    assert result.published is False
    assert persisted_detail.publish_state.published is False
    assert runtime_detail is not None
    assert runtime_detail.publish_state.published is False


def test_list_published_tasks_uses_runtime_detail_when_snapshot_has_no_detail_ref(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_gateway = _RecordingPublicationGateway()
    publication_gateway.publication = publication_gateway._build_publication(is_public=True)
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_gateway,
    )
    service.snapshot = _build_snapshot(detail_ref=None)
    runtime_store = _build_runtime_store()
    request_auth = RuoYiRequestAuth(access_token="request-token", client_id="request-client-id")

    page = asyncio.run(
        service.list_published_tasks(
            page=1,
            page_size=12,
            runtime_store=runtime_store,
            request_auth=request_auth,
        )
    )

    assert page.total == 1
    assert page.rows[0].result_id == "vr-video-task-001"
    assert publication_gateway.list_request_auths == [request_auth]
    assert service.get_task_request_auths == [request_auth]
