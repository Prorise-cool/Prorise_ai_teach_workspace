"""LLM Bridge — routes all API calls through Provider per-stage config.

The orchestrator calls ``configure_bridge()`` at startup with provider
endpoints extracted from ``ProviderRuntimeResolver``. Agent code calls
``bridge.text_api(stage)`` or the convenience module-level functions.
"""

from __future__ import annotations

import base64
import json
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
    """Low-level sync OpenAI-compatible HTTP call with retry.

    Strategy (ManimCat-aligned): stream first, fallback to non-stream.
    Streaming keeps the connection alive through proxies/CDN (avoids 524),
    and supports partial content recovery on mid-stream errors.
    """
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
                clamped_tokens = min(max_tokens, 8192)
                payload = {
                    "model": ep.model_name,
                    "messages": messages,
                    "max_tokens": clamped_tokens,
                }

                logger.debug(
                    "LLM request to %s%s model=%s max_tokens=%d messages=%d attempt=%d",
                    ep.base_url, ep.request_path, ep.model_name,
                    max_tokens, len(messages), attempt,
                )

                # ── ManimCat strategy: stream first ──
                content, stream_usage = _call_stream_primary(client, ep, payload)

                if stream_usage:
                    usage_info.update(
                        {
                            k: stream_usage.get(k, 0)
                            for k in (
                                "prompt_tokens",
                                "completion_tokens",
                                "total_tokens",
                            )
                        }
                    )

                # Stream returned partial content — use it
                if content is not None and content.strip():
                    return _build_completion(content, usage_info, ep.model_name), usage_info

                # Stream failed entirely — fallback to non-stream
                logger.info("Stream attempt %d empty, falling back to non-stream", attempt)
                content, ns_usage = _call_non_stream(client, ep, payload)
                if ns_usage:
                    usage_info.update(
                        {
                            k: ns_usage.get(k, 0)
                            for k in ("prompt_tokens", "completion_tokens", "total_tokens")
                        }
                    )

                if content is None:
                    logger.warning("Both stream and non-stream returned null on attempt %d", attempt)
                    if attempt >= max_retries:
                        return None, usage_info
                    continue

                return _build_completion(content, usage_info, ep.model_name), usage_info

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            if 400 <= status_code < 500:
                body = ""
                try:
                    body = e.response.text[:500]
                except (AttributeError, UnicodeDecodeError):
                    pass
                logger.error(
                    "LLM client error %d (not retrying): %s | body: %s",
                    status_code, e, body,
                )
                return None, usage_info
            if attempt >= max_retries:
                logger.error("LLM call failed after %d attempts: %s", max_retries, e)
                return None, usage_info
            delay = (2**attempt) * 0.1 + random.random() * 0.1
            logger.warning(
                "LLM attempt %d/%d server error %d: %s, retrying in %.2fs",
                attempt, max_retries, status_code, e, delay,
            )
            time.sleep(delay)
        except (httpx.RequestError, ValueError, KeyError) as e:
            if attempt >= max_retries:
                logger.error("LLM call failed after %d attempts: %s", max_retries, e)
                return None, usage_info
            delay = (2**attempt) * 0.1 + random.random() * 0.1
            logger.warning(
                "LLM attempt %d/%d failed: %s, retrying in %.2fs",
                attempt, max_retries, e, delay,
            )
            time.sleep(delay)

    return None, usage_info


def _call_stream_primary(
    client: httpx.Client,
    ep: ProviderEndpoint,
    payload: dict[str, Any],
) -> tuple[str | None, dict[str, int]]:
    """Stream-first LLM call (ManimCat strategy).

    Collects chunks via SSE stream. On mid-stream errors, returns whatever
    partial content was received so far instead of discarding it.
    This avoids Cloudflare 524 timeouts since data flows continuously.
    """
    payload_stream = {**payload, "stream": True}
    chunks: list[str] = []
    usage: dict[str, int] = {}

    try:
        with client.stream(
            "POST", ep.request_path, json=payload_stream
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or []
                delta = choices[0].get("delta", {}) if choices else {}
                text = delta.get("content")
                if text:
                    chunks.append(text)
                chunk_usage = chunk.get("usage")
                if chunk_usage:
                    usage = chunk_usage
    except httpx.HTTPStatusError as e:
        # Partial content recovery — return what we got so far
        if chunks:
            partial = "".join(chunks)
            logger.warning(
                "Stream error %d but recovered %d chars of partial content",
                e.response.status_code, len(partial),
            )
            return partial, usage
        if 400 <= e.response.status_code < 500:
            logger.error("Stream client error %d (not retryable): %s", e.response.status_code, e)
        else:
            logger.warning("Stream server error %d: %s", e.response.status_code, e)
        return None, usage
    except (httpx.RequestError, ValueError, KeyError) as e:
        # Partial content recovery on network/timeout errors
        if chunks:
            partial = "".join(chunks)
            logger.warning(
                "Stream interrupted after %d chunks, recovered %d chars: %s",
                len(chunks), len(partial), e,
            )
            return partial, usage
        logger.warning("Stream failed with no content: %s", e)
        return None, usage

    content = "".join(chunks) if chunks else None
    return content, usage


def _call_non_stream(
    client: httpx.Client,
    ep: ProviderEndpoint,
    payload: dict[str, Any],
) -> tuple[str | None, dict[str, int]]:
    """Non-stream fallback (ManimCat: only used when stream fails)."""
    usage: dict[str, int] = {}
    try:
        response = client.post(ep.request_path, json=payload)
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices") or []
        content = choices[0]["message"]["content"] if choices else None
        raw_usage = data.get("usage") or {}
        usage.update(
            {
                k: raw_usage.get(k, 0)
                for k in ("prompt_tokens", "completion_tokens", "total_tokens")
            }
        )
        return content, usage
    except (httpx.HTTPStatusError, httpx.RequestError, ValueError, KeyError) as e:
        logger.warning("Non-stream fallback failed: %s", e)
        return None, usage


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
        """Return a text API compatible with prompt-only and prebuilt message payloads."""
        ep = self.endpoint_for(stage)

        def fn(
            prompt_or_messages: str | list[dict[str, Any]],
            max_tokens: int = 10000,
            max_retries: int = 3,
        ):
            if isinstance(prompt_or_messages, list):
                messages = prompt_or_messages
            else:
                messages = [{"role": "user", "content": prompt_or_messages}]
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
    """Multimodal: video + reference image + text -> (Completion, usage)."""
    return get_bridge().video_img_api("mllm_feedback")(
        prompt, video_path, image_path, log_id, max_tokens, max_retries,
    )


def request_gemini_with_video(
    prompt: str,
    video_path: str,
    log_id: str | None = None,
    max_tokens: int = 10000,
    max_retries: int = 3,
):
    """Video-only analysis -> Completion."""
    return get_bridge().video_api("mllm_feedback")(
        prompt, video_path, log_id, max_tokens, max_retries,
    )
