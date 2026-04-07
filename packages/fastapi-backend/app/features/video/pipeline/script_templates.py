"""视频流水线中的 Manim 脚本模板。"""

from __future__ import annotations

from app.features.video.pipeline.constants import (
    DEFAULT_FIXED_SCENE_CLASS,
    DEFAULT_MANIM_SCENE_CLASS,
    MANIM_IMPORT_LINE,
)
from app.features.video.pipeline.models import Storyboard


def build_default_manim_script(storyboard: Storyboard) -> str:
    lines = [
        MANIM_IMPORT_LINE,
        "",
        "",
        f"class {DEFAULT_MANIM_SCENE_CLASS}(Scene):",
        "    def construct(self):",
    ]
    for index, scene in enumerate(storyboard.scenes, start=1):
        title = scene.title.replace('"', '\\"')
        narration = scene.narration.replace('"', '\\"')
        lines.extend(
            [
                f"        # {scene.scene_id}",
                f'        title_{index} = Text("{title}", font_size=32)',
                f'        body_{index} = Text("{narration[:48]}", font_size=26)',
                f"        group_{index} = VGroup(title_{index}, body_{index}).arrange(DOWN, buff=0.5)",
                f"        self.add(group_{index})",
                f"        self.wait({max(scene.duration_hint / 8, 0.5):.2f})",
                f"        self.clear()",
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def build_default_fix_script(script_content: str) -> str:
    fixed_script = script_content.replace("ShowCreation", "Create")
    if MANIM_IMPORT_LINE not in fixed_script:
        fixed_script = f"{MANIM_IMPORT_LINE}\n\n" + fixed_script
    if "class " not in fixed_script or "(Scene)" not in fixed_script:
        indented = "\n".join(f"    {line}" for line in fixed_script.splitlines() if line.strip())
        fixed_script = f"{MANIM_IMPORT_LINE}\n\nclass {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n" + indented + "\n"
    return fixed_script
