"""RuoYi 平台异步 HTTP 客户端。

本模块封装对 RuoYi 后台的所有 HTTP 请求，包括单条查询、分页查询、
仅确认写入三种模式，并内置超时/网络异常重试、统一错误码映射与日志追踪。

响应数据类与纯工具函数由 ``ruoyi_models`` 统一提供，这里作为客户端公共 API
的一部分直接暴露。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable, Mapping

if TYPE_CHECKING:
    from app.core.security import AccessContext

import httpx

from app.shared.ruoyi.auth import RuoYiRequestAuth
from app.shared.ruoyi.mapper import RuoYiMapper

# Re-export 数据类和辅助函数，作为客户端公共 API 暴露
from app.shared.ruoyi.models import (  # noqa: F401 – re-export
    RuoYiAckResponse,
    RuoYiPageResponse,
    RuoYiSingleResponse,
    build_retry_details,
    coerce_status_code,
    extract_client_id_from_access_token,
    format_headers,
)

from .base import BaseMixin
from .error_mapper import ErrorMapperMixin
from .http_core import HttpCoreMixin
from .requests import RequestsMixin
from .response_parser import ResponseParserMixin
from .shortcuts import ShortcutsMixin


class RuoYiClient(
    BaseMixin,
    ShortcutsMixin,
    RequestsMixin,
    HttpCoreMixin,
    ResponseParserMixin,
    ErrorMapperMixin,
):
    """RuoYi 平台异步 HTTP 客户端。

    提供三种请求模式：
    - ``request_single``：单条记录查询，返回 ``RuoYiSingleResponse``。
    - ``request_page``：分页列表查询，返回 ``RuoYiPageResponse``。
    - ``request_ack``：仅确认写入，返回 ``RuoYiAckResponse``。

    内置超时/网络异常自动重试、统一错误码映射和结构化日志追踪。
    """

    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 10.0,
        retry_attempts: int = 2,
        retry_delay_seconds: float = 0.1,
        access_token: str | None = None,
        client_id: str | None = None,
        default_headers: Mapping[str, str] | None = None,
        transport: httpx.BaseTransport | httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._init_client(
            base_url,
            timeout_seconds=timeout_seconds,
            retry_attempts=retry_attempts,
            retry_delay_seconds=retry_delay_seconds,
            access_token=access_token,
            client_id=client_id,
            default_headers=default_headers,
            transport=transport,
        )


# ---------------------------------------------------------------------------
# Client factory 类型与构造器
# ---------------------------------------------------------------------------

RuoYiClientFactory = Callable[[], "RuoYiClient"]
"""无参调用返回 ``RuoYiClient``（可用作 async context manager）的工厂类型。"""


def build_client_factory(
    access_context: "AccessContext | None" = None,
    *,
    request_auth: RuoYiRequestAuth | None = None,
) -> RuoYiClientFactory:
    """根据显式鉴权上下文构造 client_factory。

    优先级：
    1. 显式 ``request_auth``
    2. ``access_context`` 中的用户 token

    Args:
        access_context: 可选的已认证用户安全上下文。
        request_auth: 可选的显式请求鉴权信息。

    Returns:
        可直接调用以获取 ``RuoYiClient`` 实例的工厂函数。
    """
    if request_auth is not None:
        return lambda: RuoYiClient.from_request_auth(request_auth)
    if access_context is not None:
        return lambda: RuoYiClient.from_access_context(access_context)
    raise ValueError("build_client_factory 必须显式提供 access_context 或 request_auth")
