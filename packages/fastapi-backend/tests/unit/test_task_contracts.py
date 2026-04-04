import json
from pathlib import Path

from app.core.sse import (
    TaskProgressEvent,
    build_sse_event_id,
    encode_sse_event,
    parse_sse_event_id
)
from app.infra.sse_broker import InMemorySseBroker
from app.schemas.common import TaskSnapshotPayload, build_success_envelope
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    is_retryable_error,
    map_internal_status
)


PROJECT_ROOT = Path(__file__).resolve().parents[4]


def _load_json(relative_path: str) -> dict[str, object] | list[dict[str, object]]:
    return json.loads((PROJECT_ROOT / relative_path).read_text(encoding="utf-8"))


def test_task_status_mapping_and_error_dictionary_are_frozen() -> None:
    assert {status.value for status in TaskStatus} == {
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled"
    }
    assert map_internal_status(TaskInternalStatus.QUEUED) == TaskStatus.PENDING
    assert map_internal_status(TaskInternalStatus.RUNNING) == TaskStatus.PROCESSING
    assert map_internal_status(TaskInternalStatus.RETRYING) == TaskStatus.PROCESSING
    assert map_internal_status(TaskInternalStatus.SUCCEEDED) == TaskStatus.COMPLETED
    assert map_internal_status(TaskInternalStatus.ERROR) == TaskStatus.FAILED
    assert map_internal_status(TaskInternalStatus.CANCELLING) == TaskStatus.CANCELLED
    assert not is_retryable_error(TaskErrorCode.CANCELLED)
    assert is_retryable_error(TaskErrorCode.PROVIDER_TIMEOUT)


def test_task_contract_models_serialize_public_fields_in_camel_case() -> None:
    snapshot_payload = TaskSnapshotPayload(
        task_id="video_20260330130500_ab12cd34",
        task_type="video",
        status="processing",
        progress=42,
        message="任务处理中状态已同步",
        timestamp="2026-03-30T13:05:24Z",
        request_id="req_task_snapshot_001",
        error_code=None,
        stage="script_generation",
        context={"source": "status-polling"},
        resume_from="video_20260330130500_ab12cd34:evt:000003",
        last_event_id="video_20260330130500_ab12cd34:evt:000003"
    )
    success_envelope = build_success_envelope(snapshot_payload)

    assert success_envelope["data"] == {
        "taskId": "video_20260330130500_ab12cd34",
        "taskType": "video",
        "status": "processing",
        "progress": 42,
        "message": "任务处理中状态已同步",
        "timestamp": "2026-03-30T13:05:24Z",
        "requestId": "req_task_snapshot_001",
        "errorCode": None,
        "stage": "script_generation",
        "context": {"source": "status-polling"},
        "resumeFrom": "video_20260330130500_ab12cd34:evt:000003",
        "lastEventId": "video_20260330130500_ab12cd34:evt:000003"
    }


def test_sse_event_encoding_includes_id_sequence_and_aliases() -> None:
    broker = InMemorySseBroker()
    encoded_event = broker.publish(
        TaskProgressEvent(
            event="provider_switch",
            task_id="video_20260330130500_ef56gh78",
            task_type="video",
            status="processing",
            progress=87,
            message="主 Provider 不可用，已切换备用 Provider",
            timestamp="2026-03-30T13:05:12Z",
            request_id="req_task_failed_001",
            error_code=TaskErrorCode.PROVIDER_UNAVAILABLE,
            from_="gemini-2_5-flash",
            to="claude-3_7-sonnet",
            reason="primary provider unavailable"
        )
    )

    encoded = encode_sse_event(encoded_event)

    assert encoded.startswith(f"id: {build_sse_event_id(encoded_event.task_id, 1)}\n")
    assert "\nevent: provider_switch\n" in encoded
    assert '"taskId":"video_20260330130500_ef56gh78"' in encoded
    assert '"requestId":"req_task_failed_001"' in encoded
    assert '"errorCode":"TASK_PROVIDER_UNAVAILABLE"' in encoded
    assert '"from":"gemini-2_5-flash"' in encoded
    assert '"task_id"' not in encoded
    assert '"error_code"' not in encoded


def test_sse_broker_assigns_sequential_identity_and_supports_replay_after_event_id() -> None:
    broker = InMemorySseBroker()
    task_id = "video_20260330130500_ab12cd34"

    connected = broker.publish(
        TaskProgressEvent(
            event="connected",
            task_id=task_id,
            task_type="video",
            status="pending",
            progress=0,
            message="SSE 通道已建立",
            request_id="req_task_sse_001",
            error_code=None
        )
    )
    progress = broker.publish(
        TaskProgressEvent(
            event="progress",
            task_id=task_id,
            task_type="video",
            status="processing",
            progress=32,
            message="任务处理中",
            request_id="req_task_sse_001",
            error_code=None
        )
    )
    snapshot = broker.publish(
        TaskProgressEvent(
            event="snapshot",
            task_id=task_id,
            task_type="video",
            status="processing",
            progress=32,
            message="已恢复到最近可用快照",
            request_id="req_task_sse_001",
            error_code=None,
            resume_from=progress.id
        )
    )

    assert connected.sequence == 1
    assert progress.sequence == 2
    assert snapshot.sequence == 3
    assert connected.id == build_sse_event_id(task_id, 1)
    assert parse_sse_event_id(snapshot.id or "") == (task_id, 3)
    assert [event.sequence for event in broker.replay(task_id)] == [1, 2, 3]
    assert [event.sequence for event in broker.replay(task_id, after_event_id=connected.id)] == [2, 3]


def test_task_contract_assets_can_be_consumed_by_backend_models() -> None:
    completed_payload = _load_json("mocks/tasks/sse.completed.json")
    cancelled_payload = _load_json("mocks/tasks/sse.cancelled.json")
    failed_payload = _load_json("mocks/tasks/sse.failed.json")
    provider_switch_payload = _load_json("mocks/tasks/sse.provider-switch.json")
    provider_switch_runtime_payload = _load_json("mocks/tasks/provider-switch.json")
    provider_health_cache_payload = _load_json("mocks/tasks/provider-health-cache.json")
    snapshot_payload = _load_json("mocks/tasks/sse.snapshot.json")
    polling_snapshot_payload = _load_json("mocks/tasks/task-status.polling.json")
    cancelled_sequence_payload = _load_json("mocks/tasks/sse.sequence.cancelled.json")
    failed_sequence_payload = _load_json("mocks/tasks/sse.sequence.failed.json")
    runtime_progress_payload = _load_json("mocks/tasks/task-events.progress.json")
    event_schema = _load_json("contracts/tasks/sse-event.schema.json")
    task_progress_schema = _load_json("contracts/tasks/task-progress-event.schema.json")

    for payload in (
        completed_payload,
        cancelled_payload,
        failed_payload,
        provider_switch_payload,
        snapshot_payload
    ):
        model = TaskProgressEvent.model_validate(payload)
        assert model.id
        assert model.sequence
        assert model.timestamp.endswith("Z")

    for index, payload in enumerate(failed_sequence_payload, start=1):
        model = TaskProgressEvent.model_validate(payload)
        assert model.sequence == index

    for index, payload in enumerate(cancelled_sequence_payload, start=1):
        model = TaskProgressEvent.model_validate(payload)
        assert model.sequence == index
        assert model.event in {"connected", "progress", "cancelled"}

    for index, payload in enumerate(runtime_progress_payload, start=1):
        model = TaskProgressEvent.model_validate(payload)
        assert model.event == "progress"
        assert model.sequence == index

    cancelled_model = TaskProgressEvent.model_validate(cancelled_payload)
    provider_switch_model = TaskProgressEvent.model_validate(provider_switch_payload)
    runtime_provider_switch_model = TaskProgressEvent.model_validate(provider_switch_runtime_payload)
    snapshot_model = TaskProgressEvent.model_validate(snapshot_payload)

    assert cancelled_model.event == "cancelled"
    assert cancelled_model.error_code == TaskErrorCode.CANCELLED
    assert provider_switch_model.event == "provider_switch"
    assert provider_switch_model.from_ == "gemini-2_5-flash"
    assert provider_switch_model.to == "claude-3_7-sonnet"
    assert runtime_provider_switch_model.from_ == "demo-chat"
    assert runtime_provider_switch_model.to == "backup-chat"
    assert snapshot_model.resume_from == "task_mock_snapshot:evt:000002"
    assert polling_snapshot_payload["lastEventId"] == "task_mock_snapshot:evt:000003"
    assert polling_snapshot_payload["resumeFrom"] == "task_mock_snapshot:evt:000002"
    assert provider_health_cache_payload["provider"] == "demo-chat"
    assert provider_health_cache_payload["isHealthy"] is False

    assert event_schema["required"] == [
        "id",
        "sequence",
        "event",
        "taskId",
        "taskType",
        "status",
        "progress",
        "message",
        "timestamp",
        "requestId",
        "errorCode"
    ]
    assert event_schema["properties"]["event"]["enum"] == [
        "connected",
        "progress",
        "provider_switch",
        "completed",
        "failed",
        "cancelled",
        "heartbeat",
        "snapshot"
    ]
    assert task_progress_schema["properties"]["event"]["enum"] == event_schema["properties"]["event"]["enum"]
