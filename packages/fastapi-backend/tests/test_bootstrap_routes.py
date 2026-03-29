from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_feature_bootstrap_routes_are_available() -> None:
    paths = [
        "/api/v1/video/bootstrap",
        "/api/v1/classroom/bootstrap",
        "/api/v1/companion/bootstrap",
        "/api/v1/knowledge/bootstrap",
        "/api/v1/learning/bootstrap"
    ]

    for path in paths:
        response = client.get(path)

        assert response.status_code == 200
        assert response.json()["code"] == 200
        assert response.json()["data"]["status"] == "scaffolded"
