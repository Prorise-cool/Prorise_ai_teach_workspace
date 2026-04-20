from datetime import datetime, timezone

from app.features.video.long_term.records import (
    build_session_artifact_batch_request,
    video_publication_from_ruoyi_data,
    video_publication_to_ruoyi_payload,
    VideoPublicationSyncRequest,
)
from app.features.video.pipeline.models import ArtifactPayload, ArtifactType, VideoArtifactGraph


def test_video_publication_from_ruoyi_data_uses_updated_time_as_published_time() -> None:
    snapshot = video_publication_from_ruoyi_data(
        {
            "tableName": "xm_user_work",
            "workId": 9001,
            "workType": "video",
            "taskRefId": "video-task-001",
            "userId": "10001",
            "title": "勾股定理讲解",
            "description": "面积法证明",
            "coverUrl": "https://cdn.test/video-task-001/cover.jpg",
            "isPublic": 1,
            "status": "normal",
            "createdAt": "2026-04-06 20:00:00",
            "updatedAt": "2026-04-06 20:05:00",
            "version": 2,
        }
    )

    assert snapshot.task_ref_id == "video-task-001"
    assert snapshot.is_public is True
    assert snapshot.published_at == datetime(2026, 4, 6, 20, 5, 0)
    assert snapshot.version == 2


def test_build_session_artifact_batch_request_derives_titles_summaries_and_metadata() -> None:
    graph = VideoArtifactGraph(
        session_id="video-task-002",
        created_at=datetime(2026, 4, 6, 20, 10, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        artifacts=[
            ArtifactPayload(
                artifact_type=ArtifactType.TIMELINE,
                data={"scenes": [{"sceneId": "scene_1"}, {"sceneId": "scene_2"}]},
            ),
            ArtifactPayload(
                artifact_type=ArtifactType.MANIM_CODE,
                data={"scriptContent": "from manim import *\nclass Demo(Scene):\n    pass\n"},
            ),
        ],
    )

    request = build_session_artifact_batch_request(
        graph,
        object_key="video/video-task-002/artifact-graph.json",
        payload_ref="https://cos.test/video/video-task-002/artifact-graph.json",
    )

    assert request.session_ref_id == "video-task-002"
    assert request.artifacts[0].title == "视频时间轴"
    assert request.artifacts[0].summary == "2 个场景时间片"
    assert request.artifacts[0].metadata["sceneCount"] == 2
    assert request.artifacts[1].title == "Manim 代码"
    assert request.artifacts[1].metadata["lineCount"] == 3


def test_video_publication_to_ruoyi_payload_truncates_title_and_description() -> None:
    payload = video_publication_to_ruoyi_payload(
        VideoPublicationSyncRequest(
            user_id="10001",
            task_ref_id="video-task-003",
            title="t" * 999,
            description="d" * 999,
            cover_url="https://cdn.test/video-task-003/cover.jpg",
            is_public=True,
        )
    )

    assert payload["title"] == "t" * 200
    assert payload["description"] == "d" * 500
