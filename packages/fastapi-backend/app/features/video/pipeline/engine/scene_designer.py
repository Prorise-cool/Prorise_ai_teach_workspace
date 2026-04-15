"""Scene design stage — ManimCat two-stage generation, Stage 1.

Ported from ManimCat's src/services/concept-designer/scene-design-stage.ts.
Generates structured scene design from concept, with:
- GAP-5: unique seed via md5(concept + timestamp + random)
- GAP-4: vision auto-switch for reference images
- GAP-6: LLM response diagnostics (finish_reason check)
- GAP-7: message format normalization
"""

from __future__ import annotations

import hashlib
import logging
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..prompts.manimcat.api_codebook import SHARED_SPECIFICATION, build_api_index_module
from ..prompts.manimcat.prompt_loader import load_and_render
from .code_cleaner import extract_design_from_response

logger = logging.getLogger(__name__)

# ManimCat constants
DESIGNER_TEMPERATURE = 0.8
DESIGNER_MAX_TOKENS = 12000
DESIGNER_THINKING_TOKENS = 20000


# ── GAP-5: Unique seed ──────────────────────────────────────────


def generate_unique_seed(concept: str) -> str:
    """Generate unique seed: md5(concept + timestamp + random).

    ManimCat: src/services/concept-designer-utils.ts → generateUniqueSeed()
    Prevents duplicate designs across runs with same concept.
    """
    raw = f"{concept}-{time.time_ns()}-{random.randint(0, 0xFFFFFF)}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


# ── GAP-6: LLM response diagnostics ────────────────────────────


@dataclass
class ResponseDiagnostics:
    """Diagnostics extracted from LLM response."""
    content: str
    finish_reason: str = ""
    is_truncated: bool = False
    is_refused: bool = False
    model: str = ""


def check_response_quality(response: Any) -> ResponseDiagnostics:
    """Check LLM response for truncation, refusal, and extract content.

    ManimCat checks finish_reason to prevent bad code entering the pipeline.
    """
    content = ""
    finish_reason = ""
    model = ""

    # Gemini-style response
    try:
        candidate = response.candidates[0]
        content = candidate.content.parts[0].text
        finish_reason = getattr(candidate, "finish_reason", "")
        if hasattr(finish_reason, "name"):
            finish_reason = finish_reason.name
    except (AttributeError, IndexError):
        pass

    # OpenAI-style response
    if not content:
        try:
            choice = response.choices[0]
            content = choice.message.content or ""
            finish_reason = getattr(choice, "finish_reason", "") or ""
            model = getattr(response, "model", "")
        except (AttributeError, IndexError):
            content = str(response)

    is_truncated = finish_reason in ("MAX_TOKENS", "length", "RECITATION")
    is_refused = finish_reason in ("SAFETY", "content_filter", "blocked")

    if is_truncated:
        logger.warning(
            "LLM response truncated (finish_reason=%s), design may be incomplete",
            finish_reason,
        )
    if is_refused:
        logger.error("LLM response refused (finish_reason=%s)", finish_reason)

    return ResponseDiagnostics(
        content=content,
        finish_reason=finish_reason,
        is_truncated=is_truncated,
        is_refused=is_refused,
        model=model,
    )


# ── GAP-7: Message format normalization ────────────────────────


def normalize_messages(messages: list[Any]) -> list[dict[str, Any]]:
    """Normalize message formats: handle string and array content.

    ManimCat: src/services/concept-designer-utils.ts → normalizeMessages()
    Some LLM providers return content as string, others as array of parts.
    """
    normalized = []
    for msg in messages:
        if isinstance(msg, dict):
            content = msg.get("content", "")
            # Convert string content to consistent format
            if isinstance(content, str):
                normalized.append(msg)
            elif isinstance(content, list):
                # Already in array format (OpenAI vision style)
                normalized.append(msg)
            else:
                normalized.append({**msg, "content": str(content)})
        elif isinstance(msg, str):
            normalized.append({"role": "user", "content": msg})
        else:
            normalized.append({"role": "user", "content": str(msg)})
    return normalized


# ── GAP-4: Vision auto-switch ──────────────────────────────────


def build_vision_user_message(
    text_prompt: str,
    reference_images: list[Path] | None = None,
) -> list[dict[str, Any]]:
    """Build user message with optional vision content.

    ManimCat: src/services/concept-designer-utils.ts → buildVisionUserMessage()
    Auto-switches between text-only and multimodal based on available images.
    """
    if not reference_images:
        return [{"role": "user", "content": text_prompt}]

    content_parts: list[dict[str, Any]] = [{"type": "text", "text": text_prompt}]

    for img_path in reference_images:
        if not img_path.exists():
            logger.warning("Reference image not found: %s", img_path)
            continue
        try:
            import base64
            ext = img_path.suffix.lower().lstrip(".")
            mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}.get(ext, "image/png")
            data = base64.b64encode(img_path.read_bytes()).decode()
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{data}"},
            })
        except (ValueError, OSError):
            logger.warning("Failed to encode reference image: %s", img_path, exc_info=True)

    if len(content_parts) == 1:
        # No images were successfully loaded
        return [{"role": "user", "content": text_prompt}]

    return [{"role": "user", "content": content_parts}]


def should_retry_without_images(error: Exception) -> bool:
    """Determine if a failed vision request should retry without images.

    ManimCat retries without images when model doesn't support vision.
    """
    err_msg = str(error).lower()
    return any(
        kw in err_msg
        for kw in ("image", "vision", "multimodal", "unsupported", "invalid media")
    )


# ── Main: Scene Design Generation ──────────────────────────────


def generate_scene_design(
    *,
    concept: str,
    output_mode: str = "video",
    duration_minutes: int = 5,
    section_count: int | None = None,
    section_duration: int | None = None,
    layout_hint: str | None = None,
    reference_images: list[Path] | None = None,
    api_func: Any = None,
    max_tokens: int = DESIGNER_MAX_TOKENS,
) -> str:
    """Generate structured scene design from concept.

    ManimCat's Stage 1: concept-designer/scene-design-stage.ts
    Returns design text with <design>...</design> sections.

    Args:
        concept: The learning topic / concept to teach.
        output_mode: "video" or "image".
        duration_minutes: Target video duration.
        section_count: Override auto-calculated section count.
        section_duration: Override auto-calculated section duration.
        layout_hint: Layout preference hint.
        reference_images: Optional reference images for vision.
        api_func: LLM API callable (prompt, max_tokens) -> response.
        max_tokens: Maximum tokens for LLM response.

    Returns:
        Design text containing structured scene descriptions.
    """
    seed = generate_unique_seed(concept)

    # Calculate section params
    if section_count is None:
        section_count = max(3, min(20, duration_minutes * 2))
    if section_duration is None:
        section_duration = int((duration_minutes * 60) / section_count)

    # Load prompts
    system_prompt = load_and_render("concept_designer_system.md")
    user_prompt = load_and_render(
        "concept_designer_user.md",
        {
            "concept": concept,
            "seed": seed,
            "outputMode": output_mode,
            "duration": str(duration_minutes),
            "sectionCount": str(section_count),
            "sectionDuration": str(section_duration),
            "layoutHint": layout_hint or "choose the best layout for this concept",
        },
    )

    logger.info(
        "Generating scene design (%d sections, %d min, seed=%s)...",
        section_count,
        duration_minutes,
        seed,
    )

    # Build messages with optional vision (GAP-4)
    messages = [{"role": "system", "content": system_prompt}]
    user_messages = build_vision_user_message(user_prompt, reference_images)
    messages.extend(user_messages)

    # Normalize messages (GAP-7)
    messages = normalize_messages(messages)

    raw_prompt = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}"
    uses_multimodal_messages = any(
        isinstance(msg, dict) and isinstance(msg.get("content"), list)
        for msg in messages
    )

    # Call LLM — try with structured multimodal messages first, fallback without images.
    try:
        request_payload = messages if uses_multimodal_messages else raw_prompt
        response = api_func(request_payload, max_tokens=max_tokens)
    except Exception as e:  # LLM response format is unpredictable across providers
        if uses_multimodal_messages and should_retry_without_images(e):
            logger.warning("Vision failed, retrying without images: %s", e)
            response = api_func(raw_prompt, max_tokens=max_tokens)
        else:
            raise

    if response is None:
        raise ValueError("Scene design LLM call returned None")

    # Diagnostics (GAP-6)
    diag = check_response_quality(response)
    if diag.is_refused:
        raise ValueError(f"LLM refused to generate design: {diag.finish_reason}")

    # Extract design from response
    design_text = extract_design_from_response(diag.content)
    if not design_text.strip():
        raise ValueError("LLM returned empty design content")

    logger.info("Scene design generated: %d chars", len(design_text))
    return design_text
