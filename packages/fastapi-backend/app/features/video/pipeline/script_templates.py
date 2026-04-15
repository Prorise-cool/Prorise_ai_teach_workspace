"""Compatibility script builders for legacy video pipeline imports."""

from __future__ import annotations

import json

from app.features.video.pipeline.constants import DEFAULT_MANIM_SCENE_CLASS
from app.features.video.pipeline.engine.code_cleaner import extract_code_from_response
from app.features.video.pipeline.models import Storyboard

from .auto_fix import ast_fix_code
from .manim_runtime_prelude import MANIM_RUNTIME_PRELUDE

MANIM_IMPORT_LINE = "from manim import *"


def _ensure_runtime_prelude(script: str) -> str:
    if MANIM_RUNTIME_PRELUDE.strip() in script:
        return script

    lines = script.splitlines()
    for index, line in enumerate(lines):
        if line.strip() == MANIM_IMPORT_LINE:
            return "\n".join(
                [*lines[: index + 1], "", MANIM_RUNTIME_PRELUDE.rstrip("\n"), *lines[index + 1 :]]
            )

    return "\n".join([MANIM_IMPORT_LINE, "", MANIM_RUNTIME_PRELUDE.rstrip("\n"), script.lstrip()])


def build_default_fix_script(script: str) -> str:
    """Produce a runnable Manim script from a legacy fixed snippet."""
    cleaned = extract_code_from_response(script)
    cleaned = ast_fix_code(cleaned)
    if MANIM_IMPORT_LINE not in cleaned:
        cleaned = f"{MANIM_IMPORT_LINE}\n\n{cleaned.lstrip()}"
    return _ensure_runtime_prelude(cleaned)


def build_default_manim_script(storyboard: Storyboard) -> str:
    """Generate a stable fallback Manim script for the provided storyboard."""
    scene_blocks: list[str] = []
    for index, scene in enumerate(storyboard.scenes, start=1):
        title = scene.title or f"步骤 {index}"
        narration = scene.narration or scene.visual_description or title
        duration = max(1, int(scene.duration_hint or 1))
        scene_blocks.append(
            "\n".join(
                [
                    f"        self.next_section(\"section_{index}\")",
                    f"        title_{index} = Text({json.dumps(title, ensure_ascii=False)}, font_size=32)",
                    f"        body_{index} = Text({json.dumps(narration, ensure_ascii=False)}, font_size=24)",
                    f"        self.add_elements(title_{index}, body_{index}, run_time=0.5)",
                    f"        self.hold_scene({duration})",
                    "        self.clear_scene()",
                ]
            )
        )

    if not scene_blocks:
        scene_blocks.append("        self.wait(1)")

    construct_body = "\n\n".join(scene_blocks)
    return f"""from manim import *

class {DEFAULT_MANIM_SCENE_CLASS}(Scene):
    def hold_scene(self, duration):
        self.wait(duration)

    def clear_scene(self):
        self.clear()

    def add_elements(self, *elements, run_time=0.5):
        self.play(*[FadeIn(element) for element in elements], run_time=run_time)

    def construct(self):
{construct_body}
"""


__all__ = [
    "build_default_fix_script",
    "build_default_manim_script",
]
