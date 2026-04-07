"""腾讯云 COS 对象存储客户端，负责构建资源公开访问 URL。"""

from dataclasses import dataclass

from app.core.config import get_settings


@dataclass(slots=True)
class CosAsset:
    """COS 资源描述，包含 key 和公开 URL。"""
    key: str
    public_url: str


class CosClient:
    """COS 客户端，基于 base_url 拼装资源的公开访问地址。"""

    def __init__(self, base_url: str) -> None:
        """初始化 COS 客户端。

        Args:
            base_url: COS 桶的公开访问基地址。
        """
        self.base_url = base_url

    @classmethod
    def from_settings(cls) -> "CosClient":
        """从全局配置创建 COS 客户端实例。"""
        settings = get_settings()
        return cls(base_url=settings.cos_base_url)

    def build_asset(self, key: str) -> CosAsset:
        """根据 key 构建 COS 资源描述（含公开 URL）。"""
        return CosAsset(key=key, public_url=f"{self.base_url.rstrip('/')}/{key.lstrip('/')}")
