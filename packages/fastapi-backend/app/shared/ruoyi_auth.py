"""RuoYi 鉴权上下文与服务级凭据解析。"""

from __future__ import annotations

from dataclasses import dataclass
import json
from collections.abc import Mapping
from typing import TYPE_CHECKING

from app.core.config import RuoYiServiceAuthMode, Settings, get_settings
from app.core.errors import AppError
from app.shared.ruoyi_models import extract_client_id_from_access_token

if TYPE_CHECKING:
    from app.core.security import AccessContext


@dataclass(slots=True, frozen=True)
class RuoYiRequestAuth:
    """一次 RuoYi 请求所需的 Bearer token 与 Clientid。"""

    access_token: str
    client_id: str | None = None

    @classmethod
    def from_access_context(cls, access_context: "AccessContext") -> "RuoYiRequestAuth":
        """从认证通过的用户上下文构造请求鉴权。"""

        return cls(
            access_token=access_context.token,
            client_id=access_context.client_id,
        )


def load_ruoyi_service_auth(settings: Settings | None = None) -> RuoYiRequestAuth:
    """从显式配置的服务级凭据中加载 RuoYi 请求鉴权。"""

    active_settings = settings or get_settings()
    if active_settings.ruoyi_service_auth_mode is RuoYiServiceAuthMode.DISABLED:
        raise AppError(
            code="RUOYI_SERVICE_AUTH_DISABLED",
            message="当前环境未配置 RuoYi 服务级鉴权，不能执行匿名后台回源请求",
            status_code=503,
        )

    if active_settings.ruoyi_service_auth_mode is not RuoYiServiceAuthMode.TOKEN_FILE:
        raise AppError(
            code="RUOYI_SERVICE_AUTH_MODE_INVALID",
            message="RuoYi 服务级鉴权模式不受支持",
            status_code=500,
            details={"mode": active_settings.ruoyi_service_auth_mode.value},
        )

    token_file = active_settings.resolve_ruoyi_service_token_file()
    if token_file is None:
        raise AppError(
            code="RUOYI_SERVICE_TOKEN_FILE_MISSING",
            message="未配置 RuoYi 服务级 token 文件路径",
            status_code=503,
        )
    if not token_file.exists():
        raise AppError(
            code="RUOYI_SERVICE_TOKEN_FILE_NOT_FOUND",
            message="RuoYi 服务级 token 文件不存在",
            status_code=503,
            details={"token_file": str(token_file)},
        )

    raw_payload = token_file.read_text(encoding="utf-8").strip()
    if not raw_payload:
        raise AppError(
            code="RUOYI_SERVICE_TOKEN_EMPTY",
            message="RuoYi 服务级 token 文件为空",
            status_code=503,
            details={"token_file": str(token_file)},
        )

    try:
        token, client_id = _parse_ruoyi_service_token_payload(raw_payload)
    except ValueError as exc:
        raise AppError(
            code="RUOYI_SERVICE_TOKEN_INVALID",
            message="RuoYi 服务级 token 文件格式非法",
            status_code=503,
            details={"token_file": str(token_file), "reason": str(exc)},
        ) from exc
    return RuoYiRequestAuth(
        access_token=token,
        client_id=active_settings.ruoyi_service_client_id or client_id,
    )


def _parse_ruoyi_service_token_payload(payload: str) -> tuple[str, str | None]:
    """解析服务级 token 文件。

    正式契约只接受两种格式：
    1. 纯 JWT 字符串
    2. JSON 对象 ``{"access_token": "...", "client_id": "..."}``
    """

    try:
        structured_payload = json.loads(payload)
    except json.JSONDecodeError:
        normalized_token = payload.strip()
        return normalized_token, extract_client_id_from_access_token(normalized_token)

    if isinstance(structured_payload, str):
        normalized_token = structured_payload.strip()
        if not normalized_token:
            raise ValueError("access_token is empty")
        return normalized_token, extract_client_id_from_access_token(normalized_token)

    if not isinstance(structured_payload, Mapping):
        raise ValueError("token file must contain a JWT string or a JSON object")

    token = _read_required_string(structured_payload, "access_token")
    client_id = _read_optional_string(structured_payload, "client_id")
    return token, client_id or extract_client_id_from_access_token(token)


def _read_required_string(payload: Mapping[str, object], key: str) -> str:
    value = _read_optional_string(payload, key)
    if value is None:
        raise ValueError(f"missing required field: {key}")
    return value


def _read_optional_string(payload: Mapping[str, object], key: str) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"field {key} must be a string")
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"field {key} cannot be empty")
    return stripped
