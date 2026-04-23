"""Stage 1: Generate scene outlines from user requirements (SSE streaming).

Ported from OpenMAIC /lib/generation/outline-generator.ts.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Sequence

from app.features.classroom.generation.json_repair import parse_json_response
from app.features.classroom.generation.prompts.outline import (
    OUTLINE_SYSTEM_PROMPT,
    build_outline_user_prompt,
)
from app.features.classroom.llm_adapter import LLMCallParams, call_llm, stream_llm
from app.providers.protocols import LLMProvider

logger = logging.getLogger(__name__)

MAX_PDF_CONTENT_CHARS = 8000  # Trim long PDF texts to avoid token overflow


def _ensure_ids(outlines: list[dict]) -> list[dict]:
    """Ensure all outlines have unique IDs and sequential order."""
    enriched = []
    for idx, outline in enumerate(outlines):
        outline = dict(outline)
        if not outline.get("id"):
            outline["id"] = f"scene_{idx + 1}"
        outline["order"] = idx + 1
        enriched.append(outline)
    return enriched


async def generate_scene_outlines(
    requirement: str,
    provider_chain: Sequence[LLMProvider],
    pdf_text: str | None = None,
    research_context: str = "None",
    user_profile: str = "",
) -> dict:
    """Generate scene outlines (one-shot, returns parsed dict).

    Returns ``{"languageDirective": str, "outlines": list[dict]}``。

    失败语义：大纲是整堂课的骨架，解析失败或 shape 异常一律抛
    ``RuntimeError``，由 ``job_runner`` 的外层 try 接住并把任务标为
    failed。不再返回占位大纲 —— 用户看到 1 个通用场景的"课堂"比看到
    报错更困惑。
    """
    params = LLMCallParams(
        system=OUTLINE_SYSTEM_PROMPT,
        prompt=build_outline_user_prompt(
            requirement=requirement,
            pdf_content=(
                pdf_text[:MAX_PDF_CONTENT_CHARS] if pdf_text else "None"
            ),
            research_context=research_context,
            user_profile=user_profile,
        ),
    )

    response = await call_llm(params, provider_chain)
    parsed = parse_json_response(response)

    if parsed is None:
        raise RuntimeError(
            f"outline_generator: LLM 响应无法解析为 JSON (response_len={len(response)})"
        )

    # Normalize: LLM may return flat array (legacy) or {languageDirective, outlines}
    if isinstance(parsed, list):
        language_directive = "请用与用户需求相匹配的语言进行教学。"
        raw_outlines = parsed
    elif isinstance(parsed, dict) and "outlines" in parsed:
        language_directive = parsed.get("languageDirective", "")
        raw_outlines = parsed["outlines"]
    else:
        raise RuntimeError(
            f"outline_generator: LLM 响应形状异常 (type={type(parsed).__name__})"
        )

    if not isinstance(raw_outlines, list):
        raise RuntimeError(
            f"outline_generator: outlines 字段不是数组 (type={type(raw_outlines).__name__})"
        )

    if not raw_outlines:
        raise RuntimeError("outline_generator: LLM 返回了空 outlines 数组")

    enriched = _ensure_ids(raw_outlines)
    return {"languageDirective": language_directive, "outlines": enriched}


async def stream_scene_outlines(
    requirement: str,
    provider_chain: Sequence[LLMProvider],
    pdf_text: str | None = None,
    research_context: str = "None",
) -> AsyncIterator[str]:
    """Stream scene outline generation as SSE-ready text chunks.

    Yields JSON text chunks. The final chunk is the full parsed result.
    P0: emits one chunk with the full result.
    P1: true token streaming when providers support it.
    """
    params = LLMCallParams(
        system=OUTLINE_SYSTEM_PROMPT,
        prompt=build_outline_user_prompt(
            requirement=requirement,
            pdf_content=(pdf_text[:MAX_PDF_CONTENT_CHARS] if pdf_text else "None"),
            research_context=research_context,
        ),
    )

    async for chunk in stream_llm(params, provider_chain):
        yield chunk
