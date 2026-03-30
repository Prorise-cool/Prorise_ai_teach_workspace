import json
from pathlib import Path

from app.core.sse import TaskProgressEvent, encode_sse_event
from app.schemas.common import TaskSnapshotPayload, build_success_envelope
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    is_retryable_error,
    map_internal_status
)


PROJECT_ROOT = Path(__file__).resolve().parents[4]


def _load_json(relative_path: str) -> dict[str, object]:
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
        error_code=None
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
        "errorCode": None
    }

    encoded = encode_sse_event(
        TaskProgressEvent(
            event="failed",
            task_id="video_20260330130500_ef56gh78",
            task_type="video",
            status="failed",
            progress=87,
            message="任务执行失败",
            timestamp="2026-03-30T13:05:12Z",
            request_id="req_task_failed_001",
            error_code=TaskErrorCode.PROVIDER_TIMEOUT
        )
    )

    assert "taskId" in encoded
    assert "taskType" in encoded
    assert "requestId" in encoded
    assert "errorCode" in encoded
    assert "task_id" not in encoded
    assert "error_code" not in encoded


def test_task_contract_assets_can_be_consumed_by_backend_models() -> None:
    success_payload = _load_json("mocks/tasks/task-lifecycle.success.json")
    failed_payload = _load_json("mocks/tasks/task-lifecycle.failed.json")
    cancelled_payload = _load_json("mocks/tasks/task-lifecycle.cancelled.json")
    snapshot_payload = _load_json("mocks/tasks/task-lifecycle.snapshot.json")
    provider_switch_payload = _load_json("mocks/tasks/task-lifecycle.provider-switch.json")
    event_schema = _load_json("contracts/tasks/task-progress-event.schema.json")
    result_schema = _load_json("contracts/tasks/task-result.schema.json")

    for payload in (
        success_payload,
        failed_payload,
        cancelled_payload,
        snapshot_payload
    ):
        model = TaskSnapshotPayload.model_validate(payload)
        assert model.task_id
        assert model.timestamp.endswith("Z")

    event_model = TaskProgressEvent.model_validate(provider_switch_payload)
    assert event_model.event == "provider_switch"
    assert event_model.error_code == TaskErrorCode.PROVIDER_UNAVAILABLE
    assert event_model.context["providerSwitch"]["to"] == "azure-tts"

    assert result_schema["required"] == [
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
        "heartbeat",
        "completed",
        "failed",
        "snapshot"
    ]
