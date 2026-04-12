"""Code2Video LLM bridge — routes all API calls through our Provider per-stage config.

Provides Code2Video-compatible sync API functions. The orchestrator calls
``configure_bridge()`` at startup with provider endpoints extracted from
our ``ProviderRuntimeResolver``.

Module-level functions (``request_gemini_video_img``, etc.) are used by
agent.py via ``from .gpt_request import *``.
"""

from __future__ import annotations

import base64
import logging
import os
import random
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)


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
# Provider endpoint config
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ProviderEndpoint:
    """Extracted provider endpoint config for sync HTTP calls."""

    base_url: str
    api_key: str
    model_name: str
    request_path: str = "/v1/chat/completions"
    timeout: float = 300.0
    extra_headers: dict[str, str] = field(default_factory=dict)


def endpoint_from_provider(provider: Any) -> ProviderEndpoint:
    """Extract ProviderEndpoint from an LLMProvider instance's config.settings."""
    settings = dict(provider.config.settings)
    return ProviderEndpoint(
        base_url=settings.get("base_url", ""),
        api_key=settings.get("api_key", ""),
        model_name=settings.get("model_name", ""),
        request_path=settings.get("request_path", "/v1/chat/completions"),
        timeout=max(provider.config.timeout_seconds, 300.0),  # Code2Video 代码生成需要至少 300s
        extra_headers=dict(settings.get("headers", {})),
    )


# ---------------------------------------------------------------------------
# LLM Bridge
# ---------------------------------------------------------------------------


def _call_openai_compatible(
    ep: ProviderEndpoint,
    messages: list[dict[str, Any]],
    *,
    max_tokens: int = 10000,
    max_retries: int = 3,
    timeout_override: float | None = None,
) -> tuple[Completion | None, dict[str, int]]:
    """Low-level sync OpenAI-compatible HTTP call with retry."""
    usage_info = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    headers = {
        "Authorization": f"Bearer {ep.api_key}",
        "Content-Type": "application/json",
        **ep.extra_headers,
    }
    timeout = timeout_override or ep.timeout

    for attempt in range(1, max_retries + 1):
        try:
            with httpx.Client(
                base_url=ep.base_url, timeout=timeout, headers=headers
            ) as client:
                payload = {
                    "model": ep.model_name,
                    "messages": messages,
                    "max_tokens": max_tokens,
                }
                response = client.post(ep.request_path, json=payload)
                response.raise_for_status()
                data = response.json()

            content = data["choices"][0]["message"]["content"]
            raw_usage = data.get("usage") or {}
            usage_info.update(
                {
                    k: raw_usage.get(k, 0)
                    for k in ("prompt_tokens", "completion_tokens", "total_tokens")
                }
            )
            return _build_completion(content, usage_info, ep.model_name), usage_info

        except Exception as e:
            if attempt >= max_retries:
                logger.error("LLM call failed after %d attempts: %s", max_retries, e)
                return None, usage_info
            delay = (2**attempt) * 0.1 + random.random() * 0.1
            logger.warning(
                "LLM attempt %d/%d failed: %s, retrying in %.2fs",
                attempt,
                max_retries,
                e,
                delay,
            )
            time.sleep(delay)

    return None, usage_info


class LLMBridge:
    """Bridges Code2Video's sync API calls to our Provider config.

    The orchestrator registers endpoints per stage, then passes
    ``bridge.text_api(stage)`` as ``RunConfig.api``.
    """

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
        """Return ``(prompt, max_tokens, max_retries) -> (Completion, usage_info)``."""
        ep = self.endpoint_for(stage)

        def fn(prompt: str, max_tokens: int = 10000, max_retries: int = 3):
            messages = [{"role": "user", "content": prompt}]
            return _call_openai_compatible(
                ep, messages, max_tokens=max_tokens, max_retries=max_retries
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
            max_tokens: int = 10000,
            max_retries: int = 3,
        ):
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
            max_tokens: int = 10000,
            max_retries: int = 3,
        ):
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
    max_tokens: int = 10000,
    max_retries: int = 3,
):
    """Multimodal: video + reference image + text → (Completion, usage)."""
    return get_bridge().video_img_api("mllm_feedback")(
        prompt,
        video_path,
        image_path,
        log_id,
        max_tokens,
        max_retries,
    )


def request_gemini_video_img_token(
    prompt: str,
    video_path: str,
    image_path: str,
    log_id: str | None = None,
    max_tokens: int = 10000,
    max_retries: int = 3,
):
    """Multimodal with token tracking (same as above, both return usage)."""
    return get_bridge().video_img_api("mllm_feedback")(
        prompt,
        video_path,
        image_path,
        log_id,
        max_tokens,
        max_retries,
    )


def request_gemini_with_video(
    prompt: str,
    video_path: str,
    log_id: str | None = None,
    max_tokens: int = 10000,
    max_retries: int = 3,
):
    """Video-only analysis → Completion."""
    return get_bridge().video_api("mllm_feedback")(
        prompt,
        video_path,
        log_id,
        max_tokens,
        max_retries,
    )


def request_gpt41_token(
    prompt: str,
    log_id: str | None = None,
    max_tokens: int = 1000,
    max_retries: int = 3,
):
    """Text generation (used by external_assets.py) → (Completion, usage)."""
    return get_bridge().text_api()(prompt, max_tokens, max_retries)


def request_gpt41_img(
    prompt: str,
    image_path: str | None = None,
    log_id: str | None = None,
    max_tokens: int = 1000,
    max_retries: int = 3,
):
    """Image + text analysis → Completion."""
    return get_bridge().image_api()(prompt, image_path, log_id, max_tokens, max_retries)
