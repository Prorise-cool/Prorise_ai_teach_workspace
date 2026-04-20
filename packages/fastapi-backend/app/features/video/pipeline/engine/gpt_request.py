"""LLM Bridge — routes all API calls through OpenAI Python SDK.

照抄 ManimCat 的 OpenAI SDK 使用模式：
- 用官方 openai SDK 替代原生 httpx
- SDK 管理 SSE 解析、连接池、重试
- create_chat_completion_text 处理 stream → partial → non-stream fallback
"""
from __future__ import annotations

import base64
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any

from app.core.config import get_settings

# Re-export for backward compatibility
from app.providers.llm.openai_client_factory import (  # noqa: F401
    ProviderEndpoint,
    endpoint_from_provider,
)

from app.features.video.pipeline.engine.openai_stream import create_chat_completion_text
from app.providers.llm.openai_client_factory import client_from_endpoint

logger = logging.getLogger(__name__)
STREAM_MAX_INPUT_CHARS_DISABLED = 0


def _estimate_message_chars(payload: Any) -> int:
    """Estimate total payload size to decide whether stream setup is worth the risk."""

    if isinstance(payload, str):
        return len(payload)
    if isinstance(payload, list):
        return sum(_estimate_message_chars(item) for item in payload)
    if isinstance(payload, dict):
        return sum(_estimate_message_chars(value) for value in payload.values())
    return 0


def _should_prefer_stream(messages: list[dict[str, Any]]) -> tuple[bool, int]:
    """Skip stream for oversized payloads that are likely to 524 before first chunk."""

    estimated_chars = _estimate_message_chars(messages)
    max_input_chars = get_settings().video_llm_stream_max_input_chars
    if max_input_chars <= STREAM_MAX_INPUT_CHARS_DISABLED:
        return True, estimated_chars
    return estimated_chars <= max_input_chars, estimated_chars


# ---------------------------------------------------------------------------
# OpenAI-compatible response objects (Code2Video extracts .choices[0].message.content)
# ---------------------------------------------------------------------------


@dataclass
class _Message:
    content: str


@dataclass
class _Choice:
    message: _Message
    finish_reason: str = "stop"


@dataclass
class _Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class Completion:
    """OpenAI-compatible completion response for Code2Video compatibility."""

    choices: list[_Choice] = field(default_factory=list)
    usage: _Usage | None = None
    model: str = ""


def _build_completion(
    content: str, usage_data: dict | None = None, model: str = ""
) -> Completion:
    return Completion(
        choices=[_Choice(message=_Message(content=content))],
        usage=_Usage(**(usage_data or {})),
        model=model,
    )


# ---------------------------------------------------------------------------
# Core LLM call — uses OpenAI SDK
# ---------------------------------------------------------------------------


def _call_openai_compatible(
    ep: ProviderEndpoint,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int | None = None,
    max_completion_tokens: int | None = None,
    temperature: float | None = None,
    max_retries: int = 3,
    timeout_override: float | None = None,
) -> tuple[Completion | None, dict[str, int]]:
    """SDK-based LLM call with retry（照抄 ManimCat 模式：stream first → fallback）。

    每次重试创建新 client（不复用坏连接）。
    照抄 ManimCat buildTokenParams: max_completion_tokens = thinkingTokens + maxTokens。
    """
    usage_info: dict[str, int] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    prefer_stream, estimated_chars = _should_prefer_stream(messages)

    # DeepSeek deepseek-chat max_tokens 上限 8192
    capped_max_tokens = max_tokens
    if capped_max_tokens is not None and "deepseek" in ep.model_name.lower():
        capped_max_tokens = min(capped_max_tokens, 8192)

    for attempt in range(1, max_retries + 1):
        try:
            # 每次重试创建新 client — 避免复用坏连接
            client = client_from_endpoint(ep)

            logger.debug(
                "LLM request  model=%s  max_tokens=%d  capped=%d  max_completion_tokens=%s  attempt=%d  prefer_stream=%s  estimated_chars=%d",
                ep.model_name, max_tokens, capped_max_tokens, max_completion_tokens, attempt, prefer_stream, estimated_chars,
            )

            result = create_chat_completion_text(
                client,
                messages,
                ep.model_name,
                max_tokens=capped_max_tokens,
                max_completion_tokens=max_completion_tokens,
                temperature=temperature,
                fallback_to_non_stream=True,
                allow_partial_on_stream_error=True,
                prefer_stream=prefer_stream,
            )

            if result.usage:
                usage_info.update(result.usage)

            if result.content is not None and result.content.strip():
                return _build_completion(result.content, usage_info, ep.model_name), usage_info

            logger.warning("Attempt %d returned empty content (mode=%s)", attempt, result.mode)
            if attempt >= max_retries:
                return None, usage_info
            delay = (2 ** attempt) * 0.1 + random.random() * 0.1
            time.sleep(delay)

        except Exception as e:
            logger.error("LLM attempt %d/%d failed: %s", attempt, max_retries, e)
            if attempt >= max_retries:
                return None, usage_info
            delay = (2 ** attempt) * 0.1 + random.random() * 0.1
            time.sleep(delay)

    return None, usage_info


# ---------------------------------------------------------------------------
# LLM Bridge
# ---------------------------------------------------------------------------


class LLMBridge:
    """Bridges Code2Video's sync API calls to our Provider config."""

    def __init__(self) -> None:
        self._endpoints: dict[str, ProviderEndpoint] = {}
        self._default: ProviderEndpoint | None = None

    def register_stage(self, stage: str, endpoint: ProviderEndpoint) -> None:
        self._endpoints[stage] = endpoint
        if self._default is None:
            self._default = endpoint

    def set_default(self, endpoint: ProviderEndpoint) -> None:
        self._default = endpoint

    def endpoint_for(self, stage: str | None = None) -> ProviderEndpoint:
        if stage and stage in self._endpoints:
            return self._endpoints[stage]
        if self._default:
            return self._default
        raise RuntimeError("No LLM endpoint configured. Call register_stage() first.")

    # -- Code2Video-compatible API factory methods --

    def text_api(self, stage: str | None = None):
        """Return a text API compatible with prompt-only and prebuilt message payloads."""
        ep = self.endpoint_for(stage)

        def fn(
            prompt_or_messages: str | list[dict[str, Any]],
            max_tokens: int = 12_000,
            max_retries: int = 3,
            *,
            max_completion_tokens: int | None = None,
            temperature: float | None = None,
        ):
            if isinstance(prompt_or_messages, list):
                messages = prompt_or_messages
            else:
                messages = [{"role": "user", "content": prompt_or_messages}]
            return _call_openai_compatible(
                ep, messages,
                max_tokens=max_tokens,
                max_completion_tokens=max_completion_tokens,
                temperature=temperature,
                max_retries=max_retries,
            )

        return fn

    def video_img_api(self, stage: str | None = None):
        """Return ``(prompt, video_path, image_path, ...) -> (Completion, usage_info)``."""
        ep = self.endpoint_for(stage)

        def fn(
            prompt: str,
            video_path: str,
            image_path: str,
            log_id: str | None = None,
            max_tokens: int = 10_000,
            max_retries: int = 3,
        ):
            import os

            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video not found: {video_path}")
            with open(video_path, "rb") as f:
                video_b64 = base64.b64encode(f.read()).decode("utf-8")

            if not os.path.isfile(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            with open(image_path, "rb") as f:
                image_b64 = base64.b64encode(f.read()).decode("utf-8")

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:video/mp4;base64,{video_b64}",
                                "detail": "high",
                            },
                            "media_type": "video/mp4",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_b64}",
                                "detail": "high",
                            },
                            "media_type": "image/png",
                        },
                    ],
                }
            ]
            return _call_openai_compatible(
                ep,
                messages,
                max_tokens=max_tokens,
                max_retries=max_retries,
                timeout_override=300,
            )

        return fn

    def video_api(self, stage: str | None = None):
        """Return ``(prompt, video_path, ...) -> Completion``  (video-only, no image)."""
        ep = self.endpoint_for(stage)

        def fn(
            prompt: str,
            video_path: str,
            log_id: str | None = None,
            max_tokens: int = 10_000,
            max_retries: int = 3,
        ):
            import os

            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video not found: {video_path}")
            with open(video_path, "rb") as f:
                video_b64 = base64.b64encode(f.read()).decode("utf-8")

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:video/mp4;base64,{video_b64}",
                                "detail": "high",
                            },
                            "media_type": "video/mp4",
                        },
                    ],
                }
            ]
            completion, _ = _call_openai_compatible(
                ep,
                messages,
                max_tokens=max_tokens,
                max_retries=max_retries,
                timeout_override=300,
            )
            return completion

        return fn

    def image_api(self, stage: str | None = None):
        """Return ``(prompt, image_path, ...) -> Completion``  (image+text)."""
        ep = self.endpoint_for(stage)

        def fn(
            prompt: str,
            image_path: str | None = None,
            log_id: str | None = None,
            max_tokens: int = 1000,
            max_retries: int = 3,
        ):
            import os

            if image_path and os.path.isfile(image_path):
                with open(image_path, "rb") as f:
                    image_b64 = base64.b64encode(f.read()).decode("utf-8")
                content = [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                ]
            else:
                content = prompt
            messages = [{"role": "user", "content": content}]
            completion, _ = _call_openai_compatible(
                ep,
                messages,
                max_tokens=max_tokens,
                max_retries=max_retries,
            )
            return completion

        return fn


# ---------------------------------------------------------------------------
# Module-level bridge singleton (configured by orchestrator)
# ---------------------------------------------------------------------------

_bridge: LLMBridge | None = None


def configure_bridge(bridge: LLMBridge) -> None:
    """Set the module-level bridge. Called by orchestrator before creating agents."""
    global _bridge
    _bridge = bridge


def get_bridge() -> LLMBridge:
    if _bridge is None:
        raise RuntimeError("LLMBridge not configured. Call configure_bridge() first.")
    return _bridge


# ---------------------------------------------------------------------------
# Code2Video-compatible global functions (imported by agent.py / eval_aes.py)
# ---------------------------------------------------------------------------


def generate_log_id() -> str:
    """Generate a log ID with 'tkb' prefix and current timestamp."""
    return f"tkb{int(time.time() * 1000)}"


def request_gemini_video_img(
    prompt: str,
    video_path: str,
    image_path: str,
    log_id: str | None = None,
    max_tokens: int = 10_000,
    max_retries: int = 3,
):
    """Multimodal: video + reference image + text -> (Completion, usage)."""
    return get_bridge().video_img_api("mllm_feedback")(
        prompt, video_path, image_path, log_id, max_tokens, max_retries,
    )


def request_gemini_with_video(
    prompt: str,
    video_path: str,
    log_id: str | None = None,
    max_tokens: int = 10_000,
    max_retries: int = 3,
):
    """Video-only analysis -> Completion."""
    return get_bridge().video_api("mllm_feedback")(
        prompt, video_path, log_id, max_tokens, max_retries,
    )
