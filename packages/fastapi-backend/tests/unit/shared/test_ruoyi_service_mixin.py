import asyncio
from types import SimpleNamespace

import httpx
import pytest

from app.core.errors import AppError
from app.core.config import RuoYiServiceAuthMode
from app.core.security import AccessContext
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin


class _DummyService(RuoYiServiceMixin):
    _RESOURCE = "dummy-resource"

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_service_auth


def _build_access_context() -> AccessContext:
    return AccessContext(
        user_id="user-001",
        username="student-demo",
        roles=("student",),
        permissions=("video:task:add",),
        token="user-access-token",
        client_id="user-client-id",
        request_id="req-001",
        online_ttl_seconds=600,
    )


def test_resolve_factory_uses_access_context_when_service_keeps_default_factory(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "app.shared.ruoyi_client.get_settings",
        lambda: SimpleNamespace(
            ruoyi_base_url="http://ruoyi.local",
            ruoyi_timeout_seconds=0.01,
            ruoyi_retry_attempts=0,
            ruoyi_retry_delay_seconds=0.0,
        ),
    )
    service = _DummyService()

    factory = service._resolve_factory(_build_access_context())

    assert factory is not service._client_factory

    client = factory()
    try:
        assert client._client.headers.get("Authorization") == "Bearer user-access-token"
        assert client._client.headers.get("Clientid") == "user-client-id"
    finally:
        asyncio.run(client.aclose())


def test_resolve_factory_preserves_injected_factory_even_with_access_context() -> None:
    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(
                lambda _: httpx.Response(200, json={"code": 200, "msg": "ok", "data": {}})
            ),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    service = _DummyService(client_factory=client_factory)

    factory = service._resolve_factory(_build_access_context())

    assert factory is client_factory


def test_resolve_factory_prefers_explicit_request_auth_over_access_context(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "app.shared.ruoyi_client.get_settings",
        lambda: SimpleNamespace(
            ruoyi_base_url="http://ruoyi.local",
            ruoyi_timeout_seconds=0.01,
            ruoyi_retry_attempts=0,
            ruoyi_retry_delay_seconds=0.0,
        ),
    )
    service = _DummyService()

    factory = service._resolve_factory(
        _build_access_context(),
        request_auth=RuoYiRequestAuth(
            access_token="service-token",
            client_id="service-client-id",
        ),
    )

    client = factory()
    try:
        assert client._client.headers.get("Authorization") == "Bearer service-token"
        assert client._client.headers.get("Clientid") == "service-client-id"
    finally:
        asyncio.run(client.aclose())


def test_resolve_factory_preserves_injected_factory_even_with_request_auth() -> None:
    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(
                lambda _: httpx.Response(200, json={"code": 200, "msg": "ok", "data": {}})
            ),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    service = _DummyService(client_factory=client_factory)

    factory = service._resolve_factory(
        request_auth=RuoYiRequestAuth(
            access_token="service-token",
            client_id="service-client-id",
        )
    )

    assert factory is client_factory


def test_resolve_authenticated_factory_rejects_missing_request_auth_when_default_factory_is_used() -> None:
    service = _DummyService()

    with pytest.raises(AppError, match="缺少显式 RuoYi 请求鉴权") as exc_info:
        service._resolve_authenticated_factory()

    assert exc_info.value.code == "RUOYI_REQUEST_AUTH_REQUIRED"
    assert exc_info.value.details == {"resource": "dummy-resource"}


def test_resolve_factory_falls_back_to_service_auth_when_request_context_missing(
    monkeypatch,
    tmp_path,
) -> None:
    token_file = tmp_path / "ruoyi-service.token"
    token_file.write_text("service-token", encoding="utf-8")
    monkeypatch.setattr(
        "app.shared.ruoyi_client.get_settings",
        lambda: SimpleNamespace(
            ruoyi_base_url="http://ruoyi.local",
            ruoyi_timeout_seconds=0.01,
            ruoyi_retry_attempts=0,
            ruoyi_retry_delay_seconds=0.0,
        ),
    )
    monkeypatch.setattr(
        "app.shared.ruoyi_auth.get_settings",
        lambda: SimpleNamespace(
            ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
            ruoyi_service_client_id="service-client-id",
            resolve_ruoyi_service_token_file=lambda: token_file,
        ),
    )
    service = _DummyService()

    client = service._resolve_factory()()
    try:
        assert client._client.headers.get("Authorization") == "Bearer service-token"
        assert client._client.headers.get("Clientid") == "service-client-id"
    finally:
        asyncio.run(client.aclose())
