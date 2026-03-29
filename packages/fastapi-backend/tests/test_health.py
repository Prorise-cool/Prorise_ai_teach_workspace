from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_health_endpoint_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_endpoint_exposes_bootstrap_status() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "bootstrapped"
