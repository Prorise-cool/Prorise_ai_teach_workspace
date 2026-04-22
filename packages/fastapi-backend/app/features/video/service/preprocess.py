"""视频图片预处理服务。"""

from __future__ import annotations

import asyncio
import io
import struct
from typing import Literal

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.features.video.pipeline.errors import VideoTaskErrorCode
from app.features.video.models.preprocess import VideoPreprocessResult
from app.features.video.providers.image_storage import ImageStorage, LocalImageStorage
from app.features.video.providers.ocr import MockOcrProvider, OcrProvider, OcrResult

logger = get_logger("app.features.video.preprocess")

ALLOWED_MIME_TYPES: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
OCR_TIMEOUT_SECONDS = 3.0
LOW_CONFIDENCE_THRESHOLD = 0.6
PREPROCESS_ENVIRONMENT_ALIASES: dict[str, Literal["development", "test", "production"]] = {
    "dev": "development",
    "development": "development",
    "local": "development",
    "test": "test",
    "testing": "test",
    "pytest": "test",
    "prod": "production",
    "production": "production",
}


class ImageValidationError(AppError):
    """图片校验失败异常。"""
    def __init__(self, code: str, message: str, *, details: dict[str, object] | None = None) -> None:
        """初始化预处理服务。"""
        super().__init__(
            code=code,
            message=message,
            status_code=422,
            retryable=False,
            details=details,
        )


class ImageMetadata(VideoPreprocessResult):
    """提取的图片元数据。"""
    image_ref: str = "local://placeholder"
    ocr_text: str | None = None
    confidence: float = 0
    suggestions: list[str] = []
    error_code: str | None = None


def validate_file_type(content_type: str | None) -> str:
    """校验文件 MIME 类型。"""
    normalized = (content_type or "").strip().lower()
    if normalized not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_FORMAT_INVALID.value,
            message="不支持的文件类型，仅支持 JPG、PNG、WebP",
            details={"content_type": content_type, "allowed": sorted(ALLOWED_MIME_TYPES)},
        )
    return normalized


def validate_file_size(file_bytes: bytes) -> None:
    """校验文件大小是否超限。"""
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_TOO_LARGE.value,
            message="图片大小不能超过 10MB",
            details={"size_bytes": len(file_bytes), "max_bytes": MAX_FILE_SIZE_BYTES},
        )


def validate_file_empty(file_bytes: bytes) -> None:
    """校验文件是否为空。"""
    if not file_bytes:
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
            message="上传的图片为空或无法读取",
        )


def extract_image_metadata(file_bytes: bytes, content_type: str) -> ImageMetadata:
    """从图片二进制数据中提取宽高和格式。"""
    try:
        if content_type == "image/png":
            width, height = _parse_png_metadata(file_bytes)
            return ImageMetadata(width=width, height=height, format="png")
        if content_type == "image/jpeg":
            width, height = _parse_jpeg_metadata(file_bytes)
            return ImageMetadata(width=width, height=height, format="jpeg")
        if content_type == "image/webp":
            width, height = _parse_webp_metadata(file_bytes)
            return ImageMetadata(width=width, height=height, format="webp")
    except ImageValidationError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
            message="图片文件无法解码，请确认文件完整性",
            details={"reason": str(exc)},
        ) from exc

    raise ImageValidationError(
        code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
        message="图片文件无法解码，请确认文件完整性",
    )


def _parse_png_metadata(file_bytes: bytes) -> tuple[int, int]:
    if len(file_bytes) < 24 or file_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
            message="无效的 PNG 文件格式",
        )
    return struct.unpack(">II", file_bytes[16:24])


def _parse_jpeg_metadata(file_bytes: bytes) -> tuple[int, int]:
    if len(file_bytes) < 2 or file_bytes[:2] != b"\xff\xd8":
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
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
            stream.read(3)
            height, width = struct.unpack(">HH", stream.read(4))
            return width, height
        length_bytes = stream.read(2)
        if len(length_bytes) < 2:
            break
        length = struct.unpack(">H", length_bytes)[0]
        stream.seek(length - 2, 1)

    raise ImageValidationError(
        code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
        message="无法从 JPEG 文件中提取尺寸信息",
    )


def _parse_webp_metadata(file_bytes: bytes) -> tuple[int, int]:
    if len(file_bytes) < 30 or file_bytes[:4] != b"RIFF" or file_bytes[8:12] != b"WEBP":
        raise ImageValidationError(
            code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
            message="无效的 WebP 文件格式",
        )

    chunk_type = file_bytes[12:16]
    if chunk_type == b"VP8 ":
        width = (file_bytes[26] | (file_bytes[27] << 8)) & 0x3FFF
        height = (file_bytes[28] | (file_bytes[29] << 8)) & 0x3FFF
        return width, height
    if chunk_type == b"VP8L":
        bits = struct.unpack("<I", file_bytes[21:25])[0]
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk_type == b"VP8X":
        width = 1 + (file_bytes[24] | (file_bytes[25] << 8) | (file_bytes[26] << 16))
        height = 1 + (file_bytes[27] | (file_bytes[28] << 8) | (file_bytes[29] << 16))
        return width, height

    raise ImageValidationError(
        code=VideoTaskErrorCode.VIDEO_IMAGE_UNREADABLE.value,
        message="不支持的 WebP 子格式",
    )


def normalize_preprocess_environment(environment: str | None) -> Literal["development", "test", "production"]:
    """标准化预处理运行环境，禁止模糊环境值静默落到默认分支。"""
    normalized = (environment or "").strip().lower()
    resolved = PREPROCESS_ENVIRONMENT_ALIASES.get(normalized)
    if resolved is None:
        raise AppError(
            code="COMMON_INVALID_CONFIGURATION",
            message="预处理环境配置无效，仅支持 development、test、production",
            status_code=500,
            retryable=False,
            details={"environment": environment},
        )
    return resolved


def validate_preprocess_provider_gate(
    *,
    environment: Literal["development", "test", "production"],
    image_storage: ImageStorage,
    ocr_provider: OcrProvider,
) -> None:
    """校验默认回退实现是否被错误地用于生产环境。"""
    if environment != "production":
        return

    fallback_components: list[str] = []
    if image_storage.is_development_fallback:
        fallback_components.append(type(image_storage).__name__)
    if ocr_provider.is_development_fallback:
        fallback_components.append(type(ocr_provider).__name__)

    if fallback_components:
        raise AppError(
            code="COMMON_INVALID_CONFIGURATION",
            message="生产环境未配置真实预处理 Provider，禁止回退到本地存储或 Mock OCR",
            status_code=500,
            retryable=False,
            details={
                "environment": environment,
                "fallback_components": fallback_components,
            },
        )


class PreprocessService:
    """视频图片预处理服务，编排校验、存储与 OCR。"""
    def __init__(
        self,
        *,
        image_storage: ImageStorage | None = None,
        ocr_provider: OcrProvider | None = None,
        ocr_timeout: float = OCR_TIMEOUT_SECONDS,
        environment: str | None = None,
    ) -> None:
        """初始化预处理服务。"""
        resolved_environment = normalize_preprocess_environment(environment or get_settings().environment)
        resolved_image_storage = image_storage or LocalImageStorage(
            base_dir=get_settings().video_image_storage_root
        )
        resolved_ocr_provider = ocr_provider or MockOcrProvider()

        validate_preprocess_provider_gate(
            environment=resolved_environment,
            image_storage=resolved_image_storage,
            ocr_provider=resolved_ocr_provider,
        )

        self._environment = resolved_environment
        self._image_storage = resolved_image_storage
        self._ocr_provider = resolved_ocr_provider
        self._ocr_timeout = ocr_timeout

    async def preprocess(
        self,
        *,
        file_bytes: bytes,
        filename: str,
        content_type: str | None,
    ) -> VideoPreprocessResult:
        """执行完整的图片预处理流程。"""
        normalized_content_type = validate_file_type(content_type)
        validate_file_size(file_bytes)
        validate_file_empty(file_bytes)
        image_metadata = extract_image_metadata(file_bytes, normalized_content_type)

        try:
            storage_result = await self._image_storage.upload(file_bytes, filename, normalized_content_type)
        except Exception as exc:  # noqa: BLE001
            logger.error("Video image storage failed filename=%s", filename, exc_info=exc)
            raise AppError(
                code=VideoTaskErrorCode.VIDEO_STORAGE_FAILED.value,
                message="图片存储失败，请稍后重试",
                status_code=500,
                retryable=True,
                details={"reason": str(exc)},
            ) from exc

        ocr_result = await self._run_ocr_with_timeout(file_bytes, storage_result.image_ref)
        error_code = self._resolve_ocr_error_code(ocr_result)

        return VideoPreprocessResult(
            image_ref=storage_result.image_ref,
            ocr_text=ocr_result.text or None,
            confidence=ocr_result.confidence,
            width=image_metadata.width,
            height=image_metadata.height,
            format=image_metadata.format,
            suggestions=self._build_suggestions(ocr_result),
            error_code=error_code.value if error_code is not None else None,
        )

    async def _run_ocr_with_timeout(self, image_data: bytes, image_ref: str) -> OcrResult:
        try:
            return await asyncio.wait_for(
                self._ocr_provider.recognize(image_data, image_ref),
                timeout=self._ocr_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning("Video OCR timed out image_ref=%s timeout=%s", image_ref, self._ocr_timeout)
            return OcrResult(timed_out=True, raw={"provider": self._ocr_provider.provider_name})
        except Exception as exc:  # noqa: BLE001
            logger.warning("Video OCR failed image_ref=%s", image_ref, exc_info=exc)
            return OcrResult(error=str(exc), raw={"provider": self._ocr_provider.provider_name})

    @staticmethod
    def _resolve_ocr_error_code(ocr_result: OcrResult) -> VideoTaskErrorCode | None:
        if ocr_result.timed_out:
            return VideoTaskErrorCode.VIDEO_OCR_TIMEOUT
        if ocr_result.error:
            return VideoTaskErrorCode.VIDEO_OCR_FAILED
        if not ocr_result.text or not ocr_result.text.strip():
            return VideoTaskErrorCode.VIDEO_OCR_EMPTY
        return None

    @staticmethod
    def _build_suggestions(ocr_result: OcrResult) -> list[str]:
        if ocr_result.timed_out:
            return ["OCR 识别超时，建议手动输入题目文本"]
        if ocr_result.error:
            return ["OCR 识别失败，建议手动输入题目文本"]
        if not ocr_result.text or not ocr_result.text.strip():
            return ["未能从图片中识别到文字，建议手动输入题目文本"]
        if ocr_result.confidence < LOW_CONFIDENCE_THRESHOLD:
            return ["OCR 识别置信度较低，建议核对识别结果并补充修正"]
        return []
