from dataclasses import dataclass

from app.core.config import get_settings


@dataclass(slots=True)
class CosAsset:
    key: str
    public_url: str


class CosClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url

    @classmethod
    def from_settings(cls) -> "CosClient":
        settings = get_settings()
        return cls(base_url=settings.cos_base_url)

    def build_asset(self, key: str) -> CosAsset:
        return CosAsset(key=key, public_url=f"{self.base_url.rstrip('/')}/{key.lstrip('/')}")
