"""Stage 1: Generate scene outlines from user requirements (SSE streaming).

Ported from OpenMAIC /lib/generation/outline-generator.ts.
"""

from __future__ import annotations

import logging
import uuid
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

    Returns {"languageDirective": str, "outlines": list[dict]}
    Raises on LLM failure.
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
        logger.error("outline_generator: failed to parse LLM response")
        return {"languageDirective": "", "outlines": _build_fallback_outlines(requirement)}

    # Normalize: LLM may return flat array (legacy) or {languageDirective, outlines}
    if isinstance(parsed, list):
        language_directive = "请用与用户需求相匹配的语言进行教学。"
        raw_outlines = parsed
    elif isinstance(parsed, dict) and "outlines" in parsed:
        language_directive = parsed.get("languageDirective", "")
        raw_outlines = parsed["outlines"]
    else:
        logger.warning("outline_generator: unexpected response shape")
        return {"languageDirective": "", "outlines": _build_fallback_outlines(requirement)}

    if not isinstance(raw_outlines, list):
        logger.warning("outline_generator: outlines is not a list")
        return {"languageDirective": "", "outlines": _build_fallback_outlines(requirement)}

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


def _build_fallback_outlines(requirement: str) -> list[dict]:
    """Emergency fallback: produce a minimal outline when LLM fails."""
    logger.warning("outline_generator: using fallback outline")
    return [
        {
            "id": f"scene_{uuid.uuid4().hex[:6]}",
            "type": "slide",
            "title": f"关于'{requirement[:30]}'的介绍",
            "description": "课程概述与核心概念介绍",
            "keyPoints": ["核心概念", "基本原理", "实际应用"],
            "teachingObjective": "理解基本概念",
            "estimatedDuration": 180,
            "order": 1,
        }
    ]
