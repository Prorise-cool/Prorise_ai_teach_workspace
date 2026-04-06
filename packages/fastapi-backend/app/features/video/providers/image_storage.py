"""图片存储抽象层与实现。

职责：提供统一的图片上传接口，MVP 阶段使用本地文件系统，
预留 COS 对象存储切换能力。imageRef 格式对前端不透明。

边界：仅负责文件持久化与引用生成，不涉及校验或 OCR。
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.core.logging import get_logger

if TYPE_CHECKING:
    pass

logger = get_logger("video.image_storage")


class ImageStorageResult(BaseModel):
    """图片存储结果。"""
    image_ref: str
    relative_path: str


class ImageStorage(ABC):
    """图片存储抽象接口。"""

    @abstractmethod
    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        """上传图片文件并返回存储引用。

        Args:
            file_bytes: 图片二进制数据。
            filename: 原始文件名。
            content_type: MIME 类型。

        Returns:
            包含 imageRef 和 relative_path 的存储结果。
        """

    @abstractmethod
    async def delete(self, image_ref: str) -> bool:
        """删除指定存储引用的图片。

        Args:
            image_ref: 图片存储引用。

        Returns:
            是否删除成功。
        """


class LocalImageStorage(ImageStorage):
    """本地文件系统图片存储实现。

    将图片存储到 data/uploads/video/<date>/ 目录，
    imageRef 格式为 local://<relative_path>。
    """

    def __init__(self, base_dir: str | Path = "data/uploads/video") -> None:
        self._base_dir = Path(base_dir)

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        date_prefix = datetime.now(UTC).strftime("%Y%m%d")
        ext = _extract_extension(filename, content_type)
        unique_name = f"{uuid.uuid4().hex}{ext}"
        relative_path = f"{date_prefix}/{unique_name}"
        full_path = self._base_dir / relative_path

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(file_bytes)

        image_ref = f"local://{relative_path}"
        logger.info("Image stored locally: ref=%s size=%d", image_ref, len(file_bytes))
        return ImageStorageResult(image_ref=image_ref, relative_path=relative_path)

    async def delete(self, image_ref: str) -> bool:
        if not image_ref.startswith("local://"):
            return False
        relative_path = image_ref[len("local://"):]
        full_path = self._base_dir / relative_path
        if full_path.exists():
            full_path.unlink()
            logger.info("Image deleted: ref=%s", image_ref)
            return True
        return False


class CosImageStorage(ImageStorage):
    """腾讯云 COS 对象存储占位实现。

    当前仅为接口占位，真实实现需在上线前接入 COS SDK。
    imageRef 格式为 cos://<bucket>/<key>。
    """

    def __init__(self, bucket: str = "xiaomai-video", region: str = "ap-guangzhou") -> None:
        self._bucket = bucket
        self._region = region

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        raise NotImplementedError(
            "COS 图片存储尚未实现，当前 MVP 阶段请使用 LocalImageStorage"
        )

    async def delete(self, image_ref: str) -> bool:
        raise NotImplementedError(
            "COS 图片删除尚未实现，当前 MVP 阶段请使用 LocalImageStorage"
        )


_MIME_TO_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _extract_extension(filename: str, content_type: str) -> str:
    """从文件名或 MIME 类型中提取文件扩展名。"""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
        if ext in (".jpg", ".jpeg", ".png", ".webp"):
            return ext
    return _MIME_TO_EXT.get(content_type, ".bin")
