from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.core.errors import AppError, IntegrationError
from app.shared.ruoyi_client import RuoYiClient


@dataclass(slots=True)
class RuoYiAccessProfile:
    user_id: str
    username: str
    nickname: str | None
    avatar_url: str | None
    roles: tuple[str, ...]
    permissions: tuple[str, ...]
    raw: dict[str, Any]


def create_ruoyi_client(access_token: str) -> RuoYiClient:
    settings = get_settings()
    return RuoYiClient(
        base_url=settings.ruoyi_base_url,
        timeout_seconds=settings.ruoyi_timeout_seconds,
        retry_attempts=settings.ruoyi_retry_attempts,
        retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
        access_token=access_token
    )


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _dedupe(values: Iterable[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(value for value in values if value))


def _extract_role_keys(payload: Any) -> tuple[str, ...]:
    if not isinstance(payload, list):
        return ()

    keys: list[str] = []
    for item in payload:
        if isinstance(item, str):
            keys.append(item.strip())
            continue
        if isinstance(item, Mapping):
            for field_name in ("roleKey", "key", "roleName", "name"):
                key = _normalize_text(item.get(field_name))
                if key is not None:
                    keys.append(key)
                    break
    return _dedupe(keys)


def _extract_permission_keys(payload: Any) -> tuple[str, ...]:
    if not isinstance(payload, list):
        return ()

    keys: list[str] = []
    for item in payload:
        if isinstance(item, str):
            keys.append(item.strip())
        elif isinstance(item, Mapping):
            key = _normalize_text(item.get("permissionKey") or item.get("key") or item.get("name"))
            if key is not None:
                keys.append(key)
    return _dedupe(keys)


async def load_access_profile(
    access_token: str,
    *,
    client_factory: Callable[[str], RuoYiClient] | None = None
) -> RuoYiAccessProfile:
    factory = client_factory or create_ruoyi_client
    try:
        async with factory(access_token) as client:
            response = await client.request_single(
                "GET",
                "/system/user/getInfo",
                resource="auth-user",
                operation="get-info",
                retry_enabled=False
            )
    except IntegrationError as exc:
        if exc.status_code == 401:
            raise AppError(
                code="AUTH_UNAUTHORIZED",
                message="请先登录后再访问受保护资源",
                status_code=401,
                details=exc.details
            ) from exc
        if exc.status_code == 403:
            raise AppError(
                code="AUTH_FORBIDDEN",
                message="当前账号暂无访问权限",
                status_code=403,
                details=exc.details
            ) from exc
        raise

    payload = response.data
    if not isinstance(payload, Mapping):
        raise AppError(
            code="AUTH_INVALID_PROFILE",
            message="认证服务返回的用户信息格式异常",
            status_code=502,
            details={"reason": "data_is_not_a_mapping"}
        )

    user_payload = payload.get("user")
    if not isinstance(user_payload, Mapping):
        raise AppError(
            code="AUTH_INVALID_PROFILE",
            message="认证服务返回的用户信息格式异常",
            status_code=502,
            details={"reason": "missing_user"}
        )

    user_id = _normalize_text(user_payload.get("userId"))
    username = _normalize_text(user_payload.get("userName"))
    if user_id is None or username is None:
        raise AppError(
            code="AUTH_INVALID_PROFILE",
            message="认证服务返回的用户信息格式异常",
            status_code=502,
            details={"reason": "missing_user_identity"}
        )

    roles = _dedupe(
        (
            *_extract_role_keys(user_payload.get("roles")),
            *_extract_role_keys(payload.get("roles")),
        )
    )
    permissions = _extract_permission_keys(payload.get("permissions"))

    return RuoYiAccessProfile(
        user_id=user_id,
        username=username,
        nickname=_normalize_text(user_payload.get("nickName")),
        avatar_url=_normalize_text(user_payload.get("avatar")),
        roles=roles,
        permissions=permissions,
        raw=dict(payload)
    )
