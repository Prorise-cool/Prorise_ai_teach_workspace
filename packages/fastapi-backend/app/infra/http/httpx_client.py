"""基于 httpx 的异步 HTTP 客户端实现，内置自动重试。"""

import httpx

from app.infra.http.protocols import HttpClient
from app.infra.http.retry import with_retry


class HttpxClient(HttpClient):
    """基于 httpx.AsyncClient 的 HTTP 客户端，实现 HttpClient 协议。"""

    def __init__(self, base_url: str, timeout_seconds: float = 10.0) -> None:
        """初始化 httpx 异步客户端。

        Args:
            base_url: 请求基地址。
            timeout_seconds: 请求超时时间（秒）。
        """
        self._client = httpx.AsyncClient(base_url=base_url, timeout=timeout_seconds)

    async def get(self, path: str, **kwargs: object) -> httpx.Response:
        """发送 GET 请求，自动重试。"""
        return await with_retry(lambda: self._client.get(path, **kwargs))

    async def post(self, path: str, **kwargs: object) -> httpx.Response:
        """发送 POST 请求，自动重试。"""
        return await with_retry(lambda: self._client.post(path, **kwargs))

    async def aclose(self) -> None:
        """关闭底层 httpx 客户端连接。"""
        await self._client.aclose()
