"""图片预处理服务层。

职责：编排图片校验 -> 存储 -> OCR -> 响应的完整预处理流程。
同步接口，P95 < 5s。OCR 超时降级返回"仅存储成功、OCR 跳过"。

边界：不涉及视频任务创建，仅完成预处理并返回结构化结果。
"""

from __future__ import annotations

import asyncio
import io
import struct
from typing import Any

from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.logging import get_logger
from app.features.video.providers.image_storage import ImageStorage, LocalImageStorage
from app.features.video.providers.ocr import MockOcrProvider, OcrProvider, OcrResult
from app.shared.task_framework.status import TaskErrorCode

logger = get_logger("video.preprocess")

# ── 常量 ──────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES: frozenset[str] = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})

MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB

OCR_TIMEOUT_SECONDS: float = 3.0

LOW_CONFIDENCE_THRESHOLD: float = 0.6


# ── 异常 ──────────────────────────────────────────────────────────

class ImageValidationError(AppError):
    """图片校验失败异常。"""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(
            code=code,
            message=message,
            status_code=422,
            retryable=False,
            details=details,
        )


# ── 响应模型 ──────────────────────────────────────────────────────

class PreprocessResponse(BaseModel):
    """预处理结果。"""
    image_ref: str
    ocr_text: str | None = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    format: str
    suggestions: list[str] = Field(default_factory=list)


# ── 图片校验 ──────────────────────────────────────────────────────

def validate_file_type(content_type: str | None) -> str:
    """校验文件 MIME 类型。

    Args:
        content_type: 文件的 Content-Type。

    Returns:
        规范化后的 MIME 类型。

    Raises:
        ImageValidationError: 不支持的文件类型。
    """
    normalized = (content_type or "").lower().strip()
    if normalized not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_FILE_TYPE_INVALID,
            message=f"不支持的文件类型: {content_type}，仅支持 JPG/PNG/WebP",
            details={"content_type": content_type, "allowed": list(ALLOWED_MIME_TYPES)},
        )
    return normalized


def validate_file_size(file_bytes: bytes) -> None:
    """校验文件大小。

    Args:
        file_bytes: 文件二进制数据。

    Raises:
        ImageValidationError: 文件超过 10MB 限制。
    """
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_FILE_TOO_LARGE,
            message=f"文件大小 {size_mb}MB 超过 10MB 限制",
            details={"size_bytes": len(file_bytes), "max_bytes": MAX_FILE_SIZE_BYTES},
        )


def validate_file_empty(file_bytes: bytes) -> None:
    """校验文件非空。

    Args:
        file_bytes: 文件二进制数据。

    Raises:
        ImageValidationError: 文件为空。
    """
    if not file_bytes:
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
            message="上传的文件为空",
        )


class ImageMetadata(BaseModel):
    """图片元数据。"""
    width: int
    height: int
    format: str


def extract_image_metadata(file_bytes: bytes, content_type: str) -> ImageMetadata:
    """从图片数据中提取元数据（宽高、格式）。

    尝试解析图片头部信息获取尺寸，不依赖 Pillow 等重量级库。
    如果解析失败则认为图片不可读。

    Args:
        file_bytes: 图片二进制数据。
        content_type: MIME 类型。

    Returns:
        图片元数据。

    Raises:
        ImageValidationError: 图片无法解码。
    """
    try:
        if content_type == "image/png":
            return _parse_png_metadata(file_bytes)
        if content_type in ("image/jpeg", "image/jpg"):
            return _parse_jpeg_metadata(file_bytes)
        if content_type == "image/webp":
            return _parse_webp_metadata(file_bytes)
    except ImageValidationError:
        raise
    except Exception as exc:
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
            message="图片文件无法解码，请确认文件完整性",
            details={"reason": str(exc)},
        ) from exc

    raise ImageValidationError(
        code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
        message="无法解析图片元数据",
    )


def _parse_png_metadata(file_bytes: bytes) -> ImageMetadata:
    """解析 PNG 图片头部获取宽高。"""
    if len(file_bytes) < 24 or file_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
            message="无效的 PNG 文件格式",
        )
    width, height = struct.unpack(">II", file_bytes[16:24])
    return ImageMetadata(width=width, height=height, format="png")


def _parse_jpeg_metadata(file_bytes: bytes) -> ImageMetadata:
    """解析 JPEG 图片头部获取宽高。"""
    if len(file_bytes) < 2 or file_bytes[:2] != b"\xff\xd8":
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
            message="无效的 JPEG 文件格式",
        )
    stream = io.BytesIO(file_bytes)
    stream.seek(2)
    while True:
        marker_bytes = stream.read(2)
        if len(marker_bytes) < 2:
            break
        marker = struct.unpack(">H", marker_bytes)[0]
        if 0xFFC0 <= marker <= 0xFFC3:
            stream.read(3)  # skip length + precision
            height, width = struct.unpack(">HH", stream.read(4))
            return ImageMetadata(width=width, height=height, format="jpeg")
        length_bytes = stream.read(2)
        if len(length_bytes) < 2:
            break
        length = struct.unpack(">H", length_bytes)[0]
        stream.seek(length - 2, 1)
    raise ImageValidationError(
        code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
        message="无法从 JPEG 文件中提取尺寸信息",
    )


def _parse_webp_metadata(file_bytes: bytes) -> ImageMetadata:
    """解析 WebP 图片头部获取宽高。"""
    if len(file_bytes) < 30 or file_bytes[:4] != b"RIFF" or file_bytes[8:12] != b"WEBP":
        raise ImageValidationError(
            code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
            message="无效的 WebP 文件格式",
        )
    chunk_type = file_bytes[12:16]
    if chunk_type == b"VP8 ":
        if len(file_bytes) < 30:
            raise ImageValidationError(
                code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
                message="WebP VP8 数据不完整",
            )
        width = (file_bytes[26] | (file_bytes[27] << 8)) & 0x3FFF
        height = (file_bytes[28] | (file_bytes[29] << 8)) & 0x3FFF
        return ImageMetadata(width=width, height=height, format="webp")
    if chunk_type == b"VP8L":
        if len(file_bytes) < 25:
            raise ImageValidationError(
                code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
                message="WebP VP8L 数据不完整",
            )
        bits = struct.unpack("<I", file_bytes[21:25])[0]
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return ImageMetadata(width=width, height=height, format="webp")
    if chunk_type == b"VP8X":
        if len(file_bytes) < 30:
            raise ImageValidationError(
                code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
                message="WebP VP8X 数据不完整",
            )
        width = 1 + (file_bytes[24] | (file_bytes[25] << 8) | (file_bytes[26] << 16))
        height = 1 + (file_bytes[27] | (file_bytes[28] << 8) | (file_bytes[29] << 16))
        return ImageMetadata(width=width, height=height, format="webp")
    raise ImageValidationError(
        code=TaskErrorCode.VIDEO_IMAGE_UNREADABLE,
        message=f"不支持的 WebP 子格式: {chunk_type!r}",
    )


# ── 预处理服务 ────────────────────────────────────────────────────

class PreprocessService:
    """图片预处理服务。

    编排校验 -> 存储 -> OCR -> 响应的完整流程。
    """

    def __init__(
        self,
        *,
        image_storage: ImageStorage | None = None,
        ocr_provider: OcrProvider | None = None,
        ocr_timeout: float = OCR_TIMEOUT_SECONDS,
    ) -> None:
        self._image_storage = image_storage or LocalImageStorage()
        self._ocr_provider = ocr_provider or MockOcrProvider()
        self._ocr_timeout = ocr_timeout

    async def preprocess(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str | None,
    ) -> PreprocessResponse:
        """执行图片预处理流程。

        流程：校验 -> 提取元数据 -> 存储 -> OCR -> 组装响应。

        Args:
            file_bytes: 图片二进制数据。
            filename: 原始文件名。
            content_type: MIME 类型。

        Returns:
            预处理结果。

        Raises:
            ImageValidationError: 校验失败。
            AppError: 存储失败。
        """
        # 1. 校验
        validated_content_type = validate_file_type(content_type)
        validate_file_size(file_bytes)
        validate_file_empty(file_bytes)

        # 2. 提取元数据（同时校验可解码性）
        metadata = extract_image_metadata(file_bytes, validated_content_type)

        # 3. 存储
        try:
            storage_result = await self._image_storage.upload(
                file_bytes, filename, validated_content_type,
            )
        except Exception as exc:
            logger.error("Image storage failed: %s", exc)
            raise AppError(
                code=TaskErrorCode.VIDEO_STORAGE_FAILED,
                message="图片存储失败，请稍后重试",
                status_code=500,
                retryable=True,
                details={"reason": str(exc)},
            ) from exc

        # 4. OCR（带超时降级）
        ocr_result = await self._run_ocr_with_timeout(
            file_bytes, storage_result.image_ref,
        )

        # 5. 组装响应
        suggestions = self._build_suggestions(ocr_result)

        return PreprocessResponse(
            image_ref=storage_result.image_ref,
            ocr_text=ocr_result.text if ocr_result.text else None,
            confidence=ocr_result.confidence,
            width=metadata.width,
            height=metadata.height,
            format=metadata.format,
            suggestions=suggestions,
        )

    async def _run_ocr_with_timeout(
        self,
        image_data: bytes,
        image_ref: str,
    ) -> OcrResult:
        """带超时降级的 OCR 执行。

        超时时返回"仅存储成功、OCR 跳过"的降级结果，不阻断整体流程。
        """
        try:
            result = await asyncio.wait_for(
                self._ocr_provider.recognize(image_data, image_ref),
                timeout=self._ocr_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "OCR timed out after %.1fs: ref=%s",
                self._ocr_timeout,
                image_ref,
            )
            return OcrResult(
                text=None,
                confidence=0.0,
                timed_out=True,
                raw={"provider": self._ocr_provider.provider_name, "timeout": True},
            )
        except Exception as exc:
            logger.error("OCR failed: ref=%s error=%s", image_ref, exc)
            return OcrResult(
                text=None,
                confidence=0.0,
                error=str(exc),
                raw={"provider": self._ocr_provider.provider_name, "error": str(exc)},
            )

        return result

    @staticmethod
    def _build_suggestions(ocr_result: OcrResult) -> list[str]:
        """基于 OCR 结果构建用户建议列表。"""
        suggestions: list[str] = []

        if ocr_result.timed_out:
            suggestions.append("OCR 识别超时，图片已成功存储；建议手动输入题目文本")
            return suggestions

        if ocr_result.error:
            suggestions.append("OCR 识别失败，图片已成功存储；建议手动输入题目文本")
            return suggestions

        if not ocr_result.text or ocr_result.text.strip() == "":
            suggestions.append("未能从图片中识别到文字，建议手动输入题目文本")
            return suggestions

        if ocr_result.confidence < LOW_CONFIDENCE_THRESHOLD:
            suggestions.append(
                f"OCR 识别置信度较低（{ocr_result.confidence:.0%}），建议核对识别结果并补充修正"
            )

        return suggestions
