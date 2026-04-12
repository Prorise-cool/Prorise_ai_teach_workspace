"""视频图片存储抽象层。"""

from __future__ import annotations

import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from pathlib import Path

from app.core.logging import get_logger
from pydantic import BaseModel

logger = get_logger("app.features.video.image_storage")


class ImageStorageResult(BaseModel):
    """图片存储结果。"""

    image_ref: str
    relative_path: str


class ImageStorage(ABC):
    """图片存储抽象接口。"""

    @property
    def is_development_fallback(self) -> bool:
        """标记当前实现是否仅允许在开发/测试环境回退使用。"""
        return False

    @abstractmethod
    async def upload(
        self, file_bytes: bytes, filename: str, content_type: str
    ) -> ImageStorageResult:
        """上传图片。"""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, image_ref: str) -> bool:
        """删除图片。"""
        raise NotImplementedError


class LocalImageStorage(ImageStorage):
    """基于本地文件系统的图片存储实现。"""

    def __init__(self, base_dir: str | Path = "data/uploads/video") -> None:
        """初始化图片存储。"""
        self._base_dir = Path(base_dir)

    @property
    def is_development_fallback(self) -> bool:
        """本地文件存储只允许作为开发/测试回退。"""
        return True

    async def upload(
        self, file_bytes: bytes, filename: str, content_type: str
    ) -> ImageStorageResult:
        """上传图片。"""
        date_prefix = datetime.now(UTC).strftime("%Y%m%d")
        extension = _extract_extension(filename, content_type)
        relative_path = f"{date_prefix}/{uuid.uuid4().hex}{extension}"
        full_path = self._base_dir / relative_path

        await asyncio.to_thread(full_path.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(full_path.write_bytes, file_bytes)

        image_ref = f"local://{relative_path}"
        logger.info("Video image stored ref=%s size=%d", image_ref, len(file_bytes))
        return ImageStorageResult(image_ref=image_ref, relative_path=relative_path)

    async def delete(self, image_ref: str) -> bool:
        """删除图片。"""
        if not image_ref.startswith("local://"):
            return False

        relative_path = image_ref.removeprefix("local://")
        full_path = self._base_dir / relative_path

        if not await asyncio.to_thread(full_path.exists):
            return False

        await asyncio.to_thread(full_path.unlink)
        return True


class CosImageStorage(ImageStorage):
    """腾讯云 COS 图片存储实现（待完成）。"""

    def __init__(
        self, bucket: str = "xiaomai-video", region: str = "ap-guangzhou"
    ) -> None:
        """初始化图片存储。"""
        self._bucket = bucket
        self._region = region

    async def upload(
        self, file_bytes: bytes, filename: str, content_type: str
    ) -> ImageStorageResult:
        """上传图片。"""
        raise NotImplementedError("COS 图片存储尚未实现，当前请使用 LocalImageStorage")

    async def delete(self, image_ref: str) -> bool:
        """删除图片。"""
        raise NotImplementedError("COS 图片删除尚未实现，当前请使用 LocalImageStorage")


_MIME_TO_EXTENSION: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _extract_extension(filename: str, content_type: str) -> str:
    if "." in filename:
        extension = f".{filename.rsplit('.', 1)[-1].lower()}"
        if extension in {".jpg", ".jpeg", ".png", ".webp"}:
            return extension
    return _MIME_TO_EXTENSION.get(content_type, ".bin")
