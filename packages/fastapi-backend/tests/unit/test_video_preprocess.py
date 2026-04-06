"""Story 3.3: 图片/OCR 前置预处理接口单元测试。

覆盖：
- 图片类型校验（JPG/PNG/WebP 通过，GIF/BMP/PDF 拒绝）
- 图片大小校验（>10MB 拒绝）
- 图片空文件校验
- 图片可解码校验（PNG/JPEG/WebP 头部解析）
- OCR 正常识别路径
- OCR 低置信度路径
- OCR 空结果路径
- OCR 超时降级路径
- OCR 失败路径
- 存储引用格式校验
- 预处理响应 schema 一致性
"""

from __future__ import annotations

import asyncio
import io
import struct
from unittest.mock import AsyncMock

import pytest

from app.features.video.providers.image_storage import (
    ImageStorage,
    ImageStorageResult,
    LocalImageStorage,
)
from app.features.video.providers.ocr import (
    MockOcrProvider,
    OcrProvider,
    OcrResult,
)
from app.features.video.services.preprocess import (
    ALLOWED_MIME_TYPES,
    LOW_CONFIDENCE_THRESHOLD,
    MAX_FILE_SIZE_BYTES,
    ImageValidationError,
    PreprocessResponse,
    PreprocessService,
    extract_image_metadata,
    validate_file_size,
    validate_file_type,
    validate_file_empty,
)
from app.shared.task_framework.status import TaskErrorCode


# ── 测试用图片数据生成 ─────────────────────────────────────────────

def _make_png(width: int = 100, height: int = 80) -> bytes:
    """生成最小有效 PNG 数据（仅 IHDR）。"""
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = b"IHDR" + ihdr_data
    # 简化：仅头部和 IHDR chunk 的前部分
    buf = bytearray(b"\x89PNG\r\n\x1a\n")
    # IHDR chunk: length(4) + type(4) + data(13) + crc(4)
    buf += struct.pack(">I", 13)  # IHDR data length
    buf += ihdr_chunk
    buf += b"\x00" * 4  # fake CRC
    # IEND
    buf += struct.pack(">I", 0) + b"IEND" + b"\x00" * 4
    return bytes(buf)


def _make_jpeg(width: int = 200, height: int = 150) -> bytes:
    """生成最小有效 JPEG 数据（SOI + SOF0 marker）。"""
    buf = bytearray(b"\xff\xd8")  # SOI
    # SOF0 marker
    buf += b"\xff\xc0"
    sof_length = 8 + 3  # length=11
    buf += struct.pack(">H", sof_length)
    buf += struct.pack("B", 8)  # precision
    buf += struct.pack(">HH", height, width)
    buf += struct.pack("B", 1)  # num components
    buf += b"\x01\x11\x00"  # component
    buf += b"\xff\xd9"  # EOI
    return bytes(buf)


def _make_webp_vp8(width: int = 320, height: int = 240) -> bytes:
    """生成最小有效 WebP VP8 数据。

    VP8 bitstream 格式：
    - offset 12: chunk type "VP8 "
    - offset 16: chunk size (little-endian)
    - offset 20+3: frame tag (3 bytes)
    - offset 20+3: sync code 0x9d012a
    - offset 26: width (2 bytes LE, lower 14 bits)
    - offset 28: height (2 bytes LE, lower 14 bits)
    """
    buf = bytearray(b"RIFF")
    buf += struct.pack("<I", 0)  # placeholder file size
    buf += b"WEBP"
    buf += b"VP8 "
    # VP8 bitstream: frame_tag (3 bytes) + sync_code (3 bytes) + width (2) + height (2) + padding
    vp8_data = bytearray(14)
    # frame tag: keyframe, version=0, show_frame=1
    vp8_data[0] = 0x9d  # sync byte 1 (part of sync code at offset 3 in chunk data)
    vp8_data[1] = 0x01
    vp8_data[2] = 0x2a
    # But VP8 actual layout for RIFF container is:
    # bytes 0-2: frame tag
    # bytes 3-5: sync code 0x9d 0x01 0x2a
    # bytes 6-7: width (LE, 14 bit)
    # bytes 8-9: height (LE, 14 bit)
    # Let's place them correctly
    vp8_data[0] = 0x00  # frame tag byte 0
    vp8_data[1] = 0x00  # frame tag byte 1
    vp8_data[2] = 0x00  # frame tag byte 2
    vp8_data[3] = 0x9d  # sync code
    vp8_data[4] = 0x01
    vp8_data[5] = 0x2a
    vp8_data[6] = width & 0xFF
    vp8_data[7] = (width >> 8) & 0x3F
    vp8_data[8] = height & 0xFF
    vp8_data[9] = (height >> 8) & 0x3F

    chunk_size = len(vp8_data)
    buf += struct.pack("<I", chunk_size)
    buf += vp8_data
    # fixup RIFF size
    struct.pack_into("<I", buf, 4, len(buf) - 8)
    return bytes(buf)


# ── 文件类型校验测试 ───────────────────────────────────────────────

class TestValidateFileType:
    """文件类型校验。"""

    @pytest.mark.parametrize("mime", ["image/jpeg", "image/png", "image/webp"])
    def test_allowed_types_pass(self, mime: str) -> None:
        assert validate_file_type(mime) == mime

    @pytest.mark.parametrize("mime", [
        "image/gif",
        "image/bmp",
        "application/pdf",
        "text/plain",
        "video/mp4",
        "",
        None,
    ])
    def test_disallowed_types_rejected(self, mime: str | None) -> None:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_file_type(mime)
        assert exc_info.value.code == TaskErrorCode.VIDEO_FILE_TYPE_INVALID
        assert exc_info.value.status_code == 422


# ── 文件大小校验测试 ───────────────────────────────────────────────

class TestValidateFileSize:
    """文件大小校验。"""

    def test_within_limit_passes(self) -> None:
        data = b"x" * (MAX_FILE_SIZE_BYTES - 1)
        validate_file_size(data)  # should not raise

    def test_exactly_at_limit_passes(self) -> None:
        data = b"x" * MAX_FILE_SIZE_BYTES
        validate_file_size(data)  # should not raise

    def test_over_limit_rejected(self) -> None:
        data = b"x" * (MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(ImageValidationError) as exc_info:
            validate_file_size(data)
        assert exc_info.value.code == TaskErrorCode.VIDEO_FILE_TOO_LARGE
        assert exc_info.value.status_code == 422


# ── 文件空校验测试 ─────────────────────────────────────────────────

class TestValidateFileEmpty:
    """文件空校验。"""

    def test_non_empty_passes(self) -> None:
        validate_file_empty(b"some data")

    def test_empty_rejected(self) -> None:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_file_empty(b"")
        assert exc_info.value.code == TaskErrorCode.VIDEO_IMAGE_UNREADABLE


# ── 图片元数据提取测试 ─────────────────────────────────────────────

class TestExtractImageMetadata:
    """图片元数据提取（可解码校验）。"""

    def test_png_metadata(self) -> None:
        data = _make_png(640, 480)
        meta = extract_image_metadata(data, "image/png")
        assert meta.width == 640
        assert meta.height == 480
        assert meta.format == "png"

    def test_jpeg_metadata(self) -> None:
        data = _make_jpeg(800, 600)
        meta = extract_image_metadata(data, "image/jpeg")
        assert meta.width == 800
        assert meta.height == 600
        assert meta.format == "jpeg"

    def test_webp_metadata(self) -> None:
        data = _make_webp_vp8(320, 240)
        meta = extract_image_metadata(data, "image/webp")
        assert meta.width == 320
        assert meta.height == 240
        assert meta.format == "webp"

    def test_invalid_png_rejected(self) -> None:
        with pytest.raises(ImageValidationError) as exc_info:
            extract_image_metadata(b"not a png", "image/png")
        assert exc_info.value.code == TaskErrorCode.VIDEO_IMAGE_UNREADABLE

    def test_invalid_jpeg_rejected(self) -> None:
        with pytest.raises(ImageValidationError) as exc_info:
            extract_image_metadata(b"not a jpeg", "image/jpeg")
        assert exc_info.value.code == TaskErrorCode.VIDEO_IMAGE_UNREADABLE

    def test_truncated_png_rejected(self) -> None:
        short_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 5
        with pytest.raises(ImageValidationError) as exc_info:
            extract_image_metadata(short_png, "image/png")
        assert exc_info.value.code == TaskErrorCode.VIDEO_IMAGE_UNREADABLE


# ── Mock 存储 ──────────────────────────────────────────────────────

class InMemoryImageStorage(ImageStorage):
    """内存图片存储，用于测试。"""

    def __init__(self) -> None:
        self.stored: dict[str, bytes] = {}

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        ref = f"local://test/{filename}"
        self.stored[ref] = file_bytes
        return ImageStorageResult(image_ref=ref, relative_path=f"test/{filename}")

    async def delete(self, image_ref: str) -> bool:
        return self.stored.pop(image_ref, None) is not None


class FailingImageStorage(ImageStorage):
    """始终失败的图片存储。"""

    async def upload(self, file_bytes: bytes, filename: str, content_type: str) -> ImageStorageResult:
        raise RuntimeError("Disk full")

    async def delete(self, image_ref: str) -> bool:
        return False


# ── Mock OCR Providers ─────────────────────────────────────────────

class FixedOcrProvider(OcrProvider):
    """固定返回指定结果的 OCR Provider。"""

    def __init__(self, result: OcrResult) -> None:
        self._result = result

    @property
    def provider_name(self) -> str:
        return "fixed-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        return self._result


class SlowOcrProvider(OcrProvider):
    """模拟超时的 OCR Provider。"""

    def __init__(self, delay: float = 10.0) -> None:
        self._delay = delay

    @property
    def provider_name(self) -> str:
        return "slow-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        await asyncio.sleep(self._delay)
        return OcrResult(text="should not reach", confidence=1.0)


class ErrorOcrProvider(OcrProvider):
    """始终抛异常的 OCR Provider。"""

    @property
    def provider_name(self) -> str:
        return "error-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        raise ConnectionError("OCR service unavailable")


# ── 预处理服务完整路径测试 ─────────────────────────────────────────

class TestPreprocessServiceNormalPath:
    """OCR 正常识别路径。"""

    @pytest.mark.asyncio
    async def test_normal_ocr_success(self) -> None:
        png_data = _make_png(640, 480)
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(
                OcrResult(text="f(x) = x^2", confidence=0.95)
            ),
        )
        result = await service.preprocess(png_data, "test.png", "image/png")
        assert isinstance(result, PreprocessResponse)
        assert result.image_ref.startswith("local://")
        assert result.ocr_text == "f(x) = x^2"
        assert result.confidence == 0.95
        assert result.width == 640
        assert result.height == 480
        assert result.format == "png"
        assert result.suggestions == []


class TestPreprocessServiceLowConfidence:
    """OCR 低置信度路径。"""

    @pytest.mark.asyncio
    async def test_low_confidence_suggestions(self) -> None:
        png_data = _make_png(100, 80)
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(
                OcrResult(text="模糊文本", confidence=0.3)
            ),
        )
        result = await service.preprocess(png_data, "blurry.png", "image/png")
        assert result.confidence == 0.3
        assert result.confidence < LOW_CONFIDENCE_THRESHOLD
        assert len(result.suggestions) > 0
        assert any("置信度" in s for s in result.suggestions)
        # imageRef 仍然有效
        assert result.image_ref.startswith("local://")


class TestPreprocessServiceOcrEmpty:
    """OCR 空结果路径。"""

    @pytest.mark.asyncio
    async def test_empty_ocr_result(self) -> None:
        png_data = _make_png(100, 80)
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(
                OcrResult(text="", confidence=0.0)
            ),
        )
        result = await service.preprocess(png_data, "blank.png", "image/png")
        assert result.ocr_text is None
        assert result.confidence == 0.0
        assert len(result.suggestions) > 0
        assert any("识别到文字" in s for s in result.suggestions)
        # imageRef 仍然有效
        assert result.image_ref.startswith("local://")


class TestPreprocessServiceOcrTimeout:
    """OCR 超时降级路径。"""

    @pytest.mark.asyncio
    async def test_ocr_timeout_degrades_gracefully(self) -> None:
        png_data = _make_png(100, 80)
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=SlowOcrProvider(delay=10.0),
            ocr_timeout=0.1,  # 极短超时
        )
        result = await service.preprocess(png_data, "slow.png", "image/png")
        # 不应整体失败
        assert result.image_ref.startswith("local://")
        assert result.ocr_text is None
        assert result.confidence == 0.0
        assert any("超时" in s for s in result.suggestions)


class TestPreprocessServiceOcrFailed:
    """OCR 失败但存储成功路径。"""

    @pytest.mark.asyncio
    async def test_ocr_error_degrades_gracefully(self) -> None:
        png_data = _make_png(100, 80)
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=ErrorOcrProvider(),
        )
        result = await service.preprocess(png_data, "error.png", "image/png")
        # 存储成功，imageRef 有效
        assert result.image_ref.startswith("local://")
        assert result.ocr_text is None
        assert result.confidence == 0.0
        assert any("失败" in s for s in result.suggestions)


class TestPreprocessServiceStorageFailed:
    """存储失败路径。"""

    @pytest.mark.asyncio
    async def test_storage_failure_raises(self) -> None:
        png_data = _make_png(100, 80)
        service = PreprocessService(
            image_storage=FailingImageStorage(),
            ocr_provider=FixedOcrProvider(OcrResult(text="ok", confidence=1.0)),
        )
        from app.core.errors import AppError
        with pytest.raises(AppError) as exc_info:
            await service.preprocess(png_data, "fail.png", "image/png")
        assert exc_info.value.code == TaskErrorCode.VIDEO_STORAGE_FAILED


class TestPreprocessServiceValidation:
    """校验层拦截测试。"""

    @pytest.mark.asyncio
    async def test_invalid_type_rejected(self) -> None:
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(OcrResult()),
        )
        with pytest.raises(ImageValidationError) as exc_info:
            await service.preprocess(b"fake", "test.gif", "image/gif")
        assert exc_info.value.code == TaskErrorCode.VIDEO_FILE_TYPE_INVALID

    @pytest.mark.asyncio
    async def test_oversized_file_rejected(self) -> None:
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(OcrResult()),
        )
        big_data = b"x" * (MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(ImageValidationError) as exc_info:
            await service.preprocess(big_data, "big.png", "image/png")
        assert exc_info.value.code == TaskErrorCode.VIDEO_FILE_TOO_LARGE

    @pytest.mark.asyncio
    async def test_empty_file_rejected(self) -> None:
        service = PreprocessService(
            image_storage=InMemoryImageStorage(),
            ocr_provider=FixedOcrProvider(OcrResult()),
        )
        with pytest.raises(ImageValidationError) as exc_info:
            await service.preprocess(b"", "empty.png", "image/png")
        assert exc_info.value.code == TaskErrorCode.VIDEO_IMAGE_UNREADABLE


class TestImageRefFormat:
    """存储引用格式校验。"""

    @pytest.mark.asyncio
    async def test_local_ref_format(self) -> None:
        png_data = _make_png()
        storage = LocalImageStorage(base_dir="/tmp/test_uploads")
        result = await storage.upload(png_data, "test.png", "image/png")
        assert result.image_ref.startswith("local://")
        assert "/" in result.relative_path
        # cleanup
        import os
        full_path = f"/tmp/test_uploads/{result.relative_path}"
        if os.path.exists(full_path):
            os.unlink(full_path)


class TestMockOcrProvider:
    """MockOcrProvider 场景覆盖。"""

    @pytest.mark.asyncio
    async def test_normal_scenario(self) -> None:
        provider = MockOcrProvider(force_scenario=MockOcrProvider.SCENARIO_NORMAL)
        result = await provider.recognize(b"data", "ref")
        assert result.text is not None
        assert result.confidence > LOW_CONFIDENCE_THRESHOLD
        assert not result.timed_out
        assert result.error is None

    @pytest.mark.asyncio
    async def test_low_confidence_scenario(self) -> None:
        provider = MockOcrProvider(force_scenario=MockOcrProvider.SCENARIO_LOW_CONFIDENCE)
        result = await provider.recognize(b"data", "ref")
        assert result.text is not None
        assert result.confidence < LOW_CONFIDENCE_THRESHOLD

    @pytest.mark.asyncio
    async def test_empty_scenario(self) -> None:
        provider = MockOcrProvider(force_scenario=MockOcrProvider.SCENARIO_EMPTY)
        result = await provider.recognize(b"data", "ref")
        assert result.text == ""
        assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_timeout_scenario(self) -> None:
        provider = MockOcrProvider(force_scenario=MockOcrProvider.SCENARIO_TIMEOUT)
        result = await provider.recognize(b"data", "ref")
        assert result.timed_out is True
        assert result.text is None

    @pytest.mark.asyncio
    async def test_failed_scenario(self) -> None:
        provider = MockOcrProvider(force_scenario=MockOcrProvider.SCENARIO_FAILED)
        result = await provider.recognize(b"data", "ref")
        assert result.error is not None
        assert result.text is None
