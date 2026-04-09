from __future__ import annotations

import base64
import json
from collections.abc import Iterator
from contextlib import contextmanager

import httpx
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.features.auth.routes import get_auth_proxy_service
from app.features.auth.service import AuthProxyService
from app.infra.redis_client import RuntimeStore
from app.main import create_app


def _build_jwt_like_token(payload: dict[str, object]) -> str:
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload).encode("utf-8")
    ).decode("utf-8").rstrip("=")
    return f"header.{encoded_payload}.signature"


def _build_test_settings() -> Settings:
    return Settings(
        _env_file=(),
        ruoyi_base_url="http://ruoyi.local",
        ruoyi_timeout_seconds=0.01,
        ruoyi_retry_attempts=0,
        ruoyi_retry_delay_seconds=0.0,
        ruoyi_encrypt_enabled=False,
    )


@contextmanager
def auth_api_client(handler) -> Iterator[tuple[TestClient, RuntimeStore]]:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://test",
    )
    app = create_app()
    app.dependency_overrides[get_auth_proxy_service] = lambda: AuthProxyService(
        settings=_build_test_settings(),
        transport=httpx.MockTransport(handler),
    )
    try:
        with TestClient(app) as client:
            client.app.state.runtime_store = runtime_store
            yield client, runtime_store
    finally:
        app.dependency_overrides.clear()


def test_auth_login_accepts_plain_json_and_persists_online_token() -> None:
    token = _build_jwt_like_token({"tenantId": "000000", "clientid": "client-id-001"})

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/auth/login"
        assert json.loads(request.content.decode("utf-8")) == {
            "username": "admin",
            "password": "admin123",
            "tenantId": "000000",
            "clientId": "client-id-001",
            "grantType": "password",
        }
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "登录成功",
                "data": {
                    "access_token": token,
                    "refresh_token": None,
                    "expire_in": 600,
                    "refresh_expire_in": None,
                    "client_id": "client-id-001",
                    "openid": None,
                    "scope": None,
                },
            },
        )

    with auth_api_client(handler) as (client, runtime_store):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "tenantId": "000000",
                "clientId": "client-id-001",
                "grantType": "password",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["code"] == 200
        assert payload["data"]["access_token"] == token
        assert runtime_store.get_online_token_record(token, tenant_id="000000") == {
            "tokenId": token,
            "userName": "admin",
            "clientKey": "client-id-001",
        }


def test_auth_me_proxies_current_user_payload() -> None:
    token = _build_jwt_like_token({"clientid": "client-id-001"})

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/system/user/getInfo"
        assert request.headers["authorization"] == f"Bearer {token}"
        assert request.headers["clientid"] == "client-id-001"
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "获取成功",
                "data": {
                    "user": {
                        "userId": 1,
                        "userName": "admin",
                        "nickName": "平台管理员",
                        "avatar": None,
                        "roles": [],
                    },
                    "roles": ["admin"],
                    "permissions": ["*:*:*"],
                },
            },
        )

    with auth_api_client(handler) as (client, _):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 200
    assert payload["data"]["user"]["userName"] == "admin"
    assert payload["data"]["roles"] == ["admin"]


def test_auth_logout_deletes_fastapi_online_token() -> None:
    token = _build_jwt_like_token({"tenantId": "000000"})

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/auth/logout"
        assert request.headers["authorization"] == f"Bearer {token}"
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "退出成功",
                "data": None,
            },
        )

    with auth_api_client(handler) as (client, runtime_store):
        runtime_store.set_online_token_record(
            token,
            {"tokenId": token, "userName": "admin"},
            tenant_id="000000",
            ttl_seconds=600,
        )
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["msg"] == "退出成功"
        assert runtime_store.get_online_token_record(token, tenant_id="000000") is None
