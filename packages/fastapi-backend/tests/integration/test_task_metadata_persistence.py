import json
from datetime import datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app.features.classroom.routes import get_classroom_service
from app.features.classroom.service import ClassroomService
from app.features.video.routes import get_video_service
from app.features.video.service import VideoService
from app.main import create_app
from app.shared.ruoyi_client import RuoYiClient


def _build_client_factory(handler):
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    return factory


def _create_client(handler) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_video_service] = lambda: VideoService(client_factory=_build_client_factory(handler))
    app.dependency_overrides[get_classroom_service] = lambda: ClassroomService(client_factory=_build_client_factory(handler))
    return TestClient(app)


@pytest.fixture
def client() -> TestClient:
    state = {
        "video": [],
        "classroom": [],
    }

    def _filter_rows(rows: list[dict], query_params: httpx.QueryParams) -> list[dict]:
        task_id = query_params.get("taskId")
        user_id = query_params.get("userId")
        session_id = query_params.get("sourceSessionId")
        task_state = query_params.get("taskState")
        updated_from = query_params.get("params[beginUpdateTime]")
        updated_to = query_params.get("params[endUpdateTime]")
        filtered = rows
        if task_id:
            filtered = [row for row in filtered if row["taskId"] == task_id]
        if user_id:
            filtered = [row for row in filtered if row["userId"] == user_id]
        if session_id:
            filtered = [row for row in filtered if row.get("sourceSessionId") == session_id]
        if task_state:
            filtered = [row for row in filtered if row["taskState"] == task_state]
        if updated_from:
            begin_dt = datetime.strptime(updated_from, "%Y-%m-%d %H:%M:%S")
            filtered = [
                row for row in filtered
                if datetime.strptime(row["updateTime"], "%Y-%m-%d %H:%M:%S") >= begin_dt
            ]
        if updated_to:
            end_dt = datetime.strptime(updated_to, "%Y-%m-%d %H:%M:%S")
            filtered = [
                row for row in filtered
                if datetime.strptime(row["updateTime"], "%Y-%m-%d %H:%M:%S") <= end_dt
            ]
        return filtered

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        if request.url.path == "/video/task/list":
            rows = _filter_rows(state["video"], request.url.params)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "rows": rows, "total": len(rows)})
        if request.url.path == "/classroom/session/list":
            rows = _filter_rows(state["classroom"], request.url.params)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "rows": rows, "total": len(rows)})
        if request.method == "POST" and request.url.path == "/video/task":
            row = {"id": len(state["video"]) + 1, **payload}
            state["video"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "PUT" and request.url.path == "/video/task":
            row = {"id": payload["id"], **{key: value for key, value in payload.items() if key != "id"}}
            state["video"] = [row]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "POST" and request.url.path == "/classroom/session":
            row = {"id": len(state["classroom"]) + 1, **payload}
            state["classroom"].append(row)
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "PUT" and request.url.path == "/classroom/session":
            row = {"id": payload["id"], **{key: value for key, value in payload.items() if key != "id"}}
            state["classroom"] = [row]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    return _create_client(handler)


def test_task_metadata_routes_persist_query_and_replay_with_ruoyi_time_format(client: TestClient) -> None:
    video_create = client.post(
        "/api/v1/video/tasks/metadata",
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
    assert video_payload["ruoyi_payload"]["taskState"] == "processing"
    assert video_payload["ruoyi_payload"]["createTime"] == "2026-03-29 13:00:00"

    assert classroom_payload["table_name"] == "xm_classroom_session"
    assert classroom_payload["task"]["status"] == "failed"
    assert classroom_payload["task"]["failed_at"] == "2026-03-29 13:03:00"
    assert classroom_payload["ruoyi_payload"]["failTime"] == "2026-03-29 13:03:00"

    video_detail = client.get("/api/v1/video/tasks/video_route_001")
    video_replay = client.get("/api/v1/video/sessions/session_route_001/replay")
    classroom_replay = client.get("/api/v1/classroom/sessions/session_route_001/replay")

    assert video_detail.status_code == 200
    assert video_detail.json()["created_at"] == "2026-03-29 13:00:00"
    assert video_detail.json()["updated_at"] == "2026-03-29 13:01:00"

    assert video_replay.status_code == 200
    assert video_replay.json()["total"] == 1
    assert {row["task_type"] for row in video_replay.json()["rows"]} == {"video"}

    assert classroom_replay.status_code == 200
    assert classroom_replay.json()["total"] == 1
    assert {row["task_type"] for row in classroom_replay.json()["rows"]} == {"classroom"}
    assert classroom_replay.json()["rows"][0]["error_summary"] == "slide outline missing"


def test_failed_task_stays_visible_when_filtered_by_status(client: TestClient) -> None:
    client.post(
        "/api/v1/video/tasks/metadata",
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
        "/api/v1/video/tasks/metadata",
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


def test_video_task_filters_use_exact_session_match_and_single_sided_time_window(client: TestClient) -> None:
    client.post(
        "/api/v1/video/tasks/metadata",
        json={
            "task_id": "video_route_010",
            "user_id": "student_300",
            "status": "completed",
            "summary": "精确匹配目标会话",
            "source_session_id": "session_10",
            "created_at": "2026-03-29 15:00:00",
            "updated_at": "2026-03-29 15:10:00"
        }
    )
    client.post(
        "/api/v1/video/tasks/metadata",
        json={
            "task_id": "video_route_011",
            "user_id": "student_300",
            "status": "completed",
            "summary": "相似但不应命中",
            "source_session_id": "session_100",
            "created_at": "2026-03-29 15:05:00",
            "updated_at": "2026-03-29 15:20:00"
        }
    )

    exact_response = client.get("/api/v1/video/tasks", params={"sourceSessionId": "session_10"})
    updated_from_response = client.get(
        "/api/v1/video/tasks",
        params={"userId": "student_300", "updatedFrom": "2026-03-29 15:15:00"}
    )
    updated_to_response = client.get(
        "/api/v1/video/tasks",
        params={"userId": "student_300", "updatedTo": "2026-03-29 15:15:00"}
    )

    assert exact_response.status_code == 200
    assert exact_response.json()["total"] == 1
    assert exact_response.json()["rows"][0]["task_id"] == "video_route_010"

    assert updated_from_response.status_code == 200
    assert updated_from_response.json()["total"] == 1
    assert updated_from_response.json()["rows"][0]["task_id"] == "video_route_011"

    assert updated_to_response.status_code == 200
    assert updated_to_response.json()["total"] == 1
    assert updated_to_response.json()["rows"][0]["task_id"] == "video_route_010"


def test_task_metadata_routes_return_invalid_response_envelope_for_unknown_task_type() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/video/task/list":
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "msg": "ok",
                    "rows": [
                        {
                            "id": 1,
                            "taskId": "video_bad",
                            "userId": "student_bad",
                            "taskType": "unknown-domain",
                            "taskState": "completed",
                            "summary": "坏数据",
                            "createTime": "2026-03-29 12:00:00",
                            "updateTime": "2026-03-29 12:05:00"
                        }
                    ],
                    "total": 1
                }
            )
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    with _create_client(handler) as client:
        list_response = client.get("/api/v1/video/tasks")
        detail_response = client.get("/api/v1/video/tasks/video_bad")

    assert list_response.status_code == 502
    assert list_response.json()["data"]["error_code"] == "RUOYI_INVALID_RESPONSE"
    assert list_response.json()["data"]["details"]["reason"] == "unsupported task_type: unknown-domain"

    assert detail_response.status_code == 502
    assert detail_response.json()["data"]["error_code"] == "RUOYI_INVALID_RESPONSE"
    assert detail_response.json()["data"]["details"]["reason"] == "unsupported task_type: unknown-domain"
