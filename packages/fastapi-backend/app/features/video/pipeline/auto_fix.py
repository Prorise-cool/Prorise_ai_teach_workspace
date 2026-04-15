"""Legacy AST-based fix helpers for the video pipeline."""

from __future__ import annotations

from .manim_runtime_prelude import MANIM_RUNTIME_TEX_TEMPLATE_NAME


def ast_fix_code(code: str) -> str:
    """Normalize legacy runtime template references without injecting preludes."""
    return code.replace("TexTemplateLibrary.ctex", MANIM_RUNTIME_TEX_TEMPLATE_NAME)


__all__ = ["ast_fix_code"]
