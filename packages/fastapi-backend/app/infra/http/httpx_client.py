import httpx

from app.infra.http.protocols import HttpClient
from app.infra.http.retry import with_retry


class HttpxClient(HttpClient):
    def __init__(self, base_url: str, timeout_seconds: float = 10.0) -> None:
        self._client = httpx.AsyncClient(base_url=base_url, timeout=timeout_seconds)

    async def get(self, path: str, **kwargs: object) -> httpx.Response:
        return await with_retry(lambda: self._client.get(path, **kwargs))

    async def post(self, path: str, **kwargs: object) -> httpx.Response:
        return await with_retry(lambda: self._client.post(path, **kwargs))

    async def aclose(self) -> None:
        await self._client.aclose()
