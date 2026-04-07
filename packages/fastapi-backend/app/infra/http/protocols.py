"""HTTP 客户端协议定义，为基础设施层提供统一的 HTTP 抽象接口。"""

from typing import Protocol


class HttpClient(Protocol):
    """HTTP 客户端协议，定义 GET/POST 异步请求接口。"""

    async def get(self, path: str, **kwargs: object) -> object:
        """发送 GET 请求。"""
        ...

    async def post(self, path: str, **kwargs: object) -> object:
        """发送 POST 请求。"""
        ...
