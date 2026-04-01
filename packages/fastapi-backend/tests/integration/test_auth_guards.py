import httpx
from fastapi.testclient import TestClient

import app.features.video.routes as video_routes
import app.shared.ruoyi_auth as ruoyi_auth
from app.features.video.service import VideoService
from app.main import create_app
from app.shared.ruoyi_client import RuoYiClient


def _build_client_factory(handler):
    def factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0
        )

    return factory


def _build_auth_client_factory(handler):
    client_factory = _build_client_factory(handler)

    def factory(_access_token: str) -> RuoYiClient:
        return client_factory()

    return factory


def test_protected_video_routes_return_401_without_token() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/video/tasks")

    assert response.status_code == 401
    assert response.json()["data"]["error_code"] == "AUTH_UNAUTHORIZED"


def test_protected_video_routes_return_403_when_permission_missing(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/system/user/getInfo":
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "msg": "ok",
                    "data": {
                        "user": {
                            "userId": "student_001",
                            "userName": "student_demo",
                            "nickName": "小麦同学",
                            "roles": [{"roleKey": "student", "roleName": "学生"}]
                        },
                        "roles": ["student"],
                        "permissions": ["video:task:add"]
                    }
                }
            )
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    client_factory = _build_client_factory(handler)
    monkeypatch.setattr(video_routes, "service", VideoService(client_factory=client_factory))
    monkeypatch.setattr(ruoyi_auth, "create_ruoyi_client", _build_auth_client_factory(handler))
    client = TestClient(create_app())
    client.headers.update({"Authorization": "Bearer valid-token"})

    response = client.get("/api/v1/video/tasks")

    assert response.status_code == 403
    assert response.json()["data"]["error_code"] == "AUTH_FORBIDDEN"


def test_protected_video_routes_allow_valid_token_and_permissions(monkeypatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/system/user/getInfo":
            return httpx.Response(
                200,
                json={
                    "code": 200,
                    "msg": "ok",
                    "data": {
                        "user": {
                            "userId": "student_001",
                            "userName": "student_demo",
                            "nickName": "小麦同学",
                            "roles": [{"roleKey": "student", "roleName": "学生"}]
                        },
                        "roles": ["student"],
                        "permissions": ["video:task:list", "video:task:query", "video:task:add"]
                    }
                }
            )
        if request.url.path == "/video/task/list":
            return httpx.Response(
                200,
                json={"code": 200, "msg": "ok", "rows": [], "total": 0}
            )
        raise AssertionError(f"unexpected upstream request: {request.method} {request.url}")

    client_factory = _build_client_factory(handler)
    monkeypatch.setattr(video_routes, "service", VideoService(client_factory=client_factory))
    monkeypatch.setattr(ruoyi_auth, "create_ruoyi_client", _build_auth_client_factory(handler))
    client = TestClient(create_app())
    client.headers.update({"Authorization": "Bearer valid-token"})

    response = client.get("/api/v1/video/tasks")

    assert response.status_code == 200
    assert response.json()["total"] == 0
