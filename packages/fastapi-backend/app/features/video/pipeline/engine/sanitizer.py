"""Render error sanitizer — ManimCat render-failure/sanitizer.ts port.

Truncates stderr/stdout, extracts code snippets, infers error type.
GAP-3: structured error classification before retry.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from enum import StrEnum

logger = logging.getLogger(__name__)

# ManimCat limits
STDERR_LIMIT = 4096
STDOUT_LIMIT = 2048
CODE_SNIPPET_RADIUS = 5  # lines before/after error line


class ErrorType(StrEnum):
    IMPORT = "ImportError"
    SYNTAX = "SyntaxError"
    INDENTATION = "IndentationError"
    NAME = "NameError"
    ATTRIBUTE = "AttributeError"
    TYPE = "TypeError"
    VALUE = "ValueError"
    RUNTIME = "RuntimeError"
    KEY = "KeyError"
    INDEX = "IndexError"
    LATEX = "LaTeXError"
    OOM = "OutOfMemory"
    TIMEOUT = "Timeout"
    FILE_NOT_FOUND = "FileNotFoundError"
    DOCKER = "DockerError"
    UNKNOWN = "Unknown"


@dataclass
class SanitizedError:
    """Structured render error after sanitization."""
    error_type: ErrorType
    message: str
    stderr_truncated: bool
    stdout_truncated: bool
    code_snippet: str | None
    error_line: int | None


# ── Truncation ──────────────────────────────────────────────────


def truncate_output(text: str, limit: int = STDERR_LIMIT) -> tuple[str, bool]:
    """Tail-truncate output to limit bytes. Returns (truncated, was_truncated)."""
    if not text or len(text) <= limit:
        return text or "", False
    truncated = "..." + text[-(limit - 3):]
    return truncated, True


# ── Code snippet extraction ─────────────────────────────────────


def extract_code_snippet(
    error_text: str,
    code: str,
    radius: int = CODE_SNIPPET_RADIUS,
) -> tuple[str | None, int | None]:
    """Extract code lines around the error location.

    Returns (snippet, line_number) or (None, None) if not found.
    """
    m = re.search(r"(?:line|Line)\s+(\d+)", error_text)
    if not m:
        return None, None

    line_num = int(m.group(1))
    lines = code.splitlines()
    if line_num < 1 or line_num > len(lines):
        return None, line_num

    start = max(0, line_num - 1 - radius)
    end = min(len(lines), line_num + radius)

    snippet_lines = []
    for i in range(start, end):
        marker = ">>>" if i == line_num - 1 else "   "
        snippet_lines.append(f"{marker} {i + 1:4d} | {lines[i]}")

    return "\n".join(snippet_lines), line_num


# ── Error type inference ────────────────────────────────────────


_ERROR_PATTERNS: list[tuple[ErrorType, re.Pattern]] = [
    (ErrorType.IMPORT, re.compile(r"(?:Import|ModuleNotFound)Error", re.IGNORECASE)),
    (ErrorType.SYNTAX, re.compile(r"SyntaxError", re.IGNORECASE)),
    (ErrorType.INDENTATION, re.compile(r"IndentationError", re.IGNORECASE)),
    (ErrorType.NAME, re.compile(r"NameError", re.IGNORECASE)),
    (ErrorType.ATTRIBUTE, re.compile(r"AttributeError", re.IGNORECASE)),
    (ErrorType.TYPE, re.compile(r"TypeError", re.IGNORECASE)),
    (ErrorType.VALUE, re.compile(r"ValueError", re.IGNORECASE)),
    (ErrorType.KEY, re.compile(r"KeyError", re.IGNORECASE)),
    (ErrorType.INDEX, re.compile(r"IndexError", re.IGNORECASE)),
    (ErrorType.RUNTIME, re.compile(r"RuntimeError", re.IGNORECASE)),
    (ErrorType.LATEX, re.compile(r"(?:LaTeX|latex|texmf|MiKTeX|xelatex)", re.IGNORECASE)),
    (ErrorType.OOM, re.compile(r"(?:OutOfMemory|MemoryError|killed|Cannot allocate)", re.IGNORECASE)),
    (ErrorType.TIMEOUT, re.compile(r"(?:TimeoutExpired|timed out|timeout)", re.IGNORECASE)),
    (ErrorType.FILE_NOT_FOUND, re.compile(r"FileNotFoundError", re.IGNORECASE)),
    (ErrorType.DOCKER, re.compile(r"(?:unable to find image|error response from daemon|cannot connect to the docker)", re.IGNORECASE)),
]


def infer_error_type(error_text: str) -> ErrorType:
    """Classify the error type from stderr/stdout text."""
    for error_type, pattern in _ERROR_PATTERNS:
        if pattern.search(error_text):
            return error_type
    return ErrorType.UNKNOWN


# ── Main entry point ────────────────────────────────────────────


def sanitize_render_error(
    stderr: str,
    stdout: str = "",
    code: str = "",
) -> SanitizedError:
    """Full sanitization pipeline: truncate → classify → extract snippet.

    Port of ManimCat render-failure/sanitizer.ts sanitizeError().
    """
    truncated_stderr, stderr_was_truncated = truncate_output(stderr, STDERR_LIMIT)
    truncated_stdout, stdout_was_truncated = truncate_output(stdout, STDOUT_LIMIT)

    combined = f"{truncated_stderr}\n{truncated_stdout}"
    error_type = infer_error_type(combined)

    snippet, error_line = extract_code_snippet(combined, code) if code else (None, None)

    # Extract the most relevant error message line
    message = _extract_message(truncated_stderr)

    return SanitizedError(
        error_type=error_type,
        message=message,
        stderr_truncated=stderr_was_truncated,
        stdout_truncated=stdout_was_truncated,
        code_snippet=snippet,
        error_line=error_line,
    )


def _extract_message(stderr: str) -> str:
    """Extract the most relevant error line from truncated stderr."""
    if not stderr:
        return "Unknown error"
    lines = [l.strip() for l in stderr.strip().splitlines() if l.strip()]
    for line in reversed(lines):
        if re.search(r"Error:|Exception:|Traceback", line, re.IGNORECASE):
            return line[:500]
    return lines[-1][:500] if lines else stderr[:500]
