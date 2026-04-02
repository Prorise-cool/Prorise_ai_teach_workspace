import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.features.learning.service import LearningService
from app.main import create_app
import app.features.learning.routes as learning_routes
from app.shared.ruoyi_client import RuoYiClient


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


def _create_client(monkeypatch: pytest.MonkeyPatch, handler) -> TestClient:
    monkeypatch.setattr(learning_routes, "service", LearningService(client_factory=_build_client_factory(handler)))
    return TestClient(create_app())


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method != "POST" or request.url.path != "/internal/xiaomai/learning/results":
            raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")
        payload = json.loads(request.content.decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "userId": payload["userId"],
                    "records": payload["records"],
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

    return _create_client(monkeypatch, handler)


def test_learning_persistence_route_syncs_to_ruoyi(client: TestClient) -> None:
    response = client.post(
        "/api/v1/learning/persistence",
        json={
            "user_id": "student-301",
            "records": [
                {
                    "result_type": "path",
                    "source_type": "learning",
                    "source_session_id": "session-301",
                    "source_task_id": "task-301",
                    "source_result_id": "path-result-301",
                    "occurred_at": "2026-03-28T18:30:00Z",
                    "updated_at": "2026-03-28T18:35:00Z",
                    "analysis_summary": "路径版本 3 已落表",
                    "status": "completed",
                    "detail_ref": "path-detail-301",
                    "version_no": 3,
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_id"] == "student-301"
    assert payload["records"][0]["table_name"] == "xm_learning_path"
    assert payload["records"][0]["version_no"] == 3
    assert payload["traceability_rule"] == "version-or-updated-at"


@pytest.mark.parametrize(
    ("upstream_data", "expected_reason"),
    [
        ([], "data is not an object"),
        ({"userId": "student-error", "records": "oops"}, "records is not a list"),
        ({"userId": "student-error", "records": ["oops"]}, "records[0] is not an object"),
    ]
)
def test_learning_persistence_route_returns_invalid_response_envelope_for_malformed_success_payload(
    monkeypatch: pytest.MonkeyPatch,
    upstream_data: object,
    expected_reason: str
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method != "POST" or request.url.path != "/internal/xiaomai/learning/results":
            raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")
        return httpx.Response(200, json={"code": 200, "msg": "ok", "data": upstream_data})

    with _create_client(monkeypatch, handler) as client:
        response = client.post(
            "/api/v1/learning/persistence",
            headers={"X-Request-ID": "req_learning_invalid_payload"},
            json={
                "user_id": "student-error",
                "records": [
                    {
                        "result_type": "quiz",
                        "source_type": "video",
                        "source_session_id": "session-error",
                        "source_task_id": "task-error",
                        "analysis_summary": "错误路径",
                        "status": "completed",
                    }
                ],
            },
        )

    payload = response.json()
    assert response.status_code == 502
    assert payload["data"]["error_code"] == "RUOYI_INVALID_RESPONSE"
    assert payload["data"]["details"]["reason"] == expected_reason
    assert payload["data"]["details"]["resource"] == "learning-result"
