from __future__ import annotations

from fastapi.testclient import TestClient

from app.features.video.pipeline.models import (
    PublishState,
    VideoNarrationSegment,
    VideoResult,
    VideoResultDetail,
    VideoResultSection,
    VideoTimelineItem,
)
from app.features.video.routes import get_video_service
from app.main import create_app
from tests.helpers.app import create_authed_app


class _StubVideoService:
    async def get_result_detail(self, task_id: str, **kwargs) -> VideoResultDetail:  # noqa: ANN003
        del kwargs
        return _build_detail(task_id)

    async def get_public_result_detail(self, result_id: str, **kwargs) -> VideoResultDetail:  # noqa: ANN003
        del kwargs
        return _build_detail(result_id.removeprefix("vr-"))


def _build_detail(task_id: str) -> VideoResultDetail:
    return VideoResultDetail(
        task_id=task_id,
        status="completed",
        result=VideoResult(
            task_id=task_id,
            video_url="https://cdn.test/output.webm",
            cover_url="https://cdn.test/cover.jpg",
            duration=23,
            summary="勾股定理讲解",
            knowledge_points=["导数", "极限"],
            result_id=f"vr-{task_id}",
            completed_at="2026-04-19T09:00:00Z",
            title="证明洛必达法则的由来",
        ),
        sections=[
            VideoResultSection(
                section_id="section_1",
                section_index=0,
                title="认识题目",
                lecture_lines=["先看条件", "再看变化率"],
                narration_text="先看条件，再看变化率。",
                audio_url="https://cdn.test/audio.mp3",
                clip_url="https://cdn.test/clip.webm",
                start_time=0,
                end_time=8,
            )
        ],
        timeline=[
            VideoTimelineItem(
                section_id="section_1",
                title="认识题目",
                start_time=0,
                end_time=8,
            )
        ],
        narration=[
            VideoNarrationSegment(
                section_id="section_1",
                text="先看条件，再看变化率。",
                start_time=0,
                end_time=8,
            )
        ],
        publish_state=PublishState(
            published=True,
            published_at="2026-04-19T09:00:00Z",
            author_name="teacher",
        ),
    )


def test_video_result_route_returns_enriched_contract() -> None:
    app = create_authed_app()
    app.dependency_overrides[get_video_service] = lambda: _StubVideoService()

    with TestClient(app) as client:
        response = client.get("/api/v1/video/tasks/video-task-001/result")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["sections"][0]["clipUrl"] == "https://cdn.test/clip.webm"
    assert data["timeline"][0]["startTime"] == 0
    assert data["narration"][0]["text"] == "先看条件，再看变化率。"
    assert data["publicUrl"] == "http://testserver/api/v1/video/public/vr-video-task-001"


def test_public_video_result_route_is_anonymous() -> None:
    app = create_app()
    app.dependency_overrides[get_video_service] = lambda: _StubVideoService()

    with TestClient(app) as client:
        response = client.get("/api/v1/video/public/vr-video-task-001")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["publishState"]["published"] is True
    assert data["result"]["resultId"] == "vr-video-task-001"
    assert data["publicUrl"] == "http://testserver/api/v1/video/public/vr-video-task-001"
