from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.features.video.pipeline.models import (
    VideoPreviewSection,
    VideoPreviewSectionStatus,
    VideoTaskPreview,
)
from app.features.video.routes import get_video_service
from tests.conftest import override_auth


class _StubVideoService:
    async def get_preview_detail(self, task_id: str, **kwargs) -> VideoTaskPreview:  # noqa: ANN003
        return VideoTaskPreview(
            task_id=task_id,
            status="processing",
            preview_available=True,
            preview_version=2,
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


def test_video_preview_route_returns_progressive_preview_payload() -> None:
    app = create_app()
    override_auth(app)
    app.dependency_overrides[get_video_service] = lambda: _StubVideoService()

    with TestClient(app) as client:
        response = client.get("/api/v1/video/tasks/video-task-001/preview")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "code": 200,
        "msg": "查询成功",
        "data": {
            "taskId": "video-task-001",
            "status": "processing",
            "previewAvailable": True,
            "previewVersion": 2,
            "summary": "勾股定理讲解",
            "knowledgePoints": ["直角三角形"],
            "totalSections": 1,
            "readySections": 1,
            "failedSections": 0,
            "sections": [
                {
                    "sectionId": "section_1",
                    "sectionIndex": 0,
                    "title": "认识题目",
                    "lectureLines": ["先看条件"],
                    "status": "ready",
                    "audioUrl": "https://cdn.test/audio.mp3",
                    "clipUrl": "https://cdn.test/clip.mp4",
                    "errorMessage": None,
                    "fixAttempt": None,
                    "updatedAt": response.json()["data"]["sections"][0]["updatedAt"],
                }
            ],
            "updatedAt": response.json()["data"]["updatedAt"],
        },
    }
