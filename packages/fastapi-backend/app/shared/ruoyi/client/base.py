"""RuoYi 客户端构造函数与生命周期。"""

from __future__ import annotations

from typing import TYPE_CHECKING, Mapping

if TYPE_CHECKING:
    from app.core.security import AccessContext

import httpx

from app.core.config import get_settings
from app.shared.ruoyi.auth import RuoYiRequestAuth
from app.shared.ruoyi.models import extract_client_id_from_access_token


class BaseMixin:
    """构造函数、工厂方法与生命周期管理。"""

    base_url: str
    timeout_seconds: float
    retry_attempts: int
    retry_delay_seconds: float
    _client: httpx.AsyncClient

    def _init_client(
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
        headers = dict(default_headers or {})
        if access_token:
            headers.setdefault("Authorization", f"Bearer {access_token}")
        resolved_client_id = client_id or extract_client_id_from_access_token(access_token)
        if resolved_client_id:
            headers.setdefault("Clientid", resolved_client_id)

        self.base_url = base_url
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = retry_attempts
        self.retry_delay_seconds = retry_delay_seconds
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout_seconds,
            headers=headers,
            transport=transport,
        )

    @classmethod
    def from_settings(cls) -> "RuoYiClient":  # noqa: F821
        """从全局 ``Settings`` 创建不带默认鉴权头的客户端实例。"""
        settings = get_settings()
        instance = cls.__new__(cls)
        instance._init_client(
            base_url=settings.ruoyi_base_url,
            timeout_seconds=settings.ruoyi_timeout_seconds,
            retry_attempts=settings.ruoyi_retry_attempts,
            retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
        )
        return instance

    @classmethod
    def from_access_context(cls, ctx: "AccessContext") -> "RuoYiClient":  # noqa: F821
        """用当前请求用户的 token 创建客户端实例。"""
        return cls.from_request_auth(RuoYiRequestAuth.from_access_context(ctx))

    @classmethod
    def from_request_auth(cls, request_auth: RuoYiRequestAuth) -> "RuoYiClient":  # noqa: F821
        """用显式请求鉴权信息创建客户端实例。"""
        settings = get_settings()
        instance = cls.__new__(cls)
        instance._init_client(
            base_url=settings.ruoyi_base_url,
            timeout_seconds=settings.ruoyi_timeout_seconds,
            retry_attempts=settings.ruoyi_retry_attempts,
            retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
            access_token=request_auth.access_token,
            client_id=request_auth.client_id,
        )
        return instance

    async def __aenter__(self) -> "RuoYiClient":  # noqa: F821
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        await self.aclose()

    async def aclose(self) -> None:
        """关闭底层 HTTP 连接。"""
        await self._client.aclose()
