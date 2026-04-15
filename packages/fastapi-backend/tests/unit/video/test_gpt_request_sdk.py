"""Tests for gpt_request.py SDK migration — LLMBridge still works after httpx→SDK swap."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.features.video.pipeline.engine.gpt_request import (
    Completion,
    LLMBridge,
    _call_openai_compatible,
    _build_completion,
)
from app.providers.llm.openai_client_factory import ProviderEndpoint


def _mock_ep(**overrides):
    defaults = {
        "base_url": "https://api.example.com/v1",
        "api_key": "sk-test-key",
        "model_name": "test-model",
        "timeout": 600.0,
    }
    defaults.update(overrides)
    return ProviderEndpoint(**defaults)


class TestBuildCompletion:
    def test_build_completion_basic(self):
        c = _build_completion("hello world", {"prompt_tokens": 1}, "test")
        assert isinstance(c, Completion)
        assert c.choices[0].message.content == "hello world"
        assert c.usage.prompt_tokens == 1
        assert c.model == "test"


class TestCallOpenaiCompatible:
    @patch("app.features.video.pipeline.engine.gpt_request.client_from_endpoint")
    @patch("app.features.video.pipeline.engine.gpt_request.create_chat_completion_text")
    def test_success(self, mock_stream_fn, mock_client_fn):
        """单次调用成功。"""
        mock_stream_fn.return_value = MagicMock(
            content="generated code", usage={"prompt_tokens": 10}, mode="stream",
        )
        result, usage = _call_openai_compatible(
            _mock_ep(),
            [{"role": "user", "content": "write manim code"}],
        )
        assert result is not None
        assert result.choices[0].message.content == "generated code"
        assert usage["prompt_tokens"] == 10

    @patch("app.features.video.pipeline.engine.gpt_request.client_from_endpoint")
    @patch("app.features.video.pipeline.engine.gpt_request.create_chat_completion_text")
    def test_retry_then_success(self, mock_stream_fn, mock_client_fn):
        """第1次返回空，第2次成功。"""
        mock_stream_fn.side_effect = [
            MagicMock(content=None, usage={}, mode="stream-error"),
            MagicMock(content="success", usage={"prompt_tokens": 5}, mode="stream"),
        ]
        result, usage = _call_openai_compatible(
            _mock_ep(),
            [{"role": "user", "content": "test"}],
            max_retries=3,
        )
        assert result is not None
        assert result.choices[0].message.content == "success"

    @patch("app.features.video.pipeline.engine.gpt_request.client_from_endpoint")
    @patch("app.features.video.pipeline.engine.gpt_request.create_chat_completion_text")
    def test_all_retries_fail_returns_none(self, mock_stream_fn, mock_client_fn):
        """3次全挂 → 返回 (None, usage)。"""
        mock_stream_fn.return_value = MagicMock(
            content=None, usage={}, mode="stream-error",
        )
        result, usage = _call_openai_compatible(
            _mock_ep(),
            [{"role": "user", "content": "test"}],
            max_retries=3,
        )
        assert result is None
        assert mock_stream_fn.call_count == 3


class TestLLMBridge:
    def test_text_api_success(self):
        bridge = LLMBridge()
        ep = _mock_ep()
        bridge.register_stage("manim_gen", ep)

        api_fn = bridge.text_api("manim_gen")
        assert callable(api_fn)

    def test_register_and_default(self):
        bridge = LLMBridge()
        ep = _mock_ep()
        bridge.register_stage("test", ep)
        assert bridge.endpoint_for("test") == ep
        assert bridge.endpoint_for() == ep  # default

    def test_no_endpoint_raises(self):
        bridge = LLMBridge()
        with pytest.raises(RuntimeError, match="No LLM endpoint"):
            bridge.endpoint_for("missing")
