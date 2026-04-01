from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from fastapi import Depends, Header, Request

from app.core.errors import AppError
from app.core.logging import get_request_id
import app.shared.ruoyi_auth as ruoyi_auth


@dataclass(slots=True)
class AccessContext:
    user_id: str | None
    request_id: str | None
    access_token: str | None = None
    username: str | None = None
    nickname: str | None = None
    avatar_url: str | None = None
    roles: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()


def _resolve_request_id(request: Request) -> str | None:
    return (
        getattr(request.state, "request_id", None)
        or request.headers.get("x-request-id")
        or get_request_id()
    )


def _parse_bearer_token(authorization: str | None) -> str:
    if authorization is None:
        raise AppError(
            code="AUTH_UNAUTHORIZED",
            message="请先登录后再访问受保护资源",
            status_code=401
        )

    scheme, _, token = authorization.strip().partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AppError(
            code="AUTH_UNAUTHORIZED",
            message="请先登录后再访问受保护资源",
            status_code=401,
            details={"reason": "invalid_authorization_header"}
        )
    return token.strip()


def _missing_permissions(required_permissions: Sequence[str], granted_permissions: Sequence[str]) -> list[str]:
    granted_set = set(granted_permissions)
    return [permission for permission in required_permissions if permission not in granted_set]


async def get_access_context(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization")
) -> AccessContext:
    """基于 RuoYi 会话读取当前访问上下文。"""
    request_id = _resolve_request_id(request)
    access_token = _parse_bearer_token(authorization)

    try:
        profile = await ruoyi_auth.load_access_profile(access_token)
    except AppError:
        raise
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise AppError(
            code="AUTH_UPSTREAM_ERROR",
            message="认证服务暂时不可用",
            status_code=502,
            details={"reason": exc.__class__.__name__}
        ) from exc

    return AccessContext(
        user_id=profile.user_id,
        request_id=request_id,
        access_token=access_token,
        username=profile.username,
        nickname=profile.nickname,
        avatar_url=profile.avatar_url,
        roles=profile.roles,
        permissions=profile.permissions
    )


def require_permissions(*required_permissions: str):
    async def dependency(access_context: AccessContext = Depends(get_access_context)) -> AccessContext:
        missing_permissions = _missing_permissions(required_permissions, access_context.permissions)
        if missing_permissions:
            raise AppError(
                code="AUTH_FORBIDDEN",
                message="当前账号暂无访问权限",
                status_code=403,
                details={
                    "required_permissions": list(required_permissions),
                    "missing_permissions": missing_permissions
                }
            )
        return access_context

    return dependency
