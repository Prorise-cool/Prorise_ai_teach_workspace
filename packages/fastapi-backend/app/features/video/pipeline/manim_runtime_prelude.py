"""Compatibility constants for legacy Manim template helpers."""

from __future__ import annotations

MANIM_RUNTIME_TEX_TEMPLATE_NAME = "MANIM_RUNTIME_TEX_TEMPLATE"
MANIM_RUNTIME_PRELUDE = f"{MANIM_RUNTIME_TEX_TEMPLATE_NAME} = None\n"

__all__ = [
    "MANIM_RUNTIME_PRELUDE",
    "MANIM_RUNTIME_TEX_TEMPLATE_NAME",
]
