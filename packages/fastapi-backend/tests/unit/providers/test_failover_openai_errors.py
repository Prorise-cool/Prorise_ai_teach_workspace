"""Tests for OpenAI SDK error classification in failover."""

import httpx
import pytest
from openai import (
    APIConnectionError,
    AuthenticationError,
    RateLimitError,
)

from app.providers.failover import classify_provider_error
from app.shared.task_framework.status import TaskErrorCode


def _mock_response(status_code: int = 401) -> httpx.Response:
    request = httpx.Request("POST", "https://api.example.com/v1/chat/completions")
    return httpx.Response(status_code=status_code, request=request)


class TestClassifyOpenaiErrors:
    def test_classify_rate_limit_error(self):
        exc = RateLimitError(message="429 too many requests", response=_mock_response(429), body=None)
        result = classify_provider_error(exc)
        assert result.retryable is True
        assert result.mark_unhealthy is False
        assert result.error_code == TaskErrorCode.PROVIDER_UNAVAILABLE

    def test_classify_authentication_error(self):
        exc = AuthenticationError(
            message="invalid api key", response=_mock_response(401), body=None,
        )
        result = classify_provider_error(exc)
        assert result.retryable is False
        assert result.mark_unhealthy is False
        assert result.error_code == TaskErrorCode.INVALID_INPUT

    def test_classify_api_connection_error(self):
        exc = APIConnectionError(request=None)
        result = classify_provider_error(exc)
        assert result.retryable is True
        assert result.mark_unhealthy is True
        assert result.error_code == TaskErrorCode.PROVIDER_UNAVAILABLE
