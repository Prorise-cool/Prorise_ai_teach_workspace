import asyncio
from types import SimpleNamespace

import httpx

from app.core.security import AccessContext
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin


class _DummyService(RuoYiServiceMixin):
    _RESOURCE = "dummy-resource"

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings


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
            ruoyi_access_token="service-token",
            ruoyi_client_id="service-client-id",
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
