"""Tests for OpenAI SDK error handling in http_utils."""

from unittest.mock import MagicMock

import httpx
import pytest
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)

from app.providers.http_utils import handle_openai_request_error


def _mock_response(status_code: int = 401) -> httpx.Response:
    """创建一个最小的 httpx.Response 用于构造 SDK 异常。"""
    request = httpx.Request("POST", "https://api.example.com/v1/chat/completions")
    return httpx.Response(status_code=status_code, request=request)


class TestHandleOpenaiRequestError:
    def test_handle_api_timeout_error(self):
        exc = APITimeoutError(request=None)
        with pytest.raises(TimeoutError, match="timed out"):
            handle_openai_request_error("test-provider", exc)

    def test_handle_api_connection_error(self):
        exc = APIConnectionError(request=None)
        with pytest.raises(ConnectionError, match="connection failed"):
            handle_openai_request_error("test-provider", exc)

    def test_handle_authentication_error(self):
        exc = AuthenticationError(
            message="invalid api key",
            response=_mock_response(401),
            body=None,
        )
        with pytest.raises(ValueError, match="authentication"):
            handle_openai_request_error("test-provider", exc)

    def test_handle_rate_limit_error(self):
        exc = RateLimitError(
            message="rate limit exceeded",
            response=_mock_response(429),
            body=None,
        )
        with pytest.raises(ConnectionError, match="rate limit"):
            handle_openai_request_error("test-provider", exc)

    def test_handle_unknown_error_reraise(self):
        exc = RuntimeError("something unexpected")
        with pytest.raises(RuntimeError, match="something unexpected"):
            handle_openai_request_error("test-provider", exc)
