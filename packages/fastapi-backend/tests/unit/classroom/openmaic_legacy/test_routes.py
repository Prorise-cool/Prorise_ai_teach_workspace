"""Wave 1 后端路由 smoke 测试。

合并自原 ``tests/unit/openmaic/test_routes.py``，仅保留与新 API 仍然
对齐的端点（bootstrap + parse-pdf）。``classroom_create`` /
``get_classroom_status`` / ``quiz-grade`` 等用例随 Wave 1 接口重写
被移除：classroom_create 流程已切换为 RuntimeStore 直写 + Dramatiq actor，
不再调用 ``OpenMAICService.create_classroom_job``；quiz-grade 端点删除（Task 8）。
新流程的端到端测试留待 Wave 1.5 引入 ``DummyDramatiqBroker`` 后补齐。
"""
from __future__ import annotations

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
    response = client.get("/api/v1/classroom/bootstrap")
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    payload = envelope["data"]
    assert payload["feature"] == "classroom"
    assert payload["status"] == "scaffolded"


def test_parse_pdf_rejects_non_pdf(client):
    response = client.post(
        "/api/v1/classroom/parse-pdf",
        files={"file": ("document.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 400


def test_parse_pdf_accepts_pdf(client):
    minimal_pdf = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\n"
        b"trailer\n<< /Size 2 >>\n%%EOF"
    )
    response = client.post(
        "/api/v1/classroom/parse-pdf",
        files={"file": ("test.pdf", minimal_pdf, "application/pdf")},
    )
    assert response.status_code == 200
    envelope = response.json()
    assert envelope["code"] == 200
    payload = envelope["data"]
    assert "text" in payload
    assert "pageCount" in payload
