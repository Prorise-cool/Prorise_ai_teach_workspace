"""视频图片 OCR Provider 抽象。"""

from __future__ import annotations

import asyncio
import hashlib
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class OcrResult(BaseModel):
    text: str | None = None
    confidence: float = Field(ge=0, le=1, default=0)
    raw: dict[str, Any] = Field(default_factory=dict)
    timed_out: bool = False
    error: str | None = None


class OcrProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        raise NotImplementedError


class MockOcrProvider(OcrProvider):
    SCENARIO_NORMAL = "normal"
    SCENARIO_LOW_CONFIDENCE = "low_confidence"
    SCENARIO_EMPTY = "empty"
    SCENARIO_TIMEOUT = "timeout"
    SCENARIO_FAILED = "failed"

    def __init__(self, *, force_scenario: str | None = None) -> None:
        self._force_scenario = force_scenario

    @property
    def provider_name(self) -> str:
        return "mock-ocr"

    async def recognize(self, image_data: bytes, image_ref: str) -> OcrResult:
        scenario = self._force_scenario or self._determine_scenario(image_data)

        if scenario == self.SCENARIO_TIMEOUT:
            await asyncio.sleep(5)
            return OcrResult()

        await asyncio.sleep(0.05)

        if scenario == self.SCENARIO_FAILED:
            return OcrResult(
                error="Mock OCR provider simulated failure",
                raw={"provider": self.provider_name, "scenario": scenario},
            )

        if scenario == self.SCENARIO_EMPTY:
            return OcrResult(
                text="",
                confidence=0,
                raw={"provider": self.provider_name, "scenario": scenario},
            )

        if scenario == self.SCENARIO_LOW_CONFIDENCE:
            return OcrResult(
                text="已知 f(x)=x²+2x+1，求 f(3)",
                confidence=0.45,
                raw={"provider": self.provider_name, "scenario": scenario},
            )

        return OcrResult(
            text="已知函数 f(x) = 2x³ - 3x² + 1，求其单调区间。",
            confidence=0.92,
            raw={"provider": self.provider_name, "scenario": self.SCENARIO_NORMAL},
        )

    @staticmethod
    def _determine_scenario(image_data: bytes) -> str:
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
