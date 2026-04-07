"""认证与权限安全模块。

负责 Bearer Token 提取、RuoYi 会话校验、在线令牌检查、权限判断，
以及 FastAPI 依赖注入函数 ``get_access_context()``。

认证流程::

    1. 从 Authorization 头提取 Bearer Token
    2. 解析 JWT payload 获取 tenant_id / client_id
    3. 通过 Redis 在线令牌表校验会话有效性
    4. 调用 RuoYi ``/system/user/getInfo`` 获取用户角色与权限
    5. 组装 ``AccessContext`` 注入到路由处理函数
"""
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
    """已认证用户的请求级安全上下文（不可变）。

    由 ``get_access_context()`` 依赖注入函数构建，
    贯穿整个请求处理链路，供路由与服务层读取用户身份和权限。

    Attributes:
        user_id: RuoYi 用户 ID。
        username: 用户名。
        roles: 用户角色列表。
        permissions: 用户权限字符串列表（支持通配符 ``*``）。
        token: 原始 Bearer Token。
        client_id: JWT 中的 clientId（多租户场景）。
        request_id: 关联的请求追踪 ID。
        online_ttl_seconds: 在线令牌剩余 TTL（秒），-2 表示不存在。
    """

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
    """从 RuoYi ``/system/user/getInfo`` 接口解析出的用户画像。"""

    user_id: str
    username: str
    roles: tuple[str, ...]
    permissions: tuple[str, ...]


@dataclass(slots=True, frozen=True)
class AccessTokenClaims:
    """从 JWT payload 中提取的租户与客户端标识。"""

    tenant_id: str | None
    client_id: str | None


def extract_bearer_token(authorization: str | None) -> str | None:
    """从 Authorization 请求头中提取 Bearer Token。

    Args:
        authorization: 原始 Authorization 头值。

    Returns:
        Token 字符串，或 None（头为空时）。

    Raises:
        AppError: 头格式不合法（非 Bearer 前缀）或 Token 为空。
    """
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
    """从 JWT access_token 的 payload 段解析 tenantId 和 clientId。

    不做签名验证（签名校验由 RuoYi 网关完成），仅 base64 解码读取 claims。
    解析失败时返回空 claims 而非抛出异常。
    """
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
    """判断已授予权限集合是否满足指定权限要求。

    支持 RuoYi 风格的冒号分段通配符匹配（如 ``"video:task:*"`` 匹配 ``"video:task:create"``），
    以及超级管理员通配 ``"*:*:*"``。

    Args:
        granted_permissions: 用户已拥有的权限列表。
        required_permission: 需要校验的权限字符串。

    Returns:
        True 表示权限满足，False 表示不满足。
    """
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
    """获取安全模块专用的 RuntimeStore 单例（带 LRU 缓存）。"""
    return create_runtime_store()


async def load_ruoyi_access_profile(
    access_token: str,
    *,
    client_id: str | None = None
) -> RuoYiAccessProfile:
    """调用 RuoYi ``/system/user/getInfo`` 加载当前用户画像。

    Args:
        access_token: Bearer Token。
        client_id: 可选的客户端 ID（多租户场景）。

    Returns:
        RuoYiAccessProfile: 包含用户 ID、用户名、角色和权限的画像。

    Raises:
        AppError: 401（会话无效）、403（权限不足）、502（响应格式异常）。
        IntegrationError: RuoYi 服务不可达或返回非预期状态码。
    """
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
    """FastAPI 依赖注入函数：构建已认证用户的安全上下文。

    完整认证流程：提取 Token → 解析 JWT claims → 校验在线状态 →
    加载 RuoYi 用户画像 → 组装 ``AccessContext``。

    Raises:
        AppError: 未提供 Token（401）、会话已失效（401）。
    """
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
