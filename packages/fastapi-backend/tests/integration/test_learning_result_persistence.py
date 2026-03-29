from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_learning_persistence_preview_covers_all_result_types() -> None:
    occurred_at = datetime(2026, 3, 28, 10, 20, tzinfo=timezone.utc)
    updated_at = datetime(2026, 3, 28, 10, 25, tzinfo=timezone.utc)

    response = client.post(
        "/api/v1/learning/persistence-preview",
        json={
            "user_id": "student-001",
            "records": [
                {
                    "result_type": "checkpoint",
                    "source_type": "classroom",
                    "source_session_id": "session-001",
                    "source_task_id": "task-001",
                    "source_result_id": "checkpoint-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "score": 90,
                    "analysis_summary": "checkpoint 摘要",
                    "status": "completed",
                    "detail_ref": "checkpoint-detail-001"
                },
                {
                    "result_type": "quiz",
                    "source_type": "video",
                    "source_session_id": "session-002",
                    "source_task_id": "task-002",
                    "source_result_id": "quiz-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "score": 88,
                    "analysis_summary": "quiz 摘要",
                    "status": "completed",
                    "detail_ref": "quiz-detail-001"
                },
                {
                    "result_type": "wrongbook",
                    "source_type": "quiz",
                    "source_session_id": "session-003",
                    "source_task_id": "task-003",
                    "source_result_id": "wrongbook-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "analysis_summary": "错题本摘要",
                    "status": "completed",
                    "detail_ref": "wrongbook-detail-001"
                },
                {
                    "result_type": "recommendation",
                    "source_type": "learning",
                    "source_session_id": "session-004",
                    "source_task_id": "task-004",
                    "source_result_id": "recommendation-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "analysis_summary": "推荐摘要",
                    "status": "completed",
                    "detail_ref": "recommendation-detail-001"
                },
                {
                    "result_type": "path",
                    "source_type": "learning",
                    "source_session_id": "session-005",
                    "source_task_id": "task-005",
                    "source_result_id": "path-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "analysis_summary": "路径摘要",
                    "status": "completed",
                    "detail_ref": "path-detail-001",
                    "version_no": 3
                }
            ]
        }
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["table_summary"] == {
        "checkpoint": "xm_learning_record",
        "quiz": "xm_quiz_result",
        "wrongbook": "xm_learning_wrongbook",
        "recommendation": "xm_learning_recommendation",
        "path": "xm_learning_path"
    }
    assert [record["result_type"] for record in payload["records"]] == [
        "checkpoint",
        "quiz",
        "wrongbook",
        "recommendation",
        "path"
    ]

    path_record = payload["records"][-1]
    assert path_record["table_name"] == "xm_learning_path"
    assert path_record["version_no"] == 3
    assert path_record["updated_at"] == updated_at.isoformat().replace("+00:00", "Z")
    assert path_record["detail_ref"] == "path-detail-001"
