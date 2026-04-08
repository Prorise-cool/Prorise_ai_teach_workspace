from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_feature_bootstrap_routes_are_available() -> None:
    paths = {
        "/api/v1/video/bootstrap": "video",
        "/api/v1/classroom/bootstrap": "classroom",
        "/api/v1/companion/bootstrap": "companion",
        "/api/v1/knowledge/bootstrap": "knowledge",
        "/api/v1/learning/bootstrap": "learning",
    }

    for path, feature in paths.items():
        response = client.get(path)

        assert response.status_code == 200
        assert response.json()["code"] == 200
        assert response.json()["msg"] == "查询成功"
        assert response.json()["data"]["feature"] == feature
        assert response.json()["data"]["status"] == "scaffolded"
