import asyncio

import app.api.routes.tasks as task_routes
from fastapi.testclient import TestClient

from app.core.sse import TaskProgressEvent
from app.infra.redis_client import RuntimeStore
from app.main import create_app
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus


class FakeStreamingRequest:
    def __init__(self) -> None:
        self.disconnected = False

    async def is_disconnected(self) -> bool:
        return self.disconnected


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

        with client.stream(
            "GET",
            f"/api/v1/tasks/{task_id}/events",
            headers={"Last-Event-ID": first_event.id or ""},
        ) as response:
            body = "".join(response.iter_text())

        runtime_store.clear()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["x-task-recovery-mode"] == "replay"
    assert "event: connected" in body
    assert first_event.id not in body
    assert "event: heartbeat" in body
    assert "event: completed" in body


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


def test_task_events_route_streams_live_events_after_connection(monkeypatch) -> None:
    monkeypatch.setattr(task_routes, "SSE_POLL_INTERVAL_SECONDS", 0.01)

    async def run_scenario() -> str:
        runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
        request = FakeStreamingRequest()
        task_id = "video_20260330154000_route003"
        runtime_store.set_task_state(
            task_id=task_id,
            task_type="video",
            internal_status=TaskInternalStatus.RUNNING,
            message="等待新的事件写入",
            progress=42,
            request_id="req_route_recovery_003",
            source="video",
            context={"stage": "scene_generation"},
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
                error_code=None,
                stage="scene_generation",
                context={"stage": "scene_generation"},
            )
        )
        stream = task_routes.stream_task_events(
            task_id=task_id,
            request=request,
            runtime_store=runtime_store,
            recovery_state=runtime_store.load_task_recovery_state(task_id, after_event_id=event.id),
            latest_event_id=runtime_store.load_task_recovery_state(task_id).latest_event_id,
        )

        async def publish_completion() -> None:
            await asyncio.sleep(0.02)
            runtime_store.set_task_state(
                task_id=task_id,
                task_type="video",
                internal_status=TaskInternalStatus.SUCCEEDED,
                message="任务执行完成",
                progress=100,
                request_id="req_route_recovery_003",
                source="video",
                context={
                    "stage": "completed",
                    "result": {"videoId": "asset_001"},
                },
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
                    request_id="req_route_recovery_003",
                    error_code=None,
                    stage="completed",
                    result={"videoId": "asset_001"},
                    context={
                        "stage": "completed",
                        "result": {"videoId": "asset_001"},
                    },
                ),
            )

        publisher = asyncio.create_task(publish_completion())
        frames: list[str] = []
        async for frame in stream:
            frames.append(frame)
            if '"result":{"videoId":"asset_001"}' in frame:
                break

        await stream.aclose()
        await publisher
        return "".join(frames)

    body = asyncio.run(run_scenario())

    assert "event: connected" in body
    assert "event: completed" in body
    assert '"stage":"completed"' in body
    assert '"result":{"videoId":"asset_001"}' in body


def test_task_events_route_emits_heartbeat_when_waiting_for_new_events(monkeypatch) -> None:
    monkeypatch.setattr(task_routes, "SSE_POLL_INTERVAL_SECONDS", 0.01)
    monkeypatch.setattr(task_routes, "SSE_HEARTBEAT_INTERVAL_SECONDS", 0.02)

    async def run_scenario() -> tuple[str, str]:
        runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
        request = FakeStreamingRequest()
        task_id = "video_20260330154500_route004"
        runtime_store.set_task_state(
            task_id=task_id,
            task_type="video",
            internal_status=TaskInternalStatus.RUNNING,
            message="等待新的事件写入",
            progress=42,
            request_id="req_route_recovery_004",
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
                request_id="req_route_recovery_004",
                error_code=None
            )
        )
        stream = task_routes.stream_task_events(
            task_id=task_id,
            request=request,
            runtime_store=runtime_store,
            recovery_state=runtime_store.load_task_recovery_state(task_id, after_event_id=event.id),
            latest_event_id=runtime_store.load_task_recovery_state(task_id).latest_event_id,
        )

        frames: list[str] = []
        async for frame in stream:
            frames.append(frame)
            if "event: heartbeat" in frame:
                request.disconnected = True
                break

        await stream.aclose()
        return event.id or "", "".join(frames)

    last_event_id, body = asyncio.run(run_scenario())

    assert "event: connected" in body
    assert "event: heartbeat" in body
    assert last_event_id
