"""Code generation stage — ManimCat two-stage generation, Stage 2.

Ported from ManimCat's src/services/concept-designer/code-from-design-stage.ts.
Generates Manim code from structured scene design, with:
- GAP-5: unique seed via md5(concept + design_prefix + random)
- GAP-6: LLM response diagnostics
- API codebook injection for correct Manim usage
"""

from __future__ import annotations

import logging

from ..prompts.manimcat.api_codebook import SHARED_SPECIFICATION, build_api_index_module
from ..prompts.manimcat.prompt_loader import load_and_render
from .code_cleaner import clean_manim_code, extract_code_from_response
from .scene_designer import check_response_quality, generate_unique_seed

logger = logging.getLogger(__name__)

# ManimCat constants
CODER_TEMPERATURE = 0.7
CODER_MAX_TOKENS = 12000
CODER_THINKING_TOKENS = 20000


def generate_code_from_design(
    *,
    concept: str,
    scene_design: str,
    output_mode: str = "video",
    api_func=None,
    max_tokens: int = CODER_MAX_TOKENS,
) -> str:
    """Generate Manim code from structured scene design.

    ManimCat's Stage 2: concept-designer/code-from-design-stage.ts
    Takes the design from Stage 1 and produces complete Manim code.

    Args:
        concept: The learning topic (for context and seed).
        scene_design: Structured design text from scene_designer.
        output_mode: "video" or "image".
        api_func: LLM API callable (prompt, max_tokens) -> response.
        max_tokens: Maximum tokens for LLM response.

    Returns:
        Clean Manim code ready for static guard + rendering.
    """
    if not scene_design:
        raise ValueError("scene_design is required for code generation")

    # Seed uses concept + design prefix for uniqueness (GAP-5)
    seed = generate_unique_seed(f"{concept}-{scene_design[:50]}")

    # Load prompts with API codebook injection
    api_module = build_api_index_module()
    system_prompt = load_and_render(
        "code_generation_system.md",
        {
            "apiIndexModule": api_module,
            "sharedSpecification": SHARED_SPECIFICATION,
        },
    )
    user_prompt = load_and_render(
        "code_generation_user.md",
        {
            "sceneDesign": scene_design,
            "concept": concept,
            "seed": seed,
            "outputMode": output_mode,
            "isVideo": output_mode == "video",
        },
    )

    logger.info("Generating code from design (seed=%s)...", seed)

    # Call LLM
    raw_prompt = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}"
    response = api_func(raw_prompt, max_tokens=max_tokens)

    if response is None:
        raise ValueError("Code generation LLM call returned None")

    # Diagnostics (GAP-6)
    diag = check_response_quality(response)
    if diag.is_refused:
        raise ValueError(f"LLM refused to generate code: {diag.finish_reason}")
    if diag.is_truncated:
        logger.warning(
            "Code generation was truncated (finish_reason=%s), output may be incomplete",
            diag.finish_reason,
        )

    # Extract code from response
    raw_code = extract_code_from_response(diag.content)
    if not raw_code.strip():
        raise ValueError("LLM returned empty code content")

    # Clean the code
    clean_result = clean_manim_code(raw_code)

    logger.info(
        "Code generated: %d chars (cleaner: %s)",
        len(clean_result.code),
        "; ".join(clean_result.changes) or "no changes",
    )
    return clean_result.code
