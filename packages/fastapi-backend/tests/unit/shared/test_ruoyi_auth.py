from __future__ import annotations

from app.core.security import AccessContext
from app.shared.ruoyi_auth import RuoYiRequestAuth


def test_ruoyi_request_auth_from_access_context_copies_token_and_client_id() -> None:
    access_context = AccessContext(
        user_id="user-001",
        username="student-demo",
        roles=("student",),
        permissions=("video:task:add",),
        token="user-access-token",
        client_id="client-id-001",
        request_id="req-001",
        online_ttl_seconds=600,
    )

    auth = RuoYiRequestAuth.from_access_context(access_context)

    assert auth.access_token == "user-access-token"
    assert auth.client_id == "client-id-001"
