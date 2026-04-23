"""LearningService.fetch_quiz_history 单元测试（TASK-005）。"""
from __future__ import annotations

import asyncio

import httpx
import pytest

from app.core.errors import IntegrationError
from app.features.learning.service import LearningService
from app.shared.ruoyi.client import RuoYiClient


def _client_factory_from_handler(handler):
    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    return client_factory


def test_fetch_quiz_history_calls_correct_endpoint_and_returns_dict() -> None:
    captured_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_paths.append(request.url.path)
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "quizId": "quiz_xyz",
                    "questionTotal": 2,
                    "correctTotal": 1,
                    "score": 50,
                    "items": [],
                },
            },
        )

    service = LearningService(client_factory=_client_factory_from_handler(handler))
    result = asyncio.run(service.fetch_quiz_history("quiz_xyz", "student-001"))

    assert captured_paths == ["/internal/xiaomai/learning/results/quiz/quiz_xyz"]
    assert isinstance(result, dict)
    assert result["quizId"] == "quiz_xyz"
    assert result["questionTotal"] == 2


def test_fetch_quiz_history_returns_none_on_404() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"code": 404, "msg": "not found"})

    service = LearningService(client_factory=_client_factory_from_handler(handler))
    result = asyncio.run(service.fetch_quiz_history("quiz_missing", "student-001"))
    assert result is None


def test_fetch_quiz_history_raises_503_when_ruoyi_down() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"code": 500, "msg": "boom"})

    service = LearningService(client_factory=_client_factory_from_handler(handler))
    with pytest.raises(IntegrationError) as exc_info:
        asyncio.run(service.fetch_quiz_history("quiz_err", "student-001"))

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "QUIZ_HISTORY_UPSTREAM_UNAVAILABLE"
    assert exc_info.value.retryable is True
