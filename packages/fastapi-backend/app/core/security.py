from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, Header, Request

from app.core.config import get_settings
from app.core.errors import AppError, IntegrationError
from app.core.logging import get_request_id
from app.infra.redis_client import RuntimeStore, create_runtime_store
from app.shared.ruoyi_client import RuoYiClient

AUTH_BEARER_PREFIX = "Bearer "
SUPER_ADMIN_PERMISSION = "*:*:*"


@dataclass(slots=True, frozen=True)
class AccessContext:
    user_id: str
    username: str
    roles: tuple[str, ...]
    permissions: tuple[str, ...]
    token: str
    client_id: str | None
    request_id: str | None
    online_ttl_seconds: int | None


@dataclass(slots=True, frozen=True)
class RuoYiAccessProfile:
    user_id: str
    username: str
    roles: tuple[str, ...]
    permissions: tuple[str, ...]


@dataclass(slots=True, frozen=True)
class AccessTokenClaims:
    tenant_id: str | None
    client_id: str | None


def extract_bearer_token(authorization: str | None) -> str | None:
    if authorization is None:
        return None

    normalized = authorization.strip()
    if not normalized:
        return None

    if not normalized.startswith(AUTH_BEARER_PREFIX):
        raise AppError(
            code="AUTH_INVALID_HEADER",
            message="认证头格式错误",
            status_code=401,
        )

    token = normalized[len(AUTH_BEARER_PREFIX):].strip()
    if not token:
        raise AppError(
            code="AUTH_TOKEN_MISSING",
            message="未提供有效认证令牌",
            status_code=401,
        )

    return token


def extract_access_token_claims(access_token: str) -> AccessTokenClaims:
    token_parts = access_token.split(".")
    if len(token_parts) != 3:
        return AccessTokenClaims(tenant_id=None, client_id=None)

    payload_segment = token_parts[1]
    padding = "=" * (-len(payload_segment) % 4)

    try:
        decoded_payload = base64.urlsafe_b64decode(f"{payload_segment}{padding}")
        payload = json.loads(decoded_payload.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError):
        return AccessTokenClaims(tenant_id=None, client_id=None)

    if not isinstance(payload, dict):
        return AccessTokenClaims(tenant_id=None, client_id=None)

    tenant_id = payload.get("tenantId")
    client_id = payload.get("clientid")
    return AccessTokenClaims(
        tenant_id=str(tenant_id) if tenant_id else None,
        client_id=str(client_id) if client_id else None,
    )


def has_permission(granted_permissions: tuple[str, ...], required_permission: str) -> bool:
    normalized_required = required_permission.strip()
    if not normalized_required:
        return False

    required_parts = normalized_required.split(":")

    for granted_permission in granted_permissions:
        normalized_granted = granted_permission.strip()
        if not normalized_granted:
            continue
        if normalized_granted in {"*", SUPER_ADMIN_PERMISSION}:
            return True
        if normalized_granted == normalized_required:
            return True

        granted_parts = normalized_granted.split(":")
        if len(granted_parts) != len(required_parts):
            continue
        if all(granted == "*" or granted == required for granted, required in zip(granted_parts, required_parts)):
            return True

    return False


@lru_cache
def get_security_runtime_store() -> RuntimeStore:
    return create_runtime_store()


async def load_ruoyi_access_profile(
    access_token: str,
    *,
    client_id: str | None = None
) -> RuoYiAccessProfile:
    settings = get_settings()
    request_headers = {}
    if client_id:
        request_headers["Clientid"] = client_id

    async with RuoYiClient(
        access_token=access_token,
        base_url=settings.ruoyi_base_url,
        timeout_seconds=settings.ruoyi_timeout_seconds,
        retry_attempts=settings.ruoyi_retry_attempts,
        retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
        default_headers=request_headers,
    ) as client:
        try:
            response = await client.get_single(
                "/system/user/getInfo",
                resource="auth",
                operation="get_current_user",
            )
        except IntegrationError as exc:
            if exc.status_code == 401:
                raise AppError(
                    code="AUTH_SESSION_UNAUTHORIZED",
                    message=exc.message,
                    status_code=401,
                    details=exc.details,
                ) from exc
            if exc.status_code == 403:
                raise AppError(
                    code="AUTH_PERMISSION_DENIED",
                    message=exc.message,
                    status_code=403,
                    details=exc.details,
                ) from exc
            raise

    payload = response.data
    if not isinstance(payload, dict):
        raise AppError(
            code="AUTH_PROFILE_INVALID",
            message="认证用户信息缺失",
            status_code=502,
        )

    user_payload = payload.get("user")
    user_id = str(user_payload.get("userId", "")) if isinstance(user_payload, dict) else ""
    username = str(user_payload.get("userName", "")) if isinstance(user_payload, dict) else ""
    roles = tuple(str(role) for role in payload.get("roles", []))
    permissions = tuple(str(permission) for permission in payload.get("permissions", []))

    if not user_id or not username:
        raise AppError(
            code="AUTH_PROFILE_INVALID",
            message="认证用户信息缺失",
            status_code=502,
        )

    return RuoYiAccessProfile(
        user_id=user_id,
        username=username,
        roles=roles,
        permissions=permissions,
    )


async def get_access_context(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    runtime_store: RuntimeStore = Depends(get_security_runtime_store),
) -> AccessContext:
    request_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("x-request-id")
        or get_request_id()
    )
    token = extract_bearer_token(authorization)
    if token is None:
        raise AppError(
            code="AUTH_TOKEN_MISSING",
            message="未提供有效认证令牌",
            status_code=401,
        )

    token_claims = extract_access_token_claims(token)
    online_record = runtime_store.get_online_token_record(
        token,
        tenant_id=token_claims.tenant_id,
    )
    if online_record is None:
        raise AppError(
            code="AUTH_SESSION_OFFLINE",
            message="当前会话已失效，请重新登录",
            status_code=401,
            details={"request_id": request_id},
        )

    profile = await load_ruoyi_access_profile(
        token,
        client_id=token_claims.client_id,
    )
    online_ttl_seconds = runtime_store.get_online_token_ttl(
        token,
        tenant_id=token_claims.tenant_id,
    )

    return AccessContext(
        user_id=profile.user_id,
        username=profile.username,
        roles=profile.roles,
        permissions=profile.permissions,
        token=token,
        client_id=token_claims.client_id,
        request_id=request_id,
        online_ttl_seconds=online_ttl_seconds if online_ttl_seconds >= 0 else None,
    )
