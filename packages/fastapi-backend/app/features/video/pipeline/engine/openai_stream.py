"""create_chat_completion_text — ManimCat openai-stream.ts Python equivalent.

照抄 ManimCat 的 createChatCompletionText:
- Stream first → partial recovery → non-stream fallback
- Idle timeout detection (240s)
- Heartbeat logging (15s)
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field

from openai import OpenAI

logger = logging.getLogger(__name__)

STREAM_HEARTBEAT_MS = 15_000  # 照抄 ManimCat
STREAM_IDLE_TIMEOUT_MS = 240_000  # 照抄 ManimCat


@dataclass
class ChatCompletionTextResult:
    """照抄 ManimCat ChatCompletionTextResult。"""

    content: str | None
    usage: dict[str, int] = field(default_factory=dict)
    mode: str = "stream"  # "stream" | "stream-partial" | "non-stream" | "stream-error"


def create_chat_completion_text(
    client: OpenAI,
    messages: list[dict],
    model: str,
    max_tokens: int = 12_000,
    *,
    fallback_to_non_stream: bool = True,
    allow_partial_on_stream_error: bool = True,
    idle_timeout_ms: int = STREAM_IDLE_TIMEOUT_MS,
    usage_label: str = "chat-completion",
) -> ChatCompletionTextResult:
    """照抄 ManimCat openai-stream.ts createChatCompletionText。

    策略：stream first → partial recovery → non-stream fallback。
    """
    started_at = time.monotonic()
    empty_usage: dict[str, int] = {}

    content = ""
    usage: dict[str, int] = {}
    received_content = False
    chunk_count = 0

    try:
        # Stream first
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
            stream_options={"include_usage": True},
        )

        # Idle timeout detection
        last_chunk_at = time.monotonic()
        abort_flag = threading.Event()

        def _idle_check():
            while not abort_flag.is_set():
                abort_flag.wait(timeout=min(5.0, idle_timeout_ms / 4000.0))
                if abort_flag.is_set():
                    return
                if time.monotonic() - last_chunk_at > idle_timeout_ms / 1000.0:
                    logger.warning(
                        "Stream idle timeout (%dms), aborting", idle_timeout_ms,
                    )
                    try:
                        stream.close()  # type: ignore[attr-defined]
                    except Exception:
                        pass
                    return

        idle_thread = threading.Thread(target=_idle_check, daemon=True)
        idle_thread.start()

        try:
            for chunk in stream:
                chunk_count += 1
                last_chunk_at = time.monotonic()

                chunk_usage = getattr(chunk, "usage", None)
                if chunk_usage:
                    usage = {
                        "prompt_tokens": getattr(chunk_usage, "prompt_tokens", 0) or 0,
                        "completion_tokens": getattr(chunk_usage, "completion_tokens", 0) or 0,
                        "total_tokens": getattr(chunk_usage, "total_tokens", 0) or 0,
                    }

                delta_content = chunk.choices[0].delta.content if chunk.choices else None
                if delta_content:
                    content += delta_content
                    received_content = True
        finally:
            abort_flag.set()
            idle_thread.join(timeout=1.0)

        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        logger.info(
            "Stream completed  model=%s  mode=stream  chunks=%d  content_len=%d  elapsed=%dms",
            model, chunk_count, len(content), elapsed_ms,
        )
        return ChatCompletionTextResult(
            content=content.strip() or None,
            usage=usage,
            mode="stream",
        )

    except Exception as e:
        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        logger.warning(
            "Stream failed  model=%s  elapsed=%dms  chunks=%d  received=%s  error=%s",
            model, elapsed_ms, chunk_count, received_content, e,
        )

        # Partial content recovery（照抄 ManimCat allowPartialOnStreamError）
        if allow_partial_on_stream_error and received_content:
            partial = content.strip()
            if partial:
                logger.warning(
                    "Returning partial streamed content  model=%s  len=%d",
                    model, len(partial),
                )
                return ChatCompletionTextResult(
                    content=partial,
                    usage=usage,
                    mode="stream-partial",
                )

        # Non-stream fallback（照抄 ManimCat fallbackToNonStream）
        if fallback_to_non_stream:
            logger.warning("Falling back to non-stream  model=%s", model)
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    stream=False,
                )
                fallback_content = response.choices[0].message.content if response.choices else None
                ns_usage = {}
                if response.usage:
                    ns_usage = {
                        "prompt_tokens": response.usage.prompt_tokens or 0,
                        "completion_tokens": response.usage.completion_tokens or 0,
                        "total_tokens": response.usage.total_tokens or 0,
                    }
                logger.info(
                    "Non-stream fallback success  model=%s  mode=non-stream  content_len=%d",
                    model, len(fallback_content or ""),
                )
                return ChatCompletionTextResult(
                    content=fallback_content.strip() if fallback_content else None,
                    usage=ns_usage,
                    mode="non-stream",
                )
            except Exception as fallback_exc:
                logger.error(
                    "Non-stream fallback also failed  model=%s  error=%s",
                    model, fallback_exc,
                )
                return ChatCompletionTextResult(
                    content=None,
                    usage=empty_usage,
                    mode="stream-error",
                )

        return ChatCompletionTextResult(
            content=None,
            usage=empty_usage,
            mode="stream-error",
        )
