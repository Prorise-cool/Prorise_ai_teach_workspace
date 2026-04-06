"""Video feature providers: 图片存储与 OCR 识别的抽象层与实现。"""

from app.features.video.providers.image_storage import (
    CosImageStorage,
    ImageStorage,
    ImageStorageResult,
    LocalImageStorage,
)
from app.features.video.providers.ocr import (
    MockOcrProvider,
    OcrProvider,
    OcrResult,
)

__all__ = [
    "CosImageStorage",
    "ImageStorage",
    "ImageStorageResult",
    "LocalImageStorage",
    "MockOcrProvider",
    "OcrProvider",
    "OcrResult",
]
