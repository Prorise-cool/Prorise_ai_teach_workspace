from typing import Protocol


class HttpClient(Protocol):
    async def get(self, path: str, **kwargs: object) -> object: ...

    async def post(self, path: str, **kwargs: object) -> object: ...
