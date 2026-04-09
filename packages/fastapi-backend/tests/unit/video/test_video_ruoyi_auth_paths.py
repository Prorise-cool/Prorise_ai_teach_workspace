from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import asyncio

from app.features.video.long_term_records import VideoPublicationPage, VideoPublicationSnapshot
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.models import ArtifactPayload, ArtifactType, PublishState, VideoArtifactGraph, VideoResult, VideoResultDetail
from app.features.video.service import VideoService
from app.shared.cos_client import CosClient
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.status import TaskStatus
from app.shared.task_metadata import TaskMetadataSnapshot, TaskType


class _RecordingPublicationService:
    def __init__(self, publication: VideoPublicationSnapshot) -> None:
        self.publication = publication
        self.request_auths: list[RuoYiRequestAuth | None] = []

    async def list_publications(self, *, page: int, page_size: int, request_auth: RuoYiRequestAuth | None = None, access_context=None):  # noqa: ANN001
        self.request_auths.append(request_auth)
        return VideoPublicationPage(rows=[self.publication], total=1)


class _RecordingArtifactIndexService:
    def __init__(self) -> None:
        self.request_auths: list[RuoYiRequestAuth | None] = []

    async def sync_artifact_batch(self, request, *, access_context=None, request_auth: RuoYiRequestAuth | None = None):  # noqa: ANN001
        self.request_auths.append(request_auth)
        return request


class _RecordingVideoService(VideoService):
    def __init__(self, *, asset_store: LocalAssetStore, publication_service, artifact_index_service) -> None:
        super().__init__(
            asset_store=asset_store,
            publication_service=publication_service,
            artifact_index_service=artifact_index_service,
        )
        self.get_task_request_auths: list[RuoYiRequestAuth | None] = []
        self.snapshot: TaskMetadataSnapshot | None = None

    async def get_task(self, task_id: str, *, access_context=None, request_auth: RuoYiRequestAuth | None = None):  # noqa: ANN001
        self.get_task_request_auths.append(request_auth)
        return self.snapshot


def _build_detail(asset_store: LocalAssetStore, *, detail_ref_task_id: str) -> str:
    detail = VideoResultDetail(
        task_id=detail_ref_task_id,
        status="completed",
        result=VideoResult(
            task_id=detail_ref_task_id,
            video_url="https://cdn.test/video.mp4",
            cover_url="https://cdn.test/cover.jpg",
            duration=120,
            summary="勾股定理讲解",
            knowledge_points=["直角三角形", "面积法"],
            result_id="video-result-001",
            completed_at="2026-04-08T12:00:00Z",
            title="勾股定理完整讲解",
        ),
        publish_state=PublishState(published=True, published_at="2026-04-08T12:00:00Z", author_name="teacher"),
    )
    asset = asset_store.write_json(f"video/{detail_ref_task_id}/result-detail.json", detail.model_dump(mode="json", by_alias=True))
    return asset.public_url


def _build_snapshot(detail_ref: str) -> TaskMetadataSnapshot:
    now = datetime(2026, 4, 8, 12, 0, tzinfo=UTC)
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


def _build_publication() -> VideoPublicationSnapshot:
    now = datetime(2026, 4, 8, 12, 0, tzinfo=UTC)
    return VideoPublicationSnapshot(
        work_id=1,
        work_type="video",
        task_ref_id="video-task-001",
        user_id="10001",
        title="勾股定理完整讲解",
        description="勾股定理讲解",
        cover_url="https://cdn.test/cover.jpg",
        is_public=True,
        status="normal",
        published_at=now,
        created_at=now,
        updated_at=now,
    )


def test_list_published_tasks_uses_explicit_service_request_auth(monkeypatch, tmp_path: Path) -> None:
    service_request_auth = RuoYiRequestAuth(
        access_token="service-token",
        client_id="service-client-id",
    )
    monkeypatch.setattr(
        "app.features.video.service.load_ruoyi_service_auth",
        lambda: service_request_auth,
    )

    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    detail_ref = _build_detail(asset_store, detail_ref_task_id="video-task-001")
    publication_service = _RecordingPublicationService(_build_publication())
    artifact_index_service = _RecordingArtifactIndexService()
    service = _RecordingVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
        artifact_index_service=artifact_index_service,
    )
    service.snapshot = _build_snapshot(detail_ref)

    page = asyncio.run(service.list_published_tasks(page=1, page_size=12))

    assert page.total == 1
    assert publication_service.request_auths == [service_request_auth]
    assert service.get_task_request_auths == [service_request_auth]


def test_sync_artifact_graph_forwards_service_request_auth(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = _RecordingPublicationService(_build_publication())
    artifact_index_service = _RecordingArtifactIndexService()
    service = _RecordingVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
        artifact_index_service=artifact_index_service,
    )
    service_request_auth = RuoYiRequestAuth(
        access_token="service-token",
        client_id="service-client-id",
    )
    graph = VideoArtifactGraph(
        session_id="video-task-001",
        artifacts=[ArtifactPayload(artifact_type=ArtifactType.TIMELINE, data={"scenes": [{"sceneId": "scene_1"}]})],
    )

    asyncio.run(
        service.sync_artifact_graph(
            graph,
            artifact_ref="https://cos.test/video/video-task-001/artifact-graph.json",
            request_auth=service_request_auth,
        )
    )

    assert artifact_index_service.request_auths == [service_request_auth]
