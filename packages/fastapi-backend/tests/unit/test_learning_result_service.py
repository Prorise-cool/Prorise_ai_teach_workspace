import asyncio
from datetime import datetime, timezone

from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningResultInput,
    LearningResultStatus,
    LearningResultType,
    LearningSourceType
)
from app.features.learning.service import LearningService


def test_learning_service_catalog_includes_all_long_term_result_types() -> None:
    service = LearningService()

    assert service.table_catalog() == {
        "checkpoint": "xm_learning_record",
        "quiz": "xm_quiz_result",
        "wrongbook": "xm_learning_wrongbook",
        "recommendation": "xm_learning_recommendation",
        "path": "xm_learning_path"
    }


def test_learning_service_preserves_path_version_and_traceability_timestamp() -> None:
    service = LearningService()
    updated_at = datetime(2026, 3, 28, 18, 30, tzinfo=timezone.utc)
    request = LearningPersistenceRequest(
        user_id="student-001",
        records=[
            LearningResultInput(
                result_type=LearningResultType.PATH,
                source_type=LearningSourceType.LEARNING,
                source_session_id="session-001",
                source_task_id="task-001",
                source_result_id="result-001",
                occurred_at=updated_at,
                updated_at=updated_at,
                analysis_summary="路径版本 2 需要保留",
                status=LearningResultStatus.COMPLETED,
                detail_ref="path-001",
                version_no=2
            )
        ]
    )

    payload = asyncio.run(service.prepare_persistence_preview(request))

    record = payload.records[0]
    assert record.table_name == "xm_learning_path"
    assert record.version_no == 2
    assert record.updated_at == updated_at
    assert record.occurred_at == updated_at
    assert record.detail_ref == "path-001"
