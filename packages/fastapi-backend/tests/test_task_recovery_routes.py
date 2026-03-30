from fastapi.testclient import TestClient

from app.core.sse import TaskProgressEvent
from app.main import create_app
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus


def test_task_events_route_replays_missing_events_after_last_event_id() -> None:
    with TestClient(create_app()) as client:
        runtime_store = client.app.state.runtime_store
        task_id = "video_20260330153000_route001"
        runtime_store.clear()
        runtime_store.set_task_state(
            task_id=task_id,
            task_type="video",
            internal_status=TaskInternalStatus.RUNNING,
            message="任务处理中",
            progress=55,
            request_id="req_route_recovery_001",
            source="video",
            context={"stage": "scene_generation"}
        )
        first_event = runtime_store.append_task_event(
            task_id,
            TaskProgressEvent(
                event="progress",
                task_id=task_id,
                task_type="video",
                status="processing",
                progress=20,
                message="脚本生成中",
                request_id="req_route_recovery_001",
                error_code=None
            )
        )
        runtime_store.append_task_event(
            task_id,
            TaskProgressEvent(
                event="heartbeat",
                task_id=task_id,
                task_type="video",
                status="processing",
                progress=40,
                message="任务仍在执行",
                request_id="req_route_recovery_001",
                error_code=None
            )
        )
        runtime_store.append_task_event(
            task_id,
            TaskProgressEvent(
                event="completed",
                task_id=task_id,
                task_type="video",
                status="completed",
                progress=100,
                message="任务执行完成",
                request_id="req_route_recovery_001",
                error_code=None,
                result={"videoId": "asset_001"}
            )
        )

        response = client.get(
            f"/api/v1/tasks/{task_id}/events",
            headers={"Last-Event-ID": first_event.id or ""}
        )

        runtime_store.clear()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["x-task-recovery-mode"] == "replay"
    assert first_event.id not in response.text
    assert "event: heartbeat" in response.text
    assert "event: completed" in response.text


def test_task_status_route_returns_latest_snapshot_and_resume_metadata() -> None:
    with TestClient(create_app()) as client:
        runtime_store = client.app.state.runtime_store
        task_id = "video_20260330153500_route002"
        runtime_store.clear()
        runtime_store.set_task_state(
            task_id=task_id,
            task_type="video",
            internal_status=TaskInternalStatus.ERROR,
            message="任务执行失败",
            progress=87,
            request_id="req_route_recovery_002",
            error_code=TaskErrorCode.PROVIDER_TIMEOUT,
            source="video",
            context={
                "stage": "provider_failover",
                "nextAction": "retry_or_poll"
            }
        )
        last_event = runtime_store.append_task_event(
            task_id,
            TaskProgressEvent(
                event="failed",
                task_id=task_id,
                task_type="video",
                status="failed",
                progress=87,
                message="任务执行失败",
                request_id="req_route_recovery_002",
                error_code=TaskErrorCode.PROVIDER_TIMEOUT
            )
        )

        response = client.get(f"/api/v1/tasks/{task_id}/status")

        runtime_store.clear()

    assert response.status_code == 200
    assert response.json() == {
        "code": 200,
        "msg": "查询成功",
        "data": {
            "taskId": task_id,
            "taskType": "video",
            "status": "failed",
            "progress": 87,
            "message": "任务执行失败",
            "timestamp": response.json()["data"]["timestamp"],
            "requestId": "req_route_recovery_002",
            "errorCode": "TASK_PROVIDER_TIMEOUT",
            "stage": "provider_failover",
            "context": {
                "stage": "provider_failover",
                "nextAction": "retry_or_poll"
            },
            "resumeFrom": last_event.id,
            "lastEventId": last_event.id
        }
    }


def test_task_events_route_signals_status_fallback_when_no_new_events_exist() -> None:
    with TestClient(create_app()) as client:
        runtime_store = client.app.state.runtime_store
        task_id = "video_20260330154000_route003"
        runtime_store.clear()
        runtime_store.set_task_state(
            task_id=task_id,
            task_type="video",
            internal_status=TaskInternalStatus.RUNNING,
            message="等待新的事件写入",
            progress=42,
            request_id="req_route_recovery_003",
            source="video"
        )
        event = runtime_store.append_task_event(
            task_id,
            TaskProgressEvent(
                event="progress",
                task_id=task_id,
                task_type="video",
                status="processing",
                progress=42,
                message="等待新的事件写入",
                request_id="req_route_recovery_003",
                error_code=None
            )
        )

        response = client.get(
            f"/api/v1/tasks/{task_id}/events",
            headers={"Last-Event-ID": event.id or ""}
        )

        runtime_store.clear()

    assert response.status_code == 200
    assert response.text == ""
    assert response.headers["x-task-recovery-mode"] == "snapshot-required"
    assert response.headers["x-task-last-event-id"] == event.id
