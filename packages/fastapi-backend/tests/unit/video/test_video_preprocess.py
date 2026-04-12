from __future__ import annotations

import asyncio
import io
import struct

import pytest

from app.core.errors import AppError
from app.features.video.models.preprocess import VideoPreprocessResult
from app.features.video.providers.image_storage import ImageStorage, ImageStorageResult
from app.features.video.providers.ocr import OcrProvider, OcrResult
from app.features.video.service.preprocess import (
    MAX_FILE_SIZE_BYTES,
    ImageValidationError,
    PreprocessService,
    extract_image_metadata,
    normalize_preprocess_environment,
    validate_file_empty,
    validate_file_size,
    validate_file_type,
)


def _make_png(width: int = 100, height: int = 80) -> bytes:
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    buffer = bytearray(b"\x89PNG\r\n\x1a\n")
    buffer += struct.pack(">I", 13)
    buffer += b"IHDR"
    buffer += ihdr_data
    buffer += b"\x00" * 4
    buffer += struct.pack(">I", 0) + b"IEND" + b"\x00" * 4
    return bytes(buffer)


def _make_jpeg(width: int = 200, height: int = 150) -> bytes:
    buffer = bytearray(b"\xff\xd8")
    buffer += b"\xff\xc0"
    buffer += struct.pack(">H", 11)
    buffer += struct.pack("B", 8)
    buffer += struct.pack(">HH", height, width)
    buffer += struct.pack("B", 1)
    buffer += b"\x01\x11\x00"
    buffer += b"\xff\xd9"
    return bytes(buffer)


class InMemoryImageStorage(ImageStorage):
    def __init__(self) -> None:
        self.records: dict[str, bytes] = {}

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        image_ref = f"local://test/{filename}"
        self.records[image_ref] = file_bytes
        return ImageStorageResult(image_ref=image_ref, relative_path=f"test/{filename}")

    async def delete(self, image_ref: str) -> bool:
        return self.records.pop(image_ref, None) is not None


class FixedOcrProvider(OcrProvider):
    def __init__(self, result: OcrResult) -> None:
        self._result = result

    @property
    def provider_name(self) -> str:
        return "fixed-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        return self._result


class SlowOcrProvider(OcrProvider):
    @property
    def provider_name(self) -> str:
        return "slow-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        await asyncio.sleep(10)
        return OcrResult(text="should-not-reach", confidence=1)


class FailingImageStorage(ImageStorage):
    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        raise RuntimeError("disk full")

    async def delete(self, image_ref: str) -> bool:
        return False


def test_validate_file_type_accepts_supported_images() -> None:
    assert validate_file_type("image/jpeg") == "image/jpeg"
    assert validate_file_type("image/png") == "image/png"
    assert validate_file_type("image/webp") == "image/webp"


def test_validate_file_type_rejects_unsupported_images() -> None:
    with pytest.raises(ImageValidationError) as exc_info:
        validate_file_type("image/gif")

    assert exc_info.value.code == "VIDEO_IMAGE_FORMAT_INVALID"


def test_validate_file_size_rejects_oversized_file() -> None:
    with pytest.raises(ImageValidationError) as exc_info:
        validate_file_size(b"x" * (MAX_FILE_SIZE_BYTES + 1))

    assert exc_info.value.code == "VIDEO_IMAGE_TOO_LARGE"


def test_validate_file_empty_rejects_empty_bytes() -> None:
    with pytest.raises(ImageValidationError) as exc_info:
        validate_file_empty(b"")

    assert exc_info.value.code == "VIDEO_IMAGE_UNREADABLE"


def test_extract_image_metadata_reads_png_and_jpeg() -> None:
    png = extract_image_metadata(_make_png(640, 480), "image/png")
    jpeg = extract_image_metadata(_make_jpeg(800, 600), "image/jpeg")

    assert png.width == 640
    assert png.height == 480
    assert png.format == "png"
    assert jpeg.width == 800
    assert jpeg.height == 600
    assert jpeg.format == "jpeg"


def test_preprocess_returns_success_result() -> None:
    service = PreprocessService(
        image_storage=InMemoryImageStorage(),
        ocr_provider=FixedOcrProvider(OcrResult(text="一道数学题", confidence=0.93)),
    )

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(640, 480),
            filename="normal.png",
            content_type="image/png",
        )
    )

    assert isinstance(result, VideoPreprocessResult)
    assert result.image_ref.startswith("local://")
    assert result.ocr_text == "一道数学题"
    assert result.confidence == 0.93
    assert result.error_code is None
    assert result.suggestions == []


def test_preprocess_returns_low_confidence_suggestions() -> None:
    service = PreprocessService(
        image_storage=InMemoryImageStorage(),
        ocr_provider=FixedOcrProvider(OcrResult(text="模糊结果", confidence=0.4)),
    )

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="low-confidence.png",
            content_type="image/png",
        )
    )

    assert result.error_code is None
    assert result.suggestions == ["OCR 识别置信度较低，建议核对识别结果并补充修正"]


def test_preprocess_returns_machine_readable_ocr_failure() -> None:
    service = PreprocessService(
        image_storage=InMemoryImageStorage(),
        ocr_provider=FixedOcrProvider(OcrResult(error="provider failed")),
    )

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="ocr-failed.png",
            content_type="image/png",
        )
    )

    assert result.image_ref.startswith("local://")
    assert result.error_code == "VIDEO_OCR_FAILED"
    assert result.suggestions == ["OCR 识别失败，建议手动输入题目文本"]


def test_preprocess_returns_machine_readable_timeout() -> None:
    service = PreprocessService(
        image_storage=InMemoryImageStorage(),
        ocr_provider=SlowOcrProvider(),
        ocr_timeout=0.01,
    )

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="ocr-timeout.png",
            content_type="image/png",
        )
    )

    assert result.image_ref.startswith("local://")
    assert result.error_code == "VIDEO_OCR_TIMEOUT"
    assert result.suggestions == ["OCR 识别超时，建议手动输入题目文本"]


def test_preprocess_raises_storage_failed_error() -> None:
    service = PreprocessService(
        image_storage=FailingImageStorage(),
        ocr_provider=FixedOcrProvider(OcrResult(text="ok", confidence=1)),
    )

    with pytest.raises(AppError) as exc_info:
        asyncio.run(
            service.preprocess(
                file_bytes=_make_png(),
                filename="storage-failed.png",
                content_type="image/png",
            )
        )

    assert exc_info.value.code == "VIDEO_STORAGE_FAILED"


def test_preprocess_normalizes_supported_environments() -> None:
    assert normalize_preprocess_environment("development") == "development"
    assert normalize_preprocess_environment("test") == "test"
    assert normalize_preprocess_environment("production") == "production"
    assert normalize_preprocess_environment("dev") == "development"
    assert normalize_preprocess_environment("testing") == "test"
    assert normalize_preprocess_environment("prod") == "production"


def test_preprocess_rejects_unknown_environment() -> None:
    with pytest.raises(AppError) as exc_info:
        normalize_preprocess_environment("staging")

    assert exc_info.value.code == "COMMON_INVALID_CONFIGURATION"


def test_preprocess_allows_default_fallback_providers_in_development() -> None:
    service = PreprocessService(environment="development")

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="default-development.png",
            content_type="image/png",
        )
    )

    assert result.image_ref.startswith("local://")


def test_preprocess_allows_default_fallback_providers_in_test() -> None:
    service = PreprocessService(environment="test")

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="default-test.png",
            content_type="image/png",
        )
    )

    assert result.image_ref.startswith("local://")


def test_preprocess_fails_fast_with_default_fallback_providers_in_production() -> None:
    with pytest.raises(AppError) as exc_info:
        PreprocessService(environment="production")

    assert exc_info.value.code == "COMMON_INVALID_CONFIGURATION"
    assert exc_info.value.details["environment"] == "production"
    assert exc_info.value.details["fallback_components"] == ["LocalImageStorage", "MockOcrProvider"]


def test_preprocess_allows_explicit_providers_in_production() -> None:
    service = PreprocessService(
        environment="production",
        image_storage=InMemoryImageStorage(),
        ocr_provider=FixedOcrProvider(OcrResult(text="生产 OCR", confidence=0.99)),
    )

    result = asyncio.run(
        service.preprocess(
            file_bytes=_make_png(),
            filename="production.png",
            content_type="image/png",
        )
    )

    assert result.image_ref.startswith("local://test/")
    assert result.ocr_text == "生产 OCR"
