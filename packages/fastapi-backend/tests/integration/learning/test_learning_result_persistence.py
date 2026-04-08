import json
from datetime import datetime, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.features.learning.routes import get_learning_service
from app.features.learning.service import LearningService
from app.main import create_app
from app.shared.ruoyi_client import RuoYiClient
from tests.conftest import override_auth


def _build_client_factory(handler):
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return factory


@pytest.fixture
def client() -> tuple[TestClient, list[dict[str, object]], list[str]]:
    captured_payloads: list[dict[str, object]] = []
    captured_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_paths.append(request.url.path)
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        captured_payloads.append(payload)
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "userId": payload["userId"],
                    "records": [
                        {
                            **item,
                            "userId": payload["userId"],
                        }
                        for item in payload["records"]
                    ],
                    "tableSummary": {
                        "checkpoint": "xm_learning_record",
                        "quiz": "xm_quiz_result",
                        "wrongbook": "xm_learning_wrongbook",
                        "recommendation": "xm_learning_recommendation",
                        "path": "xm_learning_path",
                    },
                    "traceabilityRule": "version-or-updated-at",
                },
            },
        )

    app = create_app()
    override_auth(app)
    app.dependency_overrides[get_learning_service] = lambda: LearningService(client_factory=_build_client_factory(handler))
    return TestClient(app), captured_payloads, captured_paths


def test_learning_persistence_preview_covers_all_result_types() -> None:
    app = create_app()
    override_auth(app)
    client = TestClient(app)
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
                    "detail_ref": "checkpoint-detail-001",
                },
                {
                    "result_type": "quiz",
                    "source_type": "video",
                    "source_session_id": "session-002",
                    "source_task_id": "task-002",
                    "source_result_id": "quiz-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "question_total": 12,
                    "correct_total": 9,
                    "score": 88,
                    "analysis_summary": "quiz 摘要",
                    "status": "completed",
                    "detail_ref": "quiz-detail-001",
                },
                {
                    "result_type": "wrongbook",
                    "source_type": "quiz",
                    "source_session_id": "session-003",
                    "source_task_id": "task-003",
                    "source_result_id": "wrongbook-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "question_text": "错题题干",
                    "wrong_answer_text": "错误选项 B",
                    "reference_answer_text": "正确选项 C",
                    "analysis_summary": "错题本摘要",
                    "status": "completed",
                    "detail_ref": "wrongbook-detail-001",
                },
                {
                    "result_type": "recommendation",
                    "source_type": "learning",
                    "source_session_id": "session-004",
                    "source_task_id": "task-004",
                    "source_result_id": "recommendation-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "target_type": "knowledge_point",
                    "target_ref_id": "kp-004",
                    "analysis_summary": "推荐摘要",
                    "status": "completed",
                    "detail_ref": "recommendation-detail-001",
                },
                {
                    "result_type": "path",
                    "source_type": "learning",
                    "source_session_id": "session-005",
                    "source_task_id": "task-005",
                    "source_result_id": "path-result-001",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "path_title": "提分路径",
                    "step_count": 5,
                    "analysis_summary": "路径摘要",
                    "status": "completed",
                    "detail_ref": "path-detail-001",
                    "version_no": 3,
                },
            ],
        },
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["table_summary"] == {
        "checkpoint": "xm_learning_record",
        "quiz": "xm_quiz_result",
        "wrongbook": "xm_learning_wrongbook",
        "recommendation": "xm_learning_recommendation",
        "path": "xm_learning_path",
    }
    assert [record["result_type"] for record in payload["records"]] == [
        "checkpoint",
        "quiz",
        "wrongbook",
        "recommendation",
        "path",
    ]

    path_record = payload["records"][-1]
    assert path_record["table_name"] == "xm_learning_path"
    assert path_record["version_no"] == 3
    assert path_record["updated_at"] == updated_at.isoformat().replace("+00:00", "Z")
    assert path_record["detail_ref"] == "path-detail-001"
    assert path_record["path_title"] == "提分路径"
    assert path_record["step_count"] == 5
    assert payload["records"][1]["question_total"] == 12
    assert payload["records"][1]["correct_total"] == 9
    assert payload["records"][2]["question_text"] == "错题题干"
    assert payload["records"][2]["wrong_answer_text"] == "错误选项 B"
    assert payload["records"][2]["reference_answer_text"] == "正确选项 C"
    assert payload["records"][3]["target_type"] == "knowledge_point"
    assert payload["records"][3]["target_ref_id"] == "kp-004"


def test_learning_persistence_route_writes_ruoyi_batch_payload(
    client: tuple[TestClient, list[dict[str, object]], list[str]]
) -> None:
    test_client, captured_payloads, captured_paths = client
    occurred_at = datetime(2026, 3, 30, 9, 0, tzinfo=timezone.utc)
    updated_at = datetime(2026, 3, 30, 9, 5, tzinfo=timezone.utc)

    response = test_client.post(
        "/api/v1/learning/persistence",
        json={
            "user_id": "student-202",
            "records": [
                {
                    "result_type": "quiz",
                    "source_type": "video",
                    "source_session_id": "session-202",
                    "source_task_id": "task-202",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "question_total": 20,
                    "correct_total": 16,
                    "analysis_summary": "quiz 持久化摘要",
                    "status": "completed",
                },
                {
                    "result_type": "path",
                    "source_type": "learning",
                    "source_session_id": "session-203",
                    "source_task_id": "task-203",
                    "occurred_at": occurred_at.isoformat(),
                    "updated_at": updated_at.isoformat(),
                    "path_title": "阶段性路径",
                    "step_count": 4,
                    "analysis_summary": "path 持久化摘要",
                    "status": "completed",
                    "version_no": 2,
                }
            ],
        },
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["records"][0]["source_result_id"] == "task-202"
    assert payload["records"][0]["question_total"] == 20
    assert payload["records"][0]["correct_total"] == 16
    assert payload["records"][1]["path_title"] == "阶段性路径"
    assert payload["records"][1]["step_count"] == 4
    assert payload["records"][1]["version_no"] == 2
    assert captured_paths == ["/internal/xiaomai/learning/results"]
    assert captured_payloads[0]["userId"] == "student-202"
    assert captured_payloads[0]["records"][0]["tableName"] == "xm_quiz_result"
    assert captured_payloads[0]["records"][0]["sourceResultId"] == "task-202"
    assert captured_payloads[0]["records"][0]["questionTotal"] == 20
    assert captured_payloads[0]["records"][0]["correctTotal"] == 16
    assert captured_payloads[0]["records"][1]["pathTitle"] == "阶段性路径"
    assert captured_payloads[0]["records"][1]["stepCount"] == 4
