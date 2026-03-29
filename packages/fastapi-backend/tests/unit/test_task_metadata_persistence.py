from datetime import datetime

from app.features.classroom.schemas import ClassroomTaskMetadataCreateRequest
from app.features.classroom.service import ClassroomService
from app.features.video.schemas import VideoTaskMetadataCreateRequest
from app.features.video.task_metadata import (
    TaskMetadataCreateRequest,
    TaskMetadataRepository,
    TaskType,
    shared_task_metadata_repository,
)
from app.shared.task_framework.status import TaskStatus


def _reset_repository() -> None:
    shared_task_metadata_repository.clear()


def test_repository_upserts_lifecycle_and_preserves_long_term_fields() -> None:
    _reset_repository()
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
    assert processing_snapshot.to_ruoyi_payload()["task_state"] == "processing"
    assert processing_snapshot.to_ruoyi_payload()["create_time"] == "2026-03-29 10:30:00"

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
    assert failed_snapshot.to_ruoyi_payload()["fail_time"] == "2026-03-29 10:35:00"


def test_repository_replay_session_keeps_video_and_classroom_records_visible() -> None:
    _reset_repository()
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


def test_classroom_service_defaults_to_classroom_table_and_shared_repo() -> None:
    _reset_repository()
    service = ClassroomService()

    response = service.persist_task(
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

    assert response.table_name == "xm_classroom_session"
    assert response.task.task_type == TaskType.CLASSROOM.value
    assert shared_task_metadata_repository.get_task("classroom_002") is not None
