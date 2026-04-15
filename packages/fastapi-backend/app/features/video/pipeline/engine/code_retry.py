"""Patch-based code retry — ManimCat-style SEARCH/REPLACE repair.

Borrowed from ManimCat's src/services/code-retry/ pattern.
Instead of regenerating full code on failure, extracts stderr error
and asks LLM for minimal SEARCH/REPLACE patches.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


@dataclass
class Patch:
    original_snippet: str
    replacement_snippet: str


@dataclass
class PatchSet:
    patches: list[Patch] = field(default_factory=list)


@dataclass
class RetryResult:
    code: str
    success: bool
    attempts: int = 0
    last_error: str = ""


def parse_patch_response(text: str) -> PatchSet:
    """Parse [[PATCH]][[SEARCH]]...[[REPLACE]]...[[END]] format from LLM response."""
    # Strip <think> tags if present
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)

    patches = []
    cursor = 0
    while True:
        patch_start = text.find("[[PATCH]]", cursor)
        if patch_start < 0:
            break

        search_start = text.find("[[SEARCH]]", patch_start)
        if search_start < 0:
            break
        replace_start = text.find("[[REPLACE]]", search_start)
        if replace_start < 0:
            break
        end_start = text.find("[[END]]", replace_start)
        if end_start < 0:
            break

        original = text[search_start + len("[[SEARCH]]"):replace_start].strip()
        replacement = text[replace_start + len("[[REPLACE]]"):end_start].strip()

        if original and original != replacement:
            patches.append(Patch(original_snippet=original, replacement_snippet=replacement))

        cursor = end_start + len("[[END]]")

    return PatchSet(patches=patches)


def apply_patch_set(code: str, patch_set: PatchSet) -> str:
    """Apply a set of patches to code. Each patch replaces the first occurrence."""
    for patch in patch_set.patches:
        idx = code.find(patch.original_snippet)
        if idx >= 0:
            code = code[:idx] + patch.replacement_snippet + code[idx + len(patch.original_snippet):]
            logger.debug("Patch applied: replaced %d chars at pos %d", len(patch.original_snippet), idx)
        else:
            logger.warning("Patch skip: original snippet not found in code (len=%d)", len(patch.original_snippet))
    return code


def extract_error_message(stderr: str) -> str:
    """Extract the most relevant error line from stderr."""
    if not stderr:
        return "Unknown error"
    lines = [l.strip() for l in stderr.strip().splitlines() if l.strip()]
    # Look for the last "Error:" line
    for line in reversed(lines):
        if re.search(r"Error:|Exception:|Traceback", line, re.IGNORECASE):
            return line
    return lines[-1] if lines else stderr[:500]


def extract_error_snippet(stderr: str, code: str) -> str | None:
    """Extract the code snippet near the error line."""
    m = re.search(r"line\s+(\d+)", stderr, re.IGNORECASE)
    if not m:
        return None
    line_num = int(m.group(1))
    lines = code.splitlines()
    start = max(0, line_num - 3)
    end = min(len(lines), line_num + 3)
    return "\n".join(lines[start:end])


def get_error_type(stderr: str) -> str:
    """Classify the error type from stderr."""
    patterns = [
        ("SyntaxError", r"SyntaxError"),
        ("IndentationError", r"IndentationError"),
        ("NameError", r"NameError"),
        ("AttributeError", r"AttributeError"),
        ("ImportError", r"(?:Import|Module)Error"),
        ("TypeError", r"TypeError"),
        ("ValueError", r"ValueError"),
        ("RuntimeError", r"RuntimeError"),
        ("KeyError", r"KeyError"),
    ]
    for name, pattern in patterns:
        if re.search(pattern, stderr, re.IGNORECASE):
            return name
    return "Unknown"


async def run_patch_retry(
    code: str,
    render_func: Callable[[str], Awaitable[tuple[bool, str]]],
    llm_patch_func: Callable[[str, str, int, str | None], Awaitable[str]],
    concept: str = "",
    max_retries: int = 4,
) -> RetryResult:
    """Run the patch-based retry loop.

    Args:
        code: Current Manim code.
        render_func: async (code) -> (success, stderr). Renders and returns result.
        llm_patch_func: async (code, error_msg, attempt, snippet) -> patched_response.
                        Calls LLM with code-retry prompt, returns raw LLM text.
        concept: The original concept (for context in retry prompt).
        max_retries: Maximum retry attempts (default 4, from ManimCat).
    """
    # Initial render
    success, stderr = await render_func(code)
    if success:
        return RetryResult(code=code, success=True, attempts=1)

    error_msg = extract_error_message(stderr)
    error_type = get_error_type(stderr)
    logger.info("Render failed (%s): %s", error_type, error_msg[:200])

    for attempt in range(1, max_retries + 1):
        snippet = extract_error_snippet(stderr, code)

        # Ask LLM for patch
        raw_response = await llm_patch_func(code, error_msg, attempt, snippet)
        patch_set = parse_patch_response(raw_response)

        if not patch_set.patches:
            logger.warning("Retry %d: LLM returned no valid patches", attempt)
            continue

        # Apply patches
        patched_code = apply_patch_set(code, patch_set)
        if patched_code == code:
            logger.warning("Retry %d: patches had no effect", attempt)
            continue

        code = patched_code
        logger.info("Retry %d: applied %d patches, re-rendering...", attempt, len(patch_set.patches))

        # Re-render
        success, stderr = await render_func(code)
        if success:
            logger.info("Retry %d: render succeeded!", attempt)
            return RetryResult(code=code, success=True, attempts=attempt + 1)

        error_msg = extract_error_message(stderr)
        error_type = get_error_type(stderr)
        logger.info("Retry %d: still failing (%s): %s", attempt, error_type, error_msg[:200])

    return RetryResult(code=code, success=False, attempts=max_retries + 1, last_error=error_msg)


# ── GAP-8: Doom Loop Prevention ─────────────────────────────────


class DoomLoopError(Exception):
    """Raised when the same error repeats N times, indicating a fix loop."""


def detect_doom_loop(
    error_signatures: list[str],
    *,
    threshold: int = 3,
) -> bool:
    """Detect if the same error repeats, indicating a doom loop.

    ManimCat: detect repeated errors and stop retrying.
    Compares error signatures (MD5 hashes of sanitized messages).

    Args:
        error_signatures: List of error signature hashes from recent failures.
        threshold: Number of consecutive identical signatures to trigger.

    Returns:
        True if doom loop detected (same error ≥ threshold times).
    """
    if len(error_signatures) < threshold:
        return False

    # Check if the last `threshold` signatures are all the same
    recent = error_signatures[-threshold:]
    return len(set(recent)) == 1
