"""OCR 识别抽象层与实现。

职责：提供统一的 OCR 识别接口，MVP 阶段使用 MockOcrProvider
模拟腾讯云 OCR 响应，真实 Provider 后续接入。

边界：仅负责图片文字识别，不涉及存储或校验。
"""

from __future__ import annotations

import asyncio
import hashlib
import random
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from app.core.logging import get_logger

logger = get_logger("video.ocr")


class OcrResult(BaseModel):
    """OCR 识别结果。"""
    text: str | None = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    raw: dict[str, Any] = Field(default_factory=dict)
    timed_out: bool = False
    error: str | None = None


class OcrProvider(ABC):
    """OCR 识别抽象接口。"""

    @abstractmethod
    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        """对图片进行 OCR 识别。

        Args:
            image_data: 图片二进制数据。
            image_ref: 图片存储引用（用于日志追踪）。

        Returns:
            OCR 识别结果。
        """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider 名称标识。"""


class MockOcrProvider(OcrProvider):
    """模拟 OCR Provider，用于 MVP 阶段开发与测试。

    基于图片数据的哈希值确定性地生成不同的 OCR 结果场景，
    包括：正常识别、低置信度、空结果。可通过 force_scenario
    参数强制指定场景。
    """

    # 模拟延迟范围（秒）
    _MIN_DELAY: float = 0.1
    _MAX_DELAY: float = 0.5

    # 模拟 OCR 场景
    SCENARIO_NORMAL = "normal"
    SCENARIO_LOW_CONFIDENCE = "low_confidence"
    SCENARIO_EMPTY = "empty"
    SCENARIO_TIMEOUT = "timeout"
    SCENARIO_FAILED = "failed"

    def __init__(
        self,
        *,
        force_scenario: str | None = None,
        timeout_seconds: float = 3.0,
    ) -> None:
        self._force_scenario = force_scenario
        self._timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "mock-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        scenario = self._force_scenario or self._determine_scenario(image_data)
        logger.info(
            "MockOcrProvider.recognize: ref=%s scenario=%s",
            image_ref,
            scenario,
        )

        # 模拟处理延迟
        delay = random.uniform(self._MIN_DELAY, self._MAX_DELAY)
        await asyncio.sleep(delay)

        if scenario == self.SCENARIO_TIMEOUT:
            return OcrResult(
                text=None,
                confidence=0.0,
                timed_out=True,
                raw={"provider": "mock-ocr", "scenario": "timeout"},
            )

        if scenario == self.SCENARIO_FAILED:
            return OcrResult(
                text=None,
                confidence=0.0,
                error="Mock OCR provider simulated failure",
                raw={"provider": "mock-ocr", "scenario": "failed"},
            )

        if scenario == self.SCENARIO_EMPTY:
            return OcrResult(
                text="",
                confidence=0.0,
                raw={"provider": "mock-ocr", "scenario": "empty"},
            )

        if scenario == self.SCENARIO_LOW_CONFIDENCE:
            return OcrResult(
                text="已知 f(x) = x² + 2x + 1\n求 f(3) 的值",
                confidence=0.45,
                raw={
                    "provider": "mock-ocr",
                    "scenario": "low_confidence",
                    "words_result_num": 2,
                },
            )

        # 正常识别场景
        return OcrResult(
            text="已知函数 f(x) = 2x³ - 3x² + 1\n(1) 求 f(x) 的单调递增区间\n(2) 求 f(x) 在 [0, 2] 上的最大值和最小值",
            confidence=0.92,
            raw={
                "provider": "mock-ocr",
                "scenario": "normal",
                "words_result_num": 3,
            },
        )

    @staticmethod
    def _determine_scenario(image_data: bytes) -> str:
        """基于图片数据哈希确定性地选择模拟场景。"""
        digest = hashlib.md5(image_data).hexdigest()  # noqa: S324
        bucket = int(digest[:2], 16) % 100

        if bucket < 60:
            return MockOcrProvider.SCENARIO_NORMAL
        if bucket < 80:
            return MockOcrProvider.SCENARIO_LOW_CONFIDENCE
        if bucket < 90:
            return MockOcrProvider.SCENARIO_EMPTY
        if bucket < 95:
            return MockOcrProvider.SCENARIO_TIMEOUT
        return MockOcrProvider.SCENARIO_FAILED
