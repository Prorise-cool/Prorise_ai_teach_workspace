from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    PublishState,
    VideoArtifactGraph,
    VideoPreviewSection,
    VideoPreviewSectionStatus,
    VideoResult,
    VideoResultDetail,
    VideoTaskPreview,
    build_video_result_id,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore
from app.features.video.service import VideoService
from app.infra.redis_client import RuntimeStore
from app.shared.cos_client import CosClient
from app.shared.task_framework.status import TaskInternalStatus, TaskStatus
from app.shared.task_metadata import TaskMetadataSnapshot, TaskType


class _StubVideoService(VideoService):
    def __init__(self, *, asset_store: LocalAssetStore, publication_service) -> None:
        super().__init__(asset_store=asset_store, publication_service=publication_service)
        self.snapshot: TaskMetadataSnapshot | None = None

    async def get_task(self, task_id: str, *, access_context=None, request_auth=None):  # noqa: ANN001
        return self.snapshot


def _build_snapshot(*, detail_ref: str | None = None) -> TaskMetadataSnapshot:
    now = datetime(2026, 4, 12, 10, 0, tzinfo=UTC)
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


def _build_detail(task_id: str = "video-task-001") -> VideoResultDetail:
    return VideoResultDetail(
        task_id=task_id,
        status="completed",
        result=VideoResult(
            task_id=task_id,
            video_url="https://cdn.test/video.mp4",
            cover_url="https://cdn.test/cover.jpg",
            duration=120,
            summary="勾股定理讲解",
            knowledge_points=["直角三角形", "面积法"],
            result_id=build_video_result_id(task_id),
            completed_at="2026-04-12T10:00:00Z",
            title="勾股定理完整讲解",
        ),
        publish_state=PublishState(published=False),
    )


def _build_runtime_store(task_id: str, *, detail: VideoResultDetail | None = None) -> RuntimeStore:
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    runtime_store.set_task_state(
        task_id=task_id,
        task_type="video",
        internal_status=TaskInternalStatus.SUCCEEDED,
        message="任务执行完成",
        progress=100,
        request_id="req-video-result-001",
        user_id="10001",
        source="video",
    )
    if detail is not None:
        VideoRuntimeStateStore(runtime_store, task_id).save_model("result_detail", detail)
    return runtime_store


def _write_artifact_graph(asset_store: LocalAssetStore, *, task_id: str = "video-task-001") -> None:
    graph = VideoArtifactGraph(
        session_id=task_id,
        artifacts=[
            ArtifactPayload(
                artifact_type=ArtifactType.TIMELINE,
                data={
                    "scenes": [
                        {
                            "sceneId": "section_1",
                            "title": "认识题目",
                            "startTime": 0,
                            "endTime": 18,
                        }
                    ]
                },
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.NARRATION,
                data={
                    "segments": [
                        {
                            "sceneId": "section_1",
                            "text": "先看条件，再观察直角三角形关系。",
                            "startTime": 0,
                            "endTime": 18,
                        }
                    ]
                },
            ),
        ],
    )
    asset_store.write_json(
        f"video/{task_id}/artifact-graph.json",
        graph.model_dump(mode="json", by_alias=True),
    )


def test_get_result_detail_reads_runtime_result_detail_when_detail_ref_missing(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    service.snapshot = _build_snapshot()
    detail = _build_detail()
    runtime_store = _build_runtime_store("video-task-001", detail=detail)
    VideoRuntimeStateStore(runtime_store, "video-task-001").save_preview(
        VideoTaskPreview(
            task_id="video-task-001",
            status="completed",
            preview_available=True,
            preview_version=1,
            summary="勾股定理讲解",
            knowledge_points=["直角三角形"],
            total_sections=1,
            ready_sections=1,
            failed_sections=0,
            sections=[
                VideoPreviewSection(
                    section_id="section_1",
                    section_index=0,
                    title="认识题目",
                    lecture_lines=["先看条件", "再看图形关系"],
                    status=VideoPreviewSectionStatus.READY,
                    audio_url="https://cdn.test/audio.mp3",
                    clip_url="https://cdn.test/clip.webm",
                )
            ],
        )
    )
    _write_artifact_graph(asset_store)

    result = asyncio.run(service.get_result_detail("video-task-001", runtime_store=runtime_store))

    assert result.status == "completed"
    assert result.result is not None
    assert result.result.video_url == "https://cdn.test/video.mp4"
    assert result.sections[0].title == "认识题目"
    assert result.sections[0].lecture_lines == ["先看条件", "再看图形关系"]
    assert result.sections[0].narration_text == "先看条件，再观察直角三角形关系。"
    assert result.sections[0].clip_url == "https://cdn.test/clip.webm"
    assert result.timeline[0].start_time == 0
    assert result.timeline[0].end_time == 18
    assert result.narration[0].text == "先看条件，再观察直角三角形关系。"
    publication_service.get_publication.assert_awaited_once_with(
        "video-task-001",
        access_context=None,
    )


def test_get_result_detail_falls_back_to_runtime_state_when_runtime_detail_missing(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    service.snapshot = _build_snapshot()
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    runtime_store.set_task_state(
        task_id="video-task-001",
        task_type="video",
        internal_status=TaskInternalStatus.QUEUED,
        message="任务排队中",
        progress=0,
        request_id="req-video-result-002",
        user_id="10001",
        source="video",
    )

    result = asyncio.run(service.get_result_detail("video-task-001", runtime_store=runtime_store))

    assert result.status == "processing"
    assert result.result is None
    publication_service.get_publication.assert_not_awaited()


def test_get_preview_detail_reads_runtime_preview_when_available(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    service.snapshot = _build_snapshot()
    runtime_store = _build_runtime_store("video-task-001")
    preview = VideoTaskPreview(
        task_id="video-task-001",
        status="processing",
        preview_available=True,
        preview_version=3,
        summary="勾股定理讲解",
        knowledge_points=["直角三角形"],
        total_sections=1,
        ready_sections=1,
        failed_sections=0,
        sections=[
            VideoPreviewSection(
                section_id="section_1",
                section_index=0,
                title="认识题目",
                lecture_lines=["先看条件"],
                status=VideoPreviewSectionStatus.READY,
                audio_url="https://cdn.test/audio.mp3",
                clip_url="https://cdn.test/clip.mp4",
            )
        ],
    )
    VideoRuntimeStateStore(runtime_store, "video-task-001").save_preview(preview)

    result = asyncio.run(service.get_preview_detail("video-task-001", runtime_store=runtime_store))

    assert result.preview_version == 3
    assert result.preview_available is True
    assert result.sections[0].clip_url == "https://cdn.test/clip.mp4"


def test_get_preview_detail_falls_back_to_minimal_structure_when_preview_missing(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    service.snapshot = _build_snapshot()
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    runtime_store.set_task_state(
        task_id="video-task-001",
        task_type="video",
        internal_status=TaskInternalStatus.RUNNING,
        message="正在处理",
        progress=42,
        request_id="req-video-preview-001",
        user_id="10001",
        source="video",
    )

    result = asyncio.run(service.get_preview_detail("video-task-001", runtime_store=runtime_store))

    assert result.status == "processing"
    assert result.preview_available is False
    assert result.summary == "勾股定理讲解"
    assert result.sections == []


def test_get_public_result_detail_requires_published_state(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    detail = _build_detail()
    asset_store.write_json(
        "video/video-task-001/result-detail.json",
        detail.model_dump(mode="json", by_alias=True),
    )

    try:
        asyncio.run(service.get_public_result_detail("vr-video-task-001"))
    except Exception as exc:  # noqa: BLE001
        assert getattr(exc, "status_code", None) == 404
    else:  # pragma: no cover - safety guard
        raise AssertionError("expected public route to reject unpublished detail")


def test_get_public_result_detail_reads_persisted_detail(tmp_path: Path) -> None:
    asset_store = LocalAssetStore(root_dir=tmp_path, cos_client=CosClient("https://cos.test.local"))
    publication_service = SimpleNamespace(get_publication=AsyncMock(return_value=None))
    service = _StubVideoService(
        asset_store=asset_store,
        publication_service=publication_service,
    )
    detail = _build_detail().model_copy(
        update={
            "publish_state": PublishState(
                published=True,
                published_at="2026-04-12T10:00:00Z",
                author_name="teacher",
            )
        }
    )
    asset_store.write_json(
        "video/video-task-001/result-detail.json",
        detail.model_dump(mode="json", by_alias=True),
    )
    _write_artifact_graph(asset_store)

    result = asyncio.run(service.get_public_result_detail("vr-video-task-001"))

    assert result.publish_state.published is True
    assert result.result is not None
    assert result.result.result_id == "vr-video-task-001"
    assert result.timeline[0].title == "认识题目"
