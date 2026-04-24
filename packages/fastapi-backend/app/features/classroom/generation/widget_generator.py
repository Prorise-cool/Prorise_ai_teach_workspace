"""Phase 5: 互动 widget HTML 生成器。

当 outline.type == 'interactive' 时，按 ``widget_type`` 分派到 5 份 prompt
生成一份自包含的 HTML 文档，注入 ``scene.content.widget_html``。

生成失败时不抛异常，返回 ``None`` 让调用方把场景降级为 slide（由 job_runner
上层兜底），避免一个 widget 生成失败拖垮整堂课。
"""
from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

from app.features.classroom.generation.prompts.widget import resolve_widget_prompts
from app.features.classroom.llm_adapter import LLMCallParams, call_llm
from app.providers.protocols import LLMProvider

logger = logging.getLogger(__name__)

# widget HTML 很长（含 postMessage 监听 + CSS + JS），给 LLM 充足 token 预算
WIDGET_MAX_TOKENS = 8000


def _strip_markdown_fence(text: str) -> str:
    """某些模型会把 HTML 包在 ```html ... ``` 里。粗暴剥掉围栏。"""
    stripped = text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1 :]
        if stripped.endswith("```"):
            stripped = stripped[: -3].rstrip()
    return stripped


def _looks_like_html(text: str) -> bool:
    """最低限度检查：确认至少长得像 HTML，避免把"生成失败说明"当作 widget_html。"""
    head = text.lstrip().lower()
    return head.startswith("<!doctype html") or head.startswith("<html")


async def generate_widget_html(
    outline: dict[str, Any],
    provider_chain: Sequence[LLMProvider],
    language_directive: str = "",
) -> str | None:
    """生成一个互动场景的 iframe HTML。

    Returns:
        生成的 HTML 字符串；失败时返回 ``None``。
    """
    widget_type_raw = outline.get("widgetType") or outline.get("widget_type") or "simulation"
    widget_type = str(widget_type_raw).strip() or "simulation"
    widget_outline = (
        outline.get("widgetOutline")
        or outline.get("widget_outline")
        or {}
    )
    if not isinstance(widget_outline, dict):
        logger.warning(
            "widget_generator: widgetOutline 不是 dict (type=%s)，按空 dict 处理",
            type(widget_outline).__name__,
        )
        widget_outline = {}

    system_prompt, build_user_prompt = resolve_widget_prompts(widget_type)

    title = str(outline.get("title") or "互动场景")
    description = str(outline.get("description") or "")
    key_points = outline.get("keyPoints") or outline.get("key_points") or []
    if not isinstance(key_points, list):
        key_points = []
    language = language_directive or "zh-CN"

    user_prompt = build_user_prompt(
        title,
        description,
        [str(p) for p in key_points],
        widget_outline,
        language,
    )

    params = LLMCallParams(
        system=system_prompt,
        prompt=user_prompt,
        max_tokens=WIDGET_MAX_TOKENS,
    )

    try:
        raw = await call_llm(params, provider_chain)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "widget_generator: LLM 调用失败 widget_type=%s title=%r error=%s",
            widget_type, title, exc,
        )
        return None

    html = _strip_markdown_fence(raw)
    if not _looks_like_html(html):
        logger.warning(
            "widget_generator: LLM 返回不像 HTML widget_type=%s title=%r head=%r",
            widget_type, title, html[:80],
        )
        return None

    logger.info(
        "widget_generator.generated widget_type=%s title=%r html_len=%d",
        widget_type, title, len(html),
    )
    return html
