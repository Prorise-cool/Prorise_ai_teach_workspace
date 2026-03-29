from dataclasses import dataclass

from app.core.config import get_settings
from app.infra.http.httpx_client import HttpxClient


@dataclass(slots=True)
class RuoYiClient:
    base_url: str

    @classmethod
    def from_settings(cls) -> "RuoYiClient":
        settings = get_settings()
        return cls(base_url=settings.ruoyi_base_url)

    def create_http_client(self) -> HttpxClient:
        return HttpxClient(base_url=self.base_url)
