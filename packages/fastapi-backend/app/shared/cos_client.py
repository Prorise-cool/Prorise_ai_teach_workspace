"""对象存储资源 URL 构造器。

该模块当前只负责将对象 key 拼装为可访问的 URL，并不直接执行 COS 上传/下载。
为避免开发环境“本地落盘但 URL 仍伪装成 COS”的误导，当处于 development 且
``FASTAPI_COS_BASE_URL`` 仍为示例值时，会自动回落到 FastAPI 的本地资产路由。
"""

from dataclasses import dataclass

from app.core.config import Settings, get_settings


@dataclass(slots=True)
class CosAsset:
    """COS 资源描述，包含 key 和公开 URL。"""
    key: str
    public_url: str


class CosClient:
    """对象资源 URL 构造器。

历史上沿用 ``CosClient`` 命名，但当前实现仅用于拼装公开访问 URL；
实际存储介质可能是 COS，也可能是开发态的本地文件系统（由上层适配层负责）。
"""

    def __init__(self, base_url: str) -> None:
        """初始化 URL 构造器。

        Args:
            base_url: 资源公开访问基地址。
        """
        self.base_url = base_url

    @classmethod
    def from_settings(cls) -> "CosClient":
        """从全局配置创建 URL 构造器实例。"""
        settings = get_settings()
        base_url = (settings.cos_base_url or "").strip()
        if settings.environment == "development" and base_url in {"", "https://cos.example.local"}:
            base_url = _build_local_asset_base_url(settings)
        return cls(base_url=base_url)

    def build_asset(self, key: str) -> CosAsset:
        """根据 key 构建 COS 资源描述（含公开 URL）。"""
        return CosAsset(key=key, public_url=f"{self.base_url.rstrip('/')}/{key.lstrip('/')}")


def _build_local_asset_base_url(settings: Settings) -> str:
    """构建开发态本地资产路由的 base_url。"""
    host = settings.host
    if host in {"0.0.0.0", "::", "[::]"}:
        host = "127.0.0.1"
    api_prefix = settings.api_v1_prefix.rstrip("/")
    return f"http://{host}:{settings.port}{api_prefix}/video/assets"
