"""Tests for create_chat_completion_text — ManimCat openai-stream.ts equivalent."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.features.video.pipeline.engine.openai_stream import (
    ChatCompletionTextResult,
    create_chat_completion_text,
)


def _mock_chunk(content: str | None = None, usage: MagicMock | None = None):
    """创建一个 mock stream chunk with proper attribute access。"""
    chunk = MagicMock()
    chunk.choices = [MagicMock()]
    chunk.choices[0].delta.content = content
    chunk.usage = usage
    return chunk


class TestStreamSuccess:
    def test_full_stream(self):
        client = MagicMock()
        chunks = [
            _mock_chunk(content="Hello"),
            _mock_chunk(content=" world"),
            _mock_chunk(usage=MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)),
        ]
        client.chat.completions.create.return_value = iter(chunks)

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
        )
        assert isinstance(result, ChatCompletionTextResult)
        assert result.content == "Hello world"
        assert result.mode == "stream"
        assert result.usage["total_tokens"] == 15

    def test_empty_chunks_produce_none_content(self):
        client = MagicMock()
        client.chat.completions.create.return_value = iter([
            _mock_chunk(content=None),
        ])

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
        )
        assert result.content is None
        assert result.mode == "stream"


class _FailAfterNChunks:
    """迭代器：返回 N 个 chunk 后抛异常。"""

    def __init__(self, chunks, fail_at):
        self._chunks = chunks
        self._fail_at = fail_at

    def __iter__(self):
        for i, chunk in enumerate(self._chunks):
            if i == self._fail_at:
                raise RuntimeError("stream broke")
            yield chunk


class TestStreamPartialRecovery:
    def test_partial_on_stream_error(self):
        """Stream 中途报错但已有 chunks → mode='stream-partial'。"""
        client = MagicMock()
        chunks = [_mock_chunk(content="partial"), _mock_chunk(content=" code")]
        # fail_at=1: 返回 chunk[0] 后，在取 chunk[1] 时抛异常
        client.chat.completions.create.return_value = _FailAfterNChunks(chunks, fail_at=1)

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
            allow_partial_on_stream_error=True,
        )
        assert result.content == "partial"  # 只有 chunk[0] 被消费，chunk[1] 时报错
        assert result.mode == "stream-partial"

    def test_no_partial_recovery(self):
        """allow_partial_on_stream_error=False → 不返回部分内容。"""
        client = MagicMock()
        chunks = [_mock_chunk(content="partial"), _mock_chunk(content=" more")]
        client.chat.completions.create.return_value = _FailAfterNChunks(chunks, fail_at=1)

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
            allow_partial_on_stream_error=False,
            fallback_to_non_stream=False,
        )
        assert result.content is None
        assert result.mode == "stream-error"


class TestStreamFallback:
    def test_prefer_stream_false_goes_direct_non_stream(self):
        """大 payload 可直接 non-stream，避免先建 stream。"""
        client = MagicMock()
        non_stream_resp = MagicMock()
        non_stream_resp.choices = [MagicMock()]
        non_stream_resp.choices[0].message.content = "direct result"
        non_stream_resp.usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)
        client.chat.completions.create.return_value = non_stream_resp

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
            prefer_stream=False,
        )
        assert result.content == "direct result"
        assert result.mode == "non-stream"
        calls = client.chat.completions.create.call_args_list
        assert len(calls) == 1
        assert calls[0].kwargs.get("stream") is False

    def test_stream_fails_fallback_non_stream(self):
        """Stream 完全失败 → fallback 到 non-stream。"""
        client = MagicMock()

        # 第1次调用 stream 抛异常，第2次 non-stream 返回结果
        non_stream_resp = MagicMock()
        non_stream_resp.choices = [MagicMock()]
        non_stream_resp.choices[0].message.content = "fallback result"
        non_stream_resp.usage = MagicMock(prompt_tokens=10, completion_tokens=5, total_tokens=15)

        client.chat.completions.create.side_effect = [
            RuntimeError("stream failed"),
            non_stream_resp,
        ]

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
            fallback_to_non_stream=True,
        )
        assert result.content == "fallback result"
        assert result.mode == "non-stream"
        # 验证第2次调用是 stream=False
        calls = client.chat.completions.create.call_args_list
        assert calls[1].kwargs.get("stream") is False

    def test_stream_fails_no_fallback(self):
        """Stream 失败 + fallback_to_non_stream=False → stream-error。"""
        client = MagicMock()
        client.chat.completions.create.side_effect = RuntimeError("stream failed")

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
            fallback_to_non_stream=False,
        )
        assert result.content is None
        assert result.mode == "stream-error"


class TestUsageTracking:
    def test_usage_from_last_chunk(self):
        client = MagicMock()
        chunks = [
            _mock_chunk(content="hello"),
            _mock_chunk(
                content=" world",
                usage=MagicMock(prompt_tokens=20, completion_tokens=10, total_tokens=30),
            ),
        ]
        client.chat.completions.create.return_value = iter(chunks)

        result = create_chat_completion_text(
            client,
            messages=[{"role": "user", "content": "hi"}],
            model="test-model",
        )
        assert result.usage["prompt_tokens"] == 20
        assert result.usage["completion_tokens"] == 10
        assert result.usage["total_tokens"] == 30
