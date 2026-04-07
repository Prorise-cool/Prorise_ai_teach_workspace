"""RuoYi 平台响应数据模型与通用辅助函数。

本模块定义 RuoYi HTTP 接口响应的统一数据类，以及与请求/响应无关的
纯工具函数（状态码解析、JWT client-id 提取、请求头格式化、重试详情构建等）。
不承载任何 HTTP I/O 或客户端生命周期逻辑。
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Generic, Mapping, TypeVar

from app.core.logging import get_request_id, get_task_id

T = TypeVar("T")


# ---------------------------------------------------------------------------
# 响应数据类
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class RuoYiSingleResponse(Generic[T]):
    """RuoYi 单条记录响应（code / msg / data）。"""

    code: int
    msg: str
    data: T
    raw: dict[str, Any]


@dataclass(slots=True)
class RuoYiPageResponse(Generic[T]):
    """RuoYi 分页列表响应（code / msg / rows / total）。"""

    code: int
    msg: str
    rows: list[T]
    total: int
    raw: dict[str, Any]


@dataclass(slots=True)
class RuoYiAckResponse:
    """RuoYi 仅确认（无 data/rows）响应（code / msg）。"""

    code: int
    msg: str
    raw: dict[str, Any]


# ---------------------------------------------------------------------------
# 通用辅助函数
# ---------------------------------------------------------------------------

def coerce_status_code(value: Any) -> int | None:
    """将 RuoYi 响应中的 ``code`` 字段安全转换为 ``int``。

    Args:
        value: 原始 ``code`` 值，可能是 ``int`` 或纯数字字符串。

    Returns:
        解析后的整数状态码，无法识别时返回 ``None``。
    """
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def extract_client_id_from_access_token(access_token: str | None) -> str | None:
    """从 JWT access_token 的 payload 段提取 ``clientid`` / ``clientId``。

    仅做 base64 解码，不做签名验证。

    Args:
        access_token: 完整的 JWT 字符串（``header.payload.signature``）。

    Returns:
        解析到的 client-id 字符串，或 ``None``。
    """
    if access_token is None:
        return None

    token_parts = access_token.split(".")
    if len(token_parts) != 3:
        return None

    payload_segment = token_parts[1]
    padding = "=" * (-len(payload_segment) % 4)

    try:
        decoded_payload = base64.urlsafe_b64decode(f"{payload_segment}{padding}")
        payload = json.loads(decoded_payload.decode("utf-8"))
    except (UnicodeDecodeError, ValueError, json.JSONDecodeError):
        return None

    if not isinstance(payload, Mapping):
        return None

    client_id = payload.get("clientid") or payload.get("clientId")
    if isinstance(client_id, str):
        stripped = client_id.strip()
        return stripped or None
    return None


def format_headers(headers: Mapping[str, str] | None = None) -> dict[str, str]:
    """构造发送到 RuoYi 的请求头，自动注入追踪 ID。

    Args:
        headers: 额外需要合并的自定义请求头。

    Returns:
        合并后的请求头字典。
    """
    request_headers: dict[str, str] = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Client-Name": "prorise-fastapi-backend"
    }

    request_id = get_request_id()
    task_id = get_task_id()
    if request_id is not None:
        request_headers["X-Request-ID"] = request_id
    if task_id is not None:
        request_headers["X-Task-ID"] = task_id
    if headers:
        request_headers.update(headers)
    return request_headers


def build_retry_details(
    *,
    service: str,
    resource: str,
    operation: str,
    endpoint: str,
    attempts: int,
    request_id: str | None,
    task_id: str | None,
    upstream_status: int | None = None,
    upstream_code: int | None = None,
    upstream_message: str | None = None,
    reason: str | None = None
) -> dict[str, object]:
    """构建用于 ``IntegrationError.details`` 的重试上下文字典。

    Args:
        service: 上游服务标识，通常为 ``"ruoyi"``。
        resource: 业务资源名称（如 ``"user"``）。
        operation: 操作名称（如 ``"getInfo"``）。
        endpoint: 请求路径。
        attempts: 已尝试次数。
        request_id: 当前请求追踪 ID。
        task_id: 当前任务追踪 ID。
        upstream_status: 上游 HTTP 状态码。
        upstream_code: 上游业务状态码。
        upstream_message: 上游消息。
        reason: 失败原因描述。

    Returns:
        可直接作为 ``details`` 传入 ``IntegrationError`` 的字典。
    """
    details: dict[str, object] = {
        "service": service,
        "resource": resource,
        "operation": operation,
        "endpoint": endpoint,
        "attempts": attempts
    }
    if request_id is not None:
        details["request_id"] = request_id
    if task_id is not None:
        details["task_id"] = task_id
    if upstream_status is not None:
        details["upstream_status"] = upstream_status
    if upstream_code is not None:
        details["upstream_code"] = upstream_code
    if upstream_message is not None:
        details["upstream_message"] = upstream_message
    if reason is not None:
        details["reason"] = reason
    return details
