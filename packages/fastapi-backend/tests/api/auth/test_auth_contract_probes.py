import base64
import json
from collections.abc import Iterator
from contextlib import contextmanager

from fastapi.testclient import TestClient

from app.core.security import (
    RuoYiAccessProfile,
    extract_access_token_claims,
    get_security_runtime_store,
)
from app.infra.redis_client import RuntimeStore, build_online_token_key
from app.main import create_app


VALID_TOKEN = "valid-access-token"
LOGGED_OUT_TOKEN = "logged-out-token"


def build_jwt_like_token(payload: dict[str, object]) -> str:
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload).encode("utf-8")
    ).decode("utf-8").rstrip("=")
    return f"header.{encoded_payload}.signature"


@contextmanager
def auth_probe_client(
    monkeypatch,
    *,
    permissions: tuple[str, ...] = ("video:task:add", "classroom:session:add"),
    preload_tokens: tuple[str, ...] = (VALID_TOKEN,),
) -> Iterator[tuple[TestClient, RuntimeStore]]:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://test"
    )
    for token in preload_tokens:
        runtime_store.set_online_token_record(
            token,
            {
                "tokenId": token,
                "userName": "student_demo"
            },
            ttl_seconds=600
        )

    async def fake_load_ruoyi_access_profile(
        access_token: str,
        *,
        client_id: str | None = None
    ) -> RuoYiAccessProfile:
        return RuoYiAccessProfile(
            user_id="10001",
            username=f"user-{access_token}",
            roles=("student",),
            permissions=permissions,
        )

    app = create_app()
    app.dependency_overrides[get_security_runtime_store] = lambda: runtime_store
    monkeypatch.setattr(
        "app.core.security.load_ruoyi_access_profile",
        fake_load_ruoyi_access_profile,
    )

    try:
        with TestClient(app) as client:
            yield client, runtime_store
    finally:
        app.dependency_overrides.clear()


def test_session_probe_accepts_valid_online_token(monkeypatch) -> None:
    with auth_probe_client(monkeypatch) as (client, _):
        response = client.get(
            "/api/v1/contracts/session-probe",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 200
    assert payload["data"]["userId"] == "10001"
    assert payload["data"]["username"] == f"user-{VALID_TOKEN}"
    assert payload["data"]["roles"] == ["student"]
    assert payload["data"]["permissions"] == [
        "video:task:add",
        "classroom:session:add",
    ]
    assert payload["data"]["onlineTtlSeconds"] > 0


def test_session_probe_rejects_missing_online_token(monkeypatch) -> None:
    with auth_probe_client(monkeypatch, preload_tokens=()) as (client, _):
        response = client.get(
            "/api/v1/contracts/session-probe",
            headers={"Authorization": "Bearer expired-token"},
        )

    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] == 401
    assert payload["msg"] == "当前会话已失效，请重新登录"
    assert payload["data"]["error_code"] == "AUTH_SESSION_OFFLINE"


def test_session_probe_rejects_logged_out_online_token(monkeypatch) -> None:
    with auth_probe_client(
        monkeypatch,
        preload_tokens=(LOGGED_OUT_TOKEN,),
    ) as (client, runtime_store):
        runtime_store.delete_online_token_record(LOGGED_OUT_TOKEN)
        response = client.get(
            "/api/v1/contracts/session-probe",
            headers={"Authorization": f"Bearer {LOGGED_OUT_TOKEN}"},
        )

    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] == 401
    assert payload["data"]["error_code"] == "AUTH_SESSION_OFFLINE"


def test_permission_probe_returns_403_for_forbidden_session(monkeypatch) -> None:
    with auth_probe_client(monkeypatch, permissions=("video:task:add",)) as (client, _):
        response = client.get(
            "/api/v1/contracts/permission-probe?permission=demo:restricted:enter",
            headers={"Authorization": f"Bearer {VALID_TOKEN}"},
        )

    assert response.status_code == 403
    payload = response.json()
    assert payload["code"] == 403
    assert payload["msg"] == "当前账号缺少权限：demo:restricted:enter"
    assert payload["data"]["error_code"] == "AUTH_PERMISSION_DENIED"


def test_session_probe_accepts_tenant_prefixed_online_token(monkeypatch) -> None:
    tenant_scoped_token = build_jwt_like_token({"tenantId": "000000"})

    with auth_probe_client(monkeypatch, preload_tokens=()) as (client, runtime_store):
        runtime_store.set_online_token_record(
            tenant_scoped_token,
            {
                "tokenId": tenant_scoped_token,
                "userName": "tenant_admin"
            },
            tenant_id="000000",
            ttl_seconds=600
        )
        response = client.get(
            "/api/v1/contracts/session-probe",
            headers={"Authorization": f"Bearer {tenant_scoped_token}"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 200
    assert payload["data"]["username"] == f"user-{tenant_scoped_token}"


def test_runtime_store_normalizes_ruoyi_online_payload_shape() -> None:
    runtime_store = RuntimeStore(
        backend="memory-runtime-store",
        redis_url="redis://test"
    )
    token = build_jwt_like_token({"tenantId": "000000"})
    key = build_online_token_key(token, tenant_id="000000")

    runtime_store.storage[key] = [
        "org.dromara.common.core.domain.dto.UserOnlineDTO",
        {
            "tokenId": token,
            "userName": "admin"
        },
    ]
    runtime_store.expirations[key] = runtime_store._now() + 600

    assert runtime_store.get_online_token_record(token, tenant_id="000000") == {
        "tokenId": token,
        "userName": "admin",
    }


def test_extract_access_token_claims_reads_tenant_and_client_id() -> None:
    token = build_jwt_like_token(
        {
            "tenantId": "000000",
            "clientid": "demo-client-id",
        }
    )

    claims = extract_access_token_claims(token)

    assert claims.tenant_id == "000000"
    assert claims.client_id == "demo-client-id"
