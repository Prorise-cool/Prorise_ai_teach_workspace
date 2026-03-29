from fastapi.testclient import TestClient

from app.features.video.task_metadata import shared_task_metadata_repository
from app.main import create_app


client = TestClient(create_app())


def _reset_repository() -> None:
    shared_task_metadata_repository.clear()


def test_task_metadata_routes_persist_query_and_replay_with_ruoyi_time_format() -> None:
    _reset_repository()

    video_create = client.post(
        "/api/v1/video/tasks",
        json={
            "task_id": "video_route_001",
            "user_id": "student_100",
            "status": "processing",
            "summary": "视频任务处理中",
            "result_ref": "cos://video-route/result.json",
            "source_session_id": "session_route_001",
            "created_at": "2026-03-29 13:00:00",
            "updated_at": "2026-03-29 13:01:00"
        }
    )
    classroom_create = client.post(
        "/api/v1/classroom/tasks",
        json={
            "task_id": "classroom_route_001",
            "user_id": "student_100",
            "status": "failed",
            "summary": "课堂任务失败",
            "error_summary": "slide outline missing",
            "source_session_id": "session_route_001",
            "created_at": "2026-03-29 13:02:00",
            "updated_at": "2026-03-29 13:03:00"
        }
    )

    assert video_create.status_code == 200
    assert classroom_create.status_code == 200

    video_payload = video_create.json()
    classroom_payload = classroom_create.json()

    assert video_payload["table_name"] == "xm_video_task"
    assert video_payload["task"]["status"] == "processing"
    assert video_payload["task"]["created_at"] == "2026-03-29 13:00:00"
    assert video_payload["ruoyi_payload"]["task_state"] == "processing"
    assert video_payload["ruoyi_payload"]["create_time"] == "2026-03-29 13:00:00"

    assert classroom_payload["table_name"] == "xm_classroom_session"
    assert classroom_payload["task"]["status"] == "failed"
    assert classroom_payload["task"]["failed_at"] == "2026-03-29 13:03:00"
    assert classroom_payload["ruoyi_payload"]["fail_time"] == "2026-03-29 13:03:00"

    video_detail = client.get("/api/v1/video/tasks/video_route_001")
    replay = client.get("/api/v1/video/sessions/session_route_001/replay")

    assert video_detail.status_code == 200
    assert video_detail.json()["created_at"] == "2026-03-29 13:00:00"
    assert video_detail.json()["updated_at"] == "2026-03-29 13:01:00"
    assert replay.status_code == 200
    assert replay.json()["total"] == 2
    assert {row["task_type"] for row in replay.json()["rows"]} == {"video", "classroom"}
    assert any(row["error_summary"] == "slide outline missing" for row in replay.json()["rows"])


def test_failed_task_stays_visible_when_filtered_by_status() -> None:
    _reset_repository()

    client.post(
        "/api/v1/video/tasks",
        json={
            "task_id": "video_route_002",
            "user_id": "student_200",
            "status": "failed",
            "summary": "视频任务失败",
            "error_summary": "provider timeout",
            "source_session_id": "session_route_002",
            "created_at": "2026-03-29 14:00:00",
            "updated_at": "2026-03-29 14:05:00"
        }
    )
    client.post(
        "/api/v1/video/tasks",
        json={
            "task_id": "video_route_003",
            "user_id": "student_200",
            "status": "completed",
            "summary": "视频任务完成",
            "result_ref": "cos://video-route/003/result.json",
            "source_session_id": "session_route_003",
            "created_at": "2026-03-29 14:10:00",
            "updated_at": "2026-03-29 14:15:00"
        }
    )

    response = client.get("/api/v1/video/tasks", params={"userId": "student_200", "status": "failed"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["rows"][0]["task_id"] == "video_route_002"
    assert payload["rows"][0]["error_summary"] == "provider timeout"
