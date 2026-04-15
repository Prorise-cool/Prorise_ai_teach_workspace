"""OpenAI client factory — ManimCat-aligned client creation.

照抄 ManimCat openai-client-factory.ts：
- 默认 timeout=600s（10 分钟）
- User-Agent header
- 支持 sync (OpenAI) 和 async (AsyncOpenAI) 两种 client
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI, OpenAI

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 600.0  # 照抄 ManimCat: OPENAI_TIMEOUT = 600000ms
MINIMUM_TIMEOUT = 600.0  # 至少 10 分钟


def _normalize_base_url(base_url: str, request_path: str = "/v1/chat/completions") -> str:
    """确保 base_url 包含 API 版本前缀（如 /v1）。

    OpenAI SDK 会自动在 base_url 后追加 /chat/completions，
    所以 base_url 必须包含 /v1 才能访问 /v1/chat/completions。
    """
    base_url = base_url.strip().rstrip("/")
    prefix = request_path.replace("/chat/completions", "").rstrip("/")
    if prefix and not base_url.endswith(prefix):
        base_url += prefix
    return base_url


@dataclass(frozen=True)
class ProviderEndpoint:
    """Extracted provider endpoint config for SDK client creation."""

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
        timeout=max(provider.config.timeout_seconds, 300.0),
        extra_headers=dict(settings.get("headers", {})),
    )


def create_sync_client(
    base_url: str,
    api_key: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    extra_headers: dict[str, str] | None = None,
) -> OpenAI:
    """创建同步 OpenAI client（照抄 ManimCat createCustomOpenAIClient）。"""
    api_key = api_key.strip()
    if not base_url:
        raise ValueError("base_url is required")
    if not api_key:
        raise ValueError("api_key is required")

    headers: dict[str, str] = {"User-Agent": "ProriseAI-Teach/1.0"}
    if extra_headers:
        headers.update(extra_headers)

    return OpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=timeout,
        default_headers=headers,
    )


def create_async_client(
    base_url: str,
    api_key: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    extra_headers: dict[str, str] | None = None,
) -> AsyncOpenAI:
    """创建异步 OpenAI client。"""
    api_key = api_key.strip()
    if not base_url:
        raise ValueError("base_url is required")
    if not api_key:
        raise ValueError("api_key is required")

    headers: dict[str, str] = {"User-Agent": "ProriseAI-Teach/1.0"}
    if extra_headers:
        headers.update(extra_headers)

    return AsyncOpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=timeout,
        default_headers=headers,
    )


def client_from_endpoint(ep: ProviderEndpoint) -> OpenAI:
    """从 ProviderEndpoint 创建 sync client，timeout 至少 MINIMUM_TIMEOUT。"""
    effective_timeout = max(ep.timeout, MINIMUM_TIMEOUT)
    normalized_url = _normalize_base_url(ep.base_url, ep.request_path)
    return create_sync_client(
        base_url=normalized_url,
        api_key=ep.api_key,
        timeout=effective_timeout,
        extra_headers=ep.extra_headers or None,
    )
