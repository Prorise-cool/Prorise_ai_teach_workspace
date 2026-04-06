"""视频流水线本地对象存储适配层。"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings
from app.features.video.pipeline.models import VideoResultDetail
from app.shared.cos_client import CosAsset, CosClient


class LocalAssetStore:
    def __init__(self, *, root_dir: Path, cos_client: CosClient) -> None:
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
        active_settings = settings or get_settings()
        active_cos_client = cos_client or CosClient.from_settings()
        return cls(
            root_dir=Path(active_settings.video_asset_root),
            cos_client=active_cos_client,
        )

    def build_asset(self, key: str) -> CosAsset:
        return self.cos_client.build_asset(key)

    def write_bytes(self, key: str, content: bytes) -> CosAsset:
        path = self.resolve_path_from_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return self.build_asset(key)

    def write_text(self, key: str, content: str) -> CosAsset:
        return self.write_bytes(key, content.encode("utf-8"))

    def write_json(self, key: str, content: dict[str, Any]) -> CosAsset:
        return self.write_text(key, json.dumps(content, ensure_ascii=False, indent=2))

    def copy_file(self, source_path: str | Path, key: str) -> CosAsset:
        source = Path(source_path)
        destination = self.resolve_path_from_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        return self.build_asset(key)

    def read_json(self, ref: str) -> dict[str, Any]:
        path = self.resolve_ref(ref)
        return json.loads(path.read_text(encoding="utf-8"))

    def read_result_detail(self, ref: str) -> VideoResultDetail:
        return VideoResultDetail.model_validate(self.read_json(ref))

    def exists(self, ref: str) -> bool:
        return self.resolve_ref(ref).exists()

    def resolve_ref(self, ref: str) -> Path:
        return self.resolve_path_from_key(self.ref_to_key(ref))

    def resolve_path_from_key(self, key: str) -> Path:
        normalized_key = key.lstrip("/")
        return self.root_dir / normalized_key

    def ref_to_key(self, ref: str) -> str:
        base_url = self.cos_client.base_url.rstrip("/")
        if ref.startswith(f"{base_url}/"):
            return ref[len(base_url) + 1:]
        return ref.lstrip("/")
