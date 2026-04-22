"""JSON repair utilities for LLM responses.

Ported from OpenMAIC /lib/generation/json-repair.ts.
Handles malformed JSON commonly returned by LLMs.
"""

from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

try:
    from partial_json_parser import loads as partial_json_loads
    _HAS_PARTIAL_JSON = True
except ImportError:
    _HAS_PARTIAL_JSON = False
    logger.debug("partial_json_parser not available; using fallback")


def parse_json_response(response: str) -> object | None:
    """Parse JSON from LLM response with multiple fallback strategies.

    Mirrors OpenMAIC's parseJsonResponse function.
    Returns None if all strategies fail.
    """
    # Strategy 1: Extract from markdown code blocks
    code_block_pattern = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)
    for match in code_block_pattern.finditer(response):
        extracted = match.group(1).strip()
        if extracted.startswith(("{", "[")):
            result = _try_parse_json(extracted)
            if result is not None:
                logger.debug("Parsed JSON from code block")
                return result

    # Strategy 2: Find JSON structure directly in response
    json_start_array = response.find("[")
    json_start_object = response.find("{")

    if json_start_array != -1 or json_start_object != -1:
        if json_start_array == -1:
            start_index = json_start_object
        elif json_start_object == -1:
            start_index = json_start_array
        else:
            start_index = min(json_start_array, json_start_object)

        end_index = _find_matching_close(response, start_index)
        if end_index != -1:
            json_str = response[start_index : end_index + 1]
            result = _try_parse_json(json_str)
            if result is not None:
                logger.debug("Parsed JSON from response body")
                return result

    # Strategy 3: Try the whole response
    result = _try_parse_json(response.strip())
    if result is not None:
        logger.debug("Parsed raw response as JSON")
        return result

    logger.error("Failed to parse JSON. First 300 chars: %s", response[:300])
    return None


def _find_matching_close(text: str, start_index: int) -> int:
    """Find matching close bracket for JSON structure."""
    depth = 0
    in_string = False
    escape_next = False

    for i in range(start_index, len(text)):
        char = text[i]

        if escape_next:
            escape_next = False
            continue

        if char == "\\" and in_string:
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
            continue

        if not in_string:
            if char in ("[", "{"):
                depth += 1
            elif char in ("]", "}"):
                depth -= 1
                if depth == 0:
                    return i

    return -1


def _try_parse_json(json_str: str) -> object | None:
    """Try to parse JSON with various fixes for common LLM issues."""
    # Attempt 1: Direct parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Fix LaTeX and common escape issues
    try:
        fixed = _fix_json_escapes(json_str)
        fixed = _fix_truncated_json(fixed)
        return json.loads(fixed)
    except (json.JSONDecodeError, Exception):
        pass

    # Attempt 3: Use partial_json_parser if available
    if _HAS_PARTIAL_JSON:
        try:
            result = partial_json_loads(json_str)
            if result is not None:
                logger.info("Recovered JSON via partial_json_parser")
                return result
        except Exception:
            pass

    # Attempt 4: Remove control characters
    try:
        cleaned = _remove_control_chars(json_str)
        return json.loads(cleaned)
    except (json.JSONDecodeError, Exception):
        pass

    return None


def _fix_json_escapes(json_str: str) -> str:
    """Fix common JSON escape issues from LLM output (LaTeX, etc.)."""
    # Fix LaTeX-style backslash sequences that break JSON
    # Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    valid_escapes = set('"' + "\\" + "/" + "bfnrtu")

    result = []
    i = 0
    while i < len(json_str):
        char = json_str[i]
        if char == "\\" and i + 1 < len(json_str):
            next_char = json_str[i + 1]
            if next_char in valid_escapes:
                result.append(char)
                result.append(next_char)
                i += 2
            else:
                # Double-escape non-JSON escape sequences (LaTeX commands)
                result.append("\\\\")
                result.append(next_char)
                i += 2
        else:
            result.append(char)
            i += 1

    return "".join(result)


def _fix_truncated_json(json_str: str) -> str:
    """Try to fix truncated JSON arrays/objects."""
    trimmed = json_str.strip()

    if trimmed.startswith("[") and not trimmed.endswith("]"):
        last_obj = json_str.rfind("}")
        if last_obj > 0:
            json_str = json_str[: last_obj + 1] + "]"
            logger.warning("Fixed truncated JSON array")

    elif trimmed.startswith("{") and not trimmed.endswith("}"):
        open_count = json_str.count("{")
        close_count = json_str.count("}")
        if open_count > close_count:
            json_str += "}" * (open_count - close_count)
            logger.warning("Fixed truncated JSON object")

    return json_str


def _remove_control_chars(json_str: str) -> str:
    """Remove or escape control characters."""
    def replace_ctrl(char: str) -> str:
        if char == "\n":
            return "\\n"
        if char == "\r":
            return "\\r"
        if char == "\t":
            return "\\t"
        if ord(char) < 0x20 or ord(char) == 0x7F:
            return ""
        return char

    return "".join(replace_ctrl(c) for c in json_str)
