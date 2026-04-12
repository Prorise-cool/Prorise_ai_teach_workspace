"""视频流水线本地资产存储适配层。

负责将流水线产物落盘到 ``video_asset_root``，并生成可供前端访问的 URL 引用。
注意：该适配层只负责本地文件系统落盘，不应伪装为真实 COS 行为；URL 的构建
由 ``CosClient``（历史命名）统一拼装，在 development 环境会默认回落到 FastAPI
本地资产路由（见 ``app.features.video.routes``）。
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.core.config import Settings, get_settings
from app.features.video.pipeline.models import VideoResultDetail
from app.shared.cos_client import CosAsset, CosClient


class LocalAssetStore:
    """视频流水线本地资产存储。"""

    def __init__(self, *, root_dir: Path, cos_client: CosClient) -> None:
        """初始化本地资产存储。"""
        self.root_dir = root_dir
        self.cos_client = cos_client
        self.root_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def from_settings(
        cls,
        settings: Settings | None = None,
        *,
        cos_client: CosClient | None = None,
    ) -> "LocalAssetStore":
        """从 Settings 创建实例。"""
        active_settings = settings or get_settings()
        active_cos_client = cos_client or CosClient.from_settings()
        return cls(
            root_dir=Path(active_settings.video_asset_root),
            cos_client=active_cos_client,
        )

    def build_asset(self, key: str) -> CosAsset:
        """根据 key 构建 CosAsset 对象。"""
        return self.cos_client.build_asset(key)

    def write_bytes(self, key: str, content: bytes) -> CosAsset:
        """将字节数据写入本地文件并返回资产引用。"""
        path = self.resolve_path_from_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return self.build_asset(key)

    def write_text(self, key: str, content: str) -> CosAsset:
        """将文本写入本地文件并返回资产引用。"""
        return self.write_bytes(key, content.encode("utf-8"))

    def write_json(self, key: str, content: dict[str, Any]) -> CosAsset:
        """将字典序列化为 JSON 写入并返回资产引用。"""
        return self.write_text(key, json.dumps(content, ensure_ascii=False, indent=2))

    def copy_file(self, source_path: str | Path, key: str) -> CosAsset:
        """拷贝外部文件到资产目录。"""
        source = Path(source_path)
        destination = self.resolve_path_from_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        return self.build_asset(key)

    def read_json(self, ref: str) -> dict[str, Any]:
        """读取并解析 JSON 资产文件。"""
        path = self.resolve_ref(ref)
        return json.loads(path.read_text(encoding="utf-8"))

    def read_result_detail(self, ref: str) -> VideoResultDetail:
        """读取并解析视频结果详情。"""
        return VideoResultDetail.model_validate(self.read_json(ref))

    def exists(self, ref: str) -> bool:
        """检查资产引用是否存在。"""
        return self.resolve_ref(ref).exists()

    def resolve_ref(self, ref: str) -> Path:
        """将资产引用解析为本地路径。"""
        return self.resolve_path_from_key(self.ref_to_key(ref))

    def resolve_path_from_key(self, key: str) -> Path:
        """将 key 解析为本地文件路径。"""
        normalized_key = key.lstrip("/").replace("\\", "/")
        if not normalized_key:
            raise ValueError("asset key is empty")

        root_dir = self.root_dir.resolve(strict=False)
        candidate = (root_dir / normalized_key).resolve(strict=False)
        if not candidate.is_relative_to(root_dir):
            raise ValueError("asset key escapes asset root")
        return candidate

    def ref_to_key(self, ref: str) -> str:
        """将资产引用转为存储 key。"""
        base_url = self.cos_client.base_url.rstrip("/")
        if ref.startswith(f"{base_url}/"):
            return ref[len(base_url) + 1 :]
        parsed = urlparse(ref)
        if parsed.scheme in {"http", "https"} and parsed.path:
            path = parsed.path
            marker = "/video/assets/"
            if marker in path:
                return path.split(marker, 1)[1].lstrip("/")
            marker = "/video/"
            if marker in path:
                start = path.find(marker)
                return path[start + 1 :].lstrip("/")
        return ref.lstrip("/")
