"""LearningCoachService.fetch_quiz_history 单元测试（TASK-005）。"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.errors import AppError, IntegrationError
from app.features.learning_coach.schemas import QuizHistoryPayload
from app.features.learning_coach.service import LearningCoachService


class _InMemoryRuntimeStore:
    def __init__(self) -> None:
        self._values: dict[str, Any] = {}

    def set_runtime_value(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None:
        self._values[key] = value

    def get_runtime_value(self, key: str) -> Any:
        return self._values.get(key)


def _make_service(persistence_stub: Any) -> LearningCoachService:
    return LearningCoachService(
        runtime_store=_InMemoryRuntimeStore(),
        persistence_service=persistence_stub,
        provider_chain=(),
    )


def test_fetch_quiz_history_returns_mapped_payload() -> None:
    persistence = AsyncMock()
    persistence.fetch_quiz_history = AsyncMock(
        return_value={
            "quizId": "quiz_abc",
            "sourceType": "video",
            "questionTotal": 2,
            "correctTotal": 1,
            "score": 50,
            "summary": "整体掌握良好",
            "occurredAt": "2026-04-20T10:00:00Z",
            "items": [
                {
                    "questionId": "q1",
                    "stem": "1+1=?",
                    "options": [
                        {"optionId": "A", "label": "A", "text": "1"},
                        {"optionId": "B", "label": "B", "text": "2"},
                    ],
                    "selectedOptionId": "A",
                    "correctOptionId": "B",
                    "isCorrect": False,
                    "explanation": "基本算术",
                },
                {
                    "questionId": "q2",
                    "stem": "2*2=?",
                    "options": [
                        {"optionId": "A", "label": "A", "text": "3"},
                        {"optionId": "B", "label": "B", "text": "4"},
                    ],
                    "selectedOptionId": "B",
                    "correctOptionId": "B",
                    "isCorrect": True,
                    "explanation": "乘法",
                },
            ],
        }
    )

    service = _make_service(persistence)
    payload = asyncio.run(
        service.fetch_quiz_history(quiz_id="quiz_abc", user_id="student-001")
    )

    assert isinstance(payload, QuizHistoryPayload)
    assert payload.quiz_id == "quiz_abc"
    assert payload.question_total == 2
    assert payload.correct_total == 1
    assert payload.score == 50
    assert payload.summary == "整体掌握良好"
    assert len(payload.items) == 2
    assert payload.items[0].question_id == "q1"
    assert payload.items[0].is_correct is False
    assert payload.items[0].correct_option_id == "B"
    assert payload.items[0].selected_option_id == "A"
    assert payload.items[0].options[1].text == "2"
    assert payload.items[1].is_correct is True
    assert payload.occurred_at is not None

    persistence.fetch_quiz_history.assert_awaited_once_with(
        "quiz_abc", "student-001", access_context=None
    )


def test_fetch_quiz_history_raises_404_when_missing() -> None:
    persistence = AsyncMock()
    persistence.fetch_quiz_history = AsyncMock(return_value=None)

    service = _make_service(persistence)
    with pytest.raises(AppError) as exc_info:
        asyncio.run(service.fetch_quiz_history(quiz_id="quiz_missing", user_id="u1"))

    assert exc_info.value.code == "QUIZ_HISTORY_NOT_FOUND"
    assert exc_info.value.status_code == 404


def test_fetch_quiz_history_propagates_ruoyi_503() -> None:
    persistence = AsyncMock()
    persistence.fetch_quiz_history = AsyncMock(
        side_effect=IntegrationError(
            service="ruoyi",
            resource="learning-result",
            operation="fetch-quiz-history",
            code="QUIZ_HISTORY_UPSTREAM_UNAVAILABLE",
            message="历史答卷暂时无法获取",
            status_code=503,
            retryable=True,
        )
    )

    service = _make_service(persistence)
    with pytest.raises(IntegrationError) as exc_info:
        asyncio.run(service.fetch_quiz_history(quiz_id="quiz_err", user_id="u1"))

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "QUIZ_HISTORY_UPSTREAM_UNAVAILABLE"
