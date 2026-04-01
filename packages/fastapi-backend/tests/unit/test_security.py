import asyncio

import pytest

from app.core.errors import AppError
from app.core.security import AccessContext, get_access_context, require_permissions
from app.shared.ruoyi_auth import RuoYiAccessProfile


def test_get_access_context_rejects_missing_authorization_header() -> None:
    with pytest.raises(AppError) as exc_info:
        asyncio.run(get_access_context(request=_build_request(), authorization=None))

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "AUTH_UNAUTHORIZED"


def test_get_access_context_loads_profile_from_ruoyi(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_load_access_profile(access_token: str) -> RuoYiAccessProfile:
        assert access_token == "valid-token"
        return RuoYiAccessProfile(
            user_id="student_001",
            username="student_demo",
            nickname="小麦同学",
            avatar_url="https://cdn.example/avatar.png",
            roles=("student",),
            permissions=("video:task:add",),
            raw={}
        )

    monkeypatch.setattr(
        "app.core.security.ruoyi_auth.load_access_profile",
        fake_load_access_profile
    )

    access_context = asyncio.run(
        get_access_context(
            request=_build_request(request_id="req_security_001"),
            authorization="Bearer valid-token"
        )
    )

    assert access_context == AccessContext(
        user_id="student_001",
        request_id="req_security_001",
        access_token="valid-token",
        username="student_demo",
        nickname="小麦同学",
        avatar_url="https://cdn.example/avatar.png",
        roles=("student",),
        permissions=("video:task:add",)
    )


def test_require_permissions_returns_403_when_permission_missing() -> None:
    dependency = require_permissions("video:task:add")

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            dependency(
                access_context=AccessContext(
                    user_id="student_002",
                    request_id="req_security_002",
                    permissions=("video:task:list",)
                )
            )
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTH_FORBIDDEN"
    assert exc_info.value.details["missing_permissions"] == ["video:task:add"]


def _build_request(request_id: str = "req_security_header"):
    from fastapi import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/video/tasks",
        "headers": [(b"x-request-id", request_id.encode("utf-8"))]
    }
    request = Request(scope)
    request.state.request_id = request_id
    return request
