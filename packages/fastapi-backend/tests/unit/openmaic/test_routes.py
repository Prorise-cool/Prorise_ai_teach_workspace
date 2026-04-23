"""Basic route shape tests for OpenMAIC endpoints."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import AccessContext, get_access_context
from app.main import create_app

MOCK_ACCESS_CONTEXT = AccessContext(
    user_id="test_user",
    username="test",
    roles=("admin",),
    permissions=("*:*:*",),
    token="test-token",
    client_id="test-client",
    request_id="test-req",
    online_ttl_seconds=86400,
)


def _make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_access_context] = lambda: MOCK_ACCESS_CONTEXT
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client():
    return _make_client()


def test_bootstrap_returns_200(client):
    response = client.get("/api/v1/openmaic/bootstrap")
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    payload = envelope["data"]
    assert payload["feature"] == "openmaic"
    assert payload["status"] == "ready"


def test_create_classroom_returns_job_id(client):
    with patch(
        "app.features.openmaic.service.OpenMAICService.create_classroom_job",
        new_callable=AsyncMock,
        return_value="classroom_test123",
    ):
        response = client.post(
            "/api/v1/openmaic/classroom",
            json={"requirement": "教我Python基础"},
        )
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    payload = envelope["data"]
    assert payload["jobId"] == "classroom_test123"
    assert "pollUrl" in payload


def test_get_classroom_status_returns_pending(client):
    with patch(
        "app.features.openmaic.service.OpenMAICService.get_job_status",
        return_value={"status": "pending", "progress": 0, "classroom": None, "error": None},
    ):
        response = client.get("/api/v1/openmaic/classroom/test_job_001")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert "jobId" in data


def test_quiz_grade_returns_score(client):
    with patch(
        "app.features.openmaic.service.OpenMAICService.grade_quiz_answer",
        new_callable=AsyncMock,
        return_value={"score": 8.0, "comment": "回答基本正确"},
    ):
        response = client.post(
            "/api/v1/openmaic/quiz-grade",
            json={
                "question": "Python中如何定义函数？",
                "userAnswer": "使用def关键字",
                "points": 10.0,
                "language": "zh-CN",
            },
        )
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    assert envelope["data"]["score"] == 8.0


def test_parse_pdf_rejects_non_pdf(client):
    response = client.post(
        "/api/v1/openmaic/parse-pdf",
        files={"file": ("document.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 400


def test_parse_pdf_accepts_pdf(client):
    # Minimal valid PDF bytes
    minimal_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 >>\n%%EOF"
    response = client.post(
        "/api/v1/openmaic/parse-pdf",
        files={"file": ("test.pdf", minimal_pdf, "application/pdf")},
    )
    # PDF parse may return 0 pages for minimal PDF but should not error
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    payload = envelope["data"]
    assert "text" in payload
    assert "pageCount" in payload


def test_generate_agent_profiles_returns_agents(client):
    with patch(
        "app.features.openmaic.service.OpenMAICService.generate_agent_profiles_for",
        new_callable=AsyncMock,
        return_value=[
            {"id": "agent_1", "name": "张老师", "role": "teacher", "persona": "热情的教师"},
        ],
    ):
        response = client.post(
            "/api/v1/openmaic/generate/agent-profiles",
            json={
                "stageName": "Python基础课程",
                "languageDirective": "请用中文教学",
                "availableAvatars": ["teacher_1", "student_1"],
                "sceneOutlines": [],
            },
        )
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    assert len(envelope["data"]["agents"]) >= 1
