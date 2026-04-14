"""Manim code cleaner — pre-render sanitization rules.

Borrowed from ManimCat's src/utils/manim-code-cleaner/rules.ts.
Fixes common LLM output issues before rendering.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Full-width to half-width mapping (18 common punctuation marks)
_FULLWIDTH_MAP = {
    "\uff0c": ",", "\u3002": ".", "\uff1b": ";", "\uff1a": ":",
    "\uff08": "(", "\uff09": ")", "\u3010": "[", "\u3011": "]",
    "\u300c": '"', "\u300d": '"', "\u300e": '"', "\u300f": '"',
    "\uff01": "!", "\uff1f": "?", "\uff05": "%", "\uff0b": "+",
    "\uff1d": "=", "\uff0d": "-",
}


@dataclass
class CleanResult:
    code: str
    changes: list[str]


def clean_fullwidth_punctuation(code: str) -> tuple[str, int]:
    """Replace full-width punctuation with half-width outside strings/comments."""
    result = []
    count = 0
    in_string = False
    string_char = None
    in_comment = False
    i = 0

    while i < len(code):
        ch = code[i]

        if in_comment:
            result.append(ch)
            if ch == "\n":
                in_comment = False
            i += 1
            continue

        if ch == "#" and not in_string:
            in_comment = True
            result.append(ch)
            i += 1
            continue

        if ch in ("'", '"') and (i == 0 or code[i - 1] != "\\"):
            # Check for triple quotes
            triple = code[i:i + 3]
            if triple in ('"""', "'''"):
                if not in_string:
                    in_string = True
                    string_char = triple
                    result.append(triple)
                    i += 3
                    continue
                elif string_char == triple:
                    in_string = False
                    string_char = None
                    result.append(triple)
                    i += 3
                    continue

            if not in_string:
                in_string = True
                string_char = ch
            elif ch == string_char and string_char not in ('"""', "'''"):
                in_string = False
                string_char = None

        if not in_string and ch in _FULLWIDTH_MAP:
            result.append(_FULLWIDTH_MAP[ch])
            count += 1
        else:
            result.append(ch)

        i += 1

    return "".join(result), count


def clean_duplicate_imports(code: str) -> str:
    """Remove duplicate `from manim import *` lines."""
    lines = code.splitlines()
    seen_manim_import = False
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if stripped == "from manim import *":
            if seen_manim_import:
                continue
            seen_manim_import = True
        cleaned.append(line)
    return "\n".join(cleaned)


def validate_scene_class(code: str) -> str:
    """Ensure the code contains a Scene class definition."""
    if not re.search(r"class\s+\w+\s*\(.*Scene\s*\)", code):
        logger.warning("Code cleaner: no Scene class found, prepending MainScene stub")
        code = "from manim import *\n\nclass MainScene(Scene):\n    def construct(self):\n        pass\n\n" + code
    return code


def fix_line_to_dashed_line(code: str) -> str:
    """Auto-convert Line(..., dash_length=...) to DashedLine(...)."""
    pattern = r"\bLine\s*\(([^)]*(?:dash_length|dashed_ratio|dash_ratio)[^)]*)\)"

    def _replacer(m: re.Match) -> str:
        return f"DashedLine({m.group(1)})"

    new_code = re.sub(pattern, _replacer, code)
    if new_code != code:
        logger.info("Code cleaner: converted Line with dash params to DashedLine")
    return new_code


def extract_code_from_response(text: str) -> str:
    """Extract code from LLM response, handling various formats."""
    # Remove <think> tags
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)

    # Try ### START ### ... ### END ### anchors (ManimCat format)
    anchor_match = re.search(r"###\s*START\s*###([\s\S]*?)###\s*END\s*###", text)
    if anchor_match:
        return anchor_match.group(1).strip()

    # Try ```python ... ``` code blocks
    code_match = re.search(r"```(?:python)?\s*\n([\s\S]*?)```", text, re.IGNORECASE)
    if code_match:
        return code_match.group(1).strip()

    # Try raw code (starts with from/import/class)
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("from ", "import ", "class ")):
            idx = text.index(line)
            return text[idx:].strip()

    return text.strip()


def extract_design_from_response(text: str) -> str:
    """Extract <design>...</design> content from LLM response."""
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)
    m = re.search(r"<design>([\s\S]*?)</design>", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return text.strip()


def clean_manim_code(code: str) -> CleanResult:
    """Run the full ManimCat-style code cleaning pipeline."""
    changes = []

    code, fw_count = clean_fullwidth_punctuation(code)
    if fw_count:
        changes.append(f"Replaced {fw_count} full-width punctuation marks")

    orig = code
    code = clean_duplicate_imports(code)
    if code != orig:
        changes.append("Removed duplicate imports")

    orig = code
    code = validate_scene_class(code)
    if code != orig:
        changes.append("Added missing Scene class")

    orig = code
    code = fix_line_to_dashed_line(code)
    if code != orig:
        changes.append("Converted Line with dash params to DashedLine")

    if changes:
        logger.info("Code cleaner: %s", "; ".join(changes))

    return CleanResult(code=code, changes=changes)
