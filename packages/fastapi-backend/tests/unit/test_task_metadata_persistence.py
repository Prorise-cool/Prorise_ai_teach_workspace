import asyncio
import json
from datetime import datetime

import httpx
import pytest

from app.core.errors import IntegrationError
from app.features.classroom.schemas import ClassroomTaskMetadataCreateRequest
from app.features.classroom.service import ClassroomService
from app.features.video.schemas import VideoTaskMetadataCreateRequest
from app.features.video.service import VideoService
from app.shared.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataRepository,
    TaskType,
    snapshot_from_ruoyi_row,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.task_framework.status import TaskStatus

def test_repository_upserts_lifecycle_and_preserves_long_term_fields() -> None:
    repository = TaskMetadataRepository()

    created_at = datetime(2026, 3, 29, 10, 30, 0)
    updated_at = datetime(2026, 3, 29, 10, 31, 0)
    failed_at = datetime(2026, 3, 29, 10, 35, 0)

    processing_request = TaskMetadataCreateRequest(
        task_id="video_001",
        user_id="student_001",
        task_type=TaskType.VIDEO.value,
        status=TaskStatus.PROCESSING,
        summary="视频任务处理中",
        result_ref="cos://video/001/result.json",
        detail_ref="cos://video/001/detail.json",
        source_session_id="session_001",
        source_artifact_ref="cos://video/001/artifact",
        created_at=created_at,
        updated_at=updated_at
    )
    processing_snapshot = repository.save_task(processing_request, default_task_type=TaskType.VIDEO)

    assert processing_snapshot.table_name == "xm_video_task"
    assert processing_snapshot.status == TaskStatus.PROCESSING
    assert processing_snapshot.started_at == created_at
    assert processing_snapshot.replay_hint == "cos://video/001/result.json"
    assert processing_snapshot.to_ruoyi_payload()["taskState"] == "processing"
    assert processing_snapshot.to_ruoyi_payload()["createTime"] == "2026-03-29 10:30:00"

    failed_request = TaskMetadataCreateRequest(
        task_id="video_001",
        user_id="student_001",
        task_type=TaskType.VIDEO.value,
        status=TaskStatus.FAILED,
        summary="视频任务失败",
        error_summary="TTS provider offline",
        detail_ref="cos://video/001/failure.json",
        source_session_id="session_001",
        source_artifact_ref="cos://video/001/artifact",
        created_at=created_at,
        updated_at=failed_at
    )
    failed_snapshot = repository.save_task(failed_request, default_task_type=TaskType.VIDEO)

    assert failed_snapshot.created_at == created_at
    assert failed_snapshot.failed_at == failed_at
    assert failed_snapshot.error_summary == "TTS provider offline"
    assert failed_snapshot.detail_ref == "cos://video/001/failure.json"
    assert failed_snapshot.to_ruoyi_payload()["failTime"] == "2026-03-29 10:35:00"


def test_repository_replay_session_keeps_video_and_classroom_records_visible() -> None:
    repository = TaskMetadataRepository()

    repository.save_task(
        TaskMetadataCreateRequest(
            task_id="video_session_001",
            user_id="student_001",
            task_type=TaskType.VIDEO.value,
            status=TaskStatus.COMPLETED,
            summary="视频任务完成",
            result_ref="cos://video/session-001/result.json",
            source_session_id="session_001",
            created_at=datetime(2026, 3, 29, 11, 0, 0),
            updated_at=datetime(2026, 3, 29, 11, 5, 0)
        ),
        default_task_type=TaskType.VIDEO
    )
    repository.save_task(
        TaskMetadataCreateRequest(
            task_id="classroom_session_001",
            user_id="student_001",
            task_type=TaskType.CLASSROOM.value,
            status=TaskStatus.FAILED,
            summary="课堂会话失败",
            error_summary="slide graph missing",
            source_session_id="session_001",
            created_at=datetime(2026, 3, 29, 11, 1, 0),
            updated_at=datetime(2026, 3, 29, 11, 6, 0)
        ),
        default_task_type=TaskType.CLASSROOM
    )

    replay = repository.replay_session("session_001")

    assert replay.total == 2
    assert {row.task_type for row in replay.rows} == {TaskType.VIDEO.value, TaskType.CLASSROOM.value}
    assert any(row.error_summary == "slide graph missing" for row in replay.rows)


def test_snapshot_from_ruoyi_row_restores_video_task_shape() -> None:
    snapshot = snapshot_from_ruoyi_row(
        {
            "id": 9,
            "taskId": "video_009",
            "userId": "student_009",
            "taskType": "video",
            "taskState": "completed",
            "summary": "视频任务完成",
            "resultRef": "cos://video/009/result.json",
            "sourceSessionId": "session_009",
            "createTime": "2026-03-29 12:00:00",
            "updateTime": "2026-03-29 12:05:00"
        }
    )

    assert snapshot.table_name == "xm_video_task"
    assert snapshot.task_id == "video_009"
    assert snapshot.status == TaskStatus.COMPLETED


def test_snapshot_from_ruoyi_row_coerces_integer_user_id_to_string() -> None:
    snapshot = snapshot_from_ruoyi_row(
        {
            "id": 10,
            "taskId": "video_010",
            "userId": 1,
            "taskType": "video",
            "taskState": "failed",
            "summary": "视频任务失败",
            "createTime": "2026-03-29 12:10:00",
            "updateTime": "2026-03-29 12:11:00",
        }
    )

    assert snapshot.user_id == "1"


def test_snapshot_from_ruoyi_row_rejects_unknown_task_type() -> None:
    with pytest.raises(ValueError, match="unsupported task_type"):
        snapshot_from_ruoyi_row(
            {
                "id": 9,
                "taskId": "video_bad",
                "userId": "student_bad",
                "taskType": "unknown-domain",
                "taskState": "completed",
                "summary": "坏数据",
                "createTime": "2026-03-29 12:00:00",
                "updateTime": "2026-03-29 12:05:00"
            }
        )


def test_classroom_service_upserts_to_ruoyi() -> None:
    calls: list[tuple[str, str, dict | None]] = []
    stored_rows: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        calls.append((request.method, request.url.path, payload))
        if request.method == "GET":
            return httpx.Response(200, json={"code": 200, "msg": "ok", "rows": stored_rows, "total": len(stored_rows)})
        if request.method == "POST":
            row = {"id": 1, **payload}
            stored_rows[:] = [row]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        if request.method == "PUT":
            row = {"id": payload["id"], **{k: v for k, v in payload.items() if k != "id"}}
            stored_rows[:] = [row]
            return httpx.Response(200, json={"code": 200, "msg": "ok", "data": row})
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    service = ClassroomService(client_factory=client_factory)

    response = asyncio.run(
        service.persist_task(
            ClassroomTaskMetadataCreateRequest(
                task_id="classroom_002",
                user_id="student_002",
                status=TaskStatus.COMPLETED,
                summary="课堂会话完成",
                result_ref="cos://classroom/002/result.json",
                source_session_id="session_002",
                created_at=datetime(2026, 3, 29, 12, 0, 0),
                updated_at=datetime(2026, 3, 29, 12, 5, 0)
            )
        )
    )

    assert response.table_name == "xm_classroom_session"
    assert response.task.task_type == TaskType.CLASSROOM.value
    assert response.ruoyi_payload["taskType"] == "classroom"
    assert calls[0][:2] == ("GET", "/classroom/session/list")
    assert calls[1][:2] == ("POST", "/classroom/session")

    updated = asyncio.run(
        service.persist_task(
            ClassroomTaskMetadataCreateRequest(
                task_id="classroom_002",
                user_id="student_002",
                status=TaskStatus.FAILED,
                summary="课堂会话失败",
                error_summary="outline missing",
                source_session_id="session_002",
                created_at=datetime(2026, 3, 29, 12, 0, 0),
                updated_at=datetime(2026, 3, 29, 12, 10, 0)
            )
        )
    )

    assert updated.task.status == TaskStatus.FAILED
    assert updated.task.error_summary == "outline missing"
    assert calls[2][:2] == ("GET", "/classroom/session/list")
    assert calls[3][:2] == ("PUT", "/classroom/session")
    assert calls[3][2]["id"] == 1


def test_video_service_replay_session_fetches_all_pages() -> None:
    calls: list[tuple[str, int, int]] = []
    rows = [
        {
            "id": index + 1,
            "taskId": f"video_replay_{index:03d}",
            "userId": "student_replay",
            "taskType": "video",
            "taskState": "completed",
            "summary": f"视频任务 {index}",
            "resultRef": f"cos://video/replay/{index:03d}.json",
            "sourceSessionId": "session_replay",
            "createTime": "2026-03-29 12:00:00",
            "updateTime": f"2026-03-29 12:{index % 60:02d}:00"
        }
        for index in range(105)
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        page_num = int(request.url.params["pageNum"])
        page_size = int(request.url.params["pageSize"])
        calls.append((request.url.path, page_num, page_size))
        start = (page_num - 1) * page_size
        end = start + page_size
        return httpx.Response(
            200,
            json={"code": 200, "msg": "ok", "rows": rows[start:end], "total": len(rows)}
        )

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    service = VideoService(client_factory=client_factory)
    replay = asyncio.run(service.replay_session("session_replay"))

    assert replay.total == 105
    assert len(replay.rows) == 105
    assert replay.rows[0].task_id == "video_replay_000"
    assert replay.rows[-1].task_id == "video_replay_104"
    assert calls == [
        ("/video/task/list", 1, 100),
        ("/video/task/list", 2, 100)
    ]


def test_video_service_accepts_ack_only_write_response() -> None:
    calls: list[tuple[str, str, dict | None]] = []
    stored_rows: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        calls.append((request.method, request.url.path, payload))
        if request.method == "GET":
            return httpx.Response(200, json={"code": 200, "msg": "ok", "rows": stored_rows, "total": len(stored_rows)})
        if request.method == "POST":
            stored_rows[:] = [{"id": 1, **(payload or {})}]
            return httpx.Response(200, json={"code": 200, "msg": "ok"})
        if request.method == "PUT":
            stored_rows[:] = [{"id": payload["id"], **{k: v for k, v in (payload or {}).items() if k != "id"}}]
            return httpx.Response(200, json={"code": 200, "msg": "ok"})
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    service = VideoService(client_factory=client_factory)

    created = asyncio.run(
        service.persist_task(
            VideoTaskMetadataCreateRequest(
                task_id="video_ack_001",
                user_id="student_ack_001",
                status=TaskStatus.PROCESSING,
                summary="视频任务处理中",
                source_session_id="session_ack_001",
                created_at=datetime(2026, 3, 29, 12, 0, 0),
                updated_at=datetime(2026, 3, 29, 12, 1, 0),
            )
        )
    )

    updated = asyncio.run(
        service.persist_task(
            VideoTaskMetadataCreateRequest(
                task_id="video_ack_001",
                user_id="student_ack_001",
                status=TaskStatus.COMPLETED,
                summary="视频任务完成",
                result_ref="cos://video/ack-001/result.json",
                source_session_id="session_ack_001",
                created_at=datetime(2026, 3, 29, 12, 0, 0),
                updated_at=datetime(2026, 3, 29, 12, 3, 0),
            )
        )
    )

    assert created.task.task_id == "video_ack_001"
    assert updated.task.status == TaskStatus.COMPLETED
    assert calls[0][:2] == ("GET", "/video/task/list")
    assert calls[1][:2] == ("POST", "/video/task")
    assert calls[2][:2] == ("GET", "/video/task/list")
    assert calls[3][:2] == ("PUT", "/video/task")


def test_video_service_rejects_unknown_task_type_from_ruoyi() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
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

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    service = VideoService(client_factory=client_factory)

    with pytest.raises(IntegrationError) as exc_info:
        asyncio.run(service.list_tasks())

    assert exc_info.value.code == "RUOYI_INVALID_RESPONSE"
    assert exc_info.value.details["reason"] == "unsupported task_type: unknown-domain"
