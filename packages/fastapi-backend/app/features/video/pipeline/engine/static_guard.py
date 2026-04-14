"""Static guard — py_compile + mypy checks before rendering.

Borrowed from ManimCat's src/services/static-guard/ pattern.
Replaces our LLM-heavy repair loops with local static analysis.
"""

from __future__ import annotations

import logging
import py_compile
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# Known parameter patterns that Manim expects as tuples, not lists
_RANGE_PARAM_NAMES = frozenset(
    {
        "x_range",
        "y_range",
        "z_range",
        "t_range",
        "u_range",
        "v_range",
    }
)
_POINT_PARAM_NAMES = frozenset(
    {
        "point",
        "center",
        "start",
        "end",
        "direction",
    }
)
_POSITIONAL_POINT_CONSTRUCTORS = frozenset(
    {
        "Dot",
        "Dot3D",
        "Arrow",
        "Line",
        "DashedLine",
        "Arrow3D",
        "Line3D",
        "ArcBetweenPoints",
        "CubicBezier",
    }
)


@dataclass
class Diagnostic:
    tool: str  # "py_compile" | "mypy"
    line: int
    column: int = 0
    message: str = ""
    code: str = ""  # mypy error code e.g. "arg-type"


@dataclass
class GuardResult:
    code: str
    passed: bool
    passes_used: int = 0
    diagnostics: list[Diagnostic] = field(default_factory=list)
    ai_patches_applied: int = 0


def run_py_compile(code: str, tmp_dir: Path) -> list[Diagnostic]:
    """Run py_compile syntax check."""
    code_file = tmp_dir / "scene.py"
    code_file.write_text(code, encoding="utf-8")
    diagnostics = []
    try:
        py_compile.compile(str(code_file), doraise=True)
    except py_compile.PyCompileError as e:
        line = 1
        msg = str(e)
        m = re.search(r"line\s+(\d+)", msg)
        if m:
            line = int(m.group(1))
        diagnostics.append(Diagnostic(tool="py_compile", line=line, message=msg))
    return diagnostics


def run_mypy(code: str, tmp_dir: Path) -> list[Diagnostic]:
    """Run mypy type check."""
    code_file = tmp_dir / "scene.py"
    code_file.write_text(code, encoding="utf-8")
    diagnostics = []
    try:
        result = subprocess.run(
            [
                "python",
                "-m",
                "mypy",
                "--show-column-numbers",
                "--show-error-codes",
                "--hide-error-context",
                "--no-color-output",
                "--no-error-summary",
                "--follow-imports",
                "skip",
                "--ignore-missing-imports",
                "--allow-untyped-globals",
                "--allow-redefinition",
                str(code_file),
            ],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(tmp_dir),
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning("mypy check skipped: %s", e)
        return []

    for line_text in result.stdout.splitlines():
        m = re.match(
            r"[^:]+:(\d+):(\d+):\s*error:\s*(.+?)\s*\[([a-z0-9\-]+)\]",
            line_text,
        )
        if m:
            diag = Diagnostic(
                tool="mypy",
                line=int(m.group(1)),
                column=int(m.group(2)),
                message=m.group(3),
                code=m.group(4),
            )
            if not _should_ignore(diag):
                diagnostics.append(diag)
    return diagnostics


def _should_ignore(d: Diagnostic) -> bool:
    """Filter out noisy mypy diagnostics that don't affect Manim execution."""
    if d.code in ("import", "import-untyped"):
        return True
    if "Cannot find implementation or library stub" in d.message:
        return True
    return False


def try_known_fix(code: str, diagnostic: Diagnostic) -> str | None:
    """Apply known pattern fixes without calling LLM.

    Borrowed from ManimCat's tryApplyKnownMypyFix — fixes common
    list-vs-tuple mismatches that Manim expects.
    """
    if diagnostic.tool != "mypy" or diagnostic.code != "arg-type":
        return None

    original = code
    msg = diagnostic.message

    # Pattern: list vs tuple for range parameters
    if "list" in msg and ("tuple" in msg or "Point3dLike" in msg):
        param_match = re.search(r'parameter\s+"(\w+)"', msg)
        if not param_match:
            return None
        param_name = param_match.group(1)

        if param_name in _RANGE_PARAM_NAMES:
            code = re.sub(
                rf"\b{param_name}\s*=\s*\[([^\[\]\n]+)\]",
                lambda m: f"{param_name}=({m.group(1).strip()})",
                code,
            )

        if param_name in _POINT_PARAM_NAMES:
            for ctor in _POSITIONAL_POINT_CONSTRUCTORS:
                code = re.sub(
                    rf"\b{ctor}\s*\(\s*\[([^\[\]\n]+)\]",
                    lambda m, c=ctor: f"{c}(({m.group(1).strip()})",
                    code,
                )

    return code if code != original else None


async def run_guard_loop(
    code: str,
    max_passes: int = 3,
    ai_fix_func=None,
) -> GuardResult:
    """Run static guard loop: check → known fix → AI patch (if needed).

    Args:
        code: Manim Python code to check.
        max_passes: Maximum number of check-fix iterations.
        ai_fix_func: Optional async callable(code, diagnostics) -> patched_code.
                     Only called when known fixes can't resolve all issues.
    """
    ai_patches = 0

    for pass_idx in range(1, max_passes + 1):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # 1. py_compile
            syntax_diags = run_py_compile(code, tmp_path)
            if syntax_diags:
                logger.info(
                    "Static guard pass %d: syntax error at line %d",
                    pass_idx,
                    syntax_diags[0].line,
                )
                if ai_fix_func:
                    code = await ai_fix_func(code, syntax_diags)
                    ai_patches += 1
                    continue
                return GuardResult(
                    code=code,
                    passed=False,
                    passes_used=pass_idx,
                    diagnostics=syntax_diags,
                )

            # 2. mypy
            mypy_diags = run_mypy(code, tmp_path)
            if not mypy_diags:
                logger.info("Static guard pass %d: all clear", pass_idx)
                return GuardResult(
                    code=code,
                    passed=True,
                    passes_used=pass_idx,
                    ai_patches_applied=ai_patches,
                )

            # 3. Try known fixes
            remaining = []
            for diag in mypy_diags:
                fixed = try_known_fix(code, diag)
                if fixed:
                    code = fixed
                    logger.info(
                        "Static guard: known fix applied for %s at line %d",
                        diag.code,
                        diag.line,
                    )
                else:
                    remaining.append(diag)

            if not remaining:
                continue  # Re-check after known fixes

            # 4. AI patch for remaining issues (only if provided)
            if ai_fix_func:
                logger.info(
                    "Static guard pass %d: %d issues need AI patch",
                    pass_idx,
                    len(remaining),
                )
                code = await ai_fix_func(code, remaining)
                ai_patches += 1
            else:
                logger.warning(
                    "Static guard: %d unresolvable issues, no AI fixer", len(remaining)
                )
                return GuardResult(
                    code=code, passed=False, passes_used=pass_idx, diagnostics=remaining
                )

    # Exhausted passes — do one final check
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        final_diags = run_py_compile(code, tmp_path)
        if not final_diags:
            final_diags = run_mypy(code, tmp_path)
        passed = len(final_diags) == 0
        return GuardResult(
            code=code,
            passed=passed,
            passes_used=max_passes,
            diagnostics=final_diags,
            ai_patches_applied=ai_patches,
        )
