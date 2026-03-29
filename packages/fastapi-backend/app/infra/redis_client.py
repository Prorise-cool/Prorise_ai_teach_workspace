from dataclasses import dataclass, field

from app.core.config import get_settings


@dataclass(slots=True)
class RuntimeStore:
    backend: str
    redis_url: str
    storage: dict[str, object] = field(default_factory=dict)

    def get(self, key: str) -> object | None:
        return self.storage.get(key)

    def set(self, key: str, value: object) -> None:
        self.storage[key] = value


def create_runtime_store() -> RuntimeStore:
    settings = get_settings()
    return RuntimeStore(backend="redis-fallback", redis_url=settings.redis_url)
