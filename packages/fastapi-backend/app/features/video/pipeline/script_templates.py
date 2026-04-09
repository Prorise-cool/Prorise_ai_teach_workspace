"""视频流水线中的 Manim 脚本模板。

默认回退脚本必须保持为纯 Manim 渲染模式，避免重新引入
``manim-voiceover`` 或容器内 TTS 依赖。
"""

from __future__ import annotations

from app.features.video.pipeline.constants import (
    DEFAULT_FIXED_SCENE_CLASS,
    DEFAULT_MANIM_SCENE_CLASS,
    MANIM_IMPORT_LINE,
)
from app.features.video.pipeline.manim_runtime_prelude import (
    MANIM_RUNTIME_PRELUDE,
    ensure_manim_runtime_prelude,
)
from app.features.video.pipeline.models import Storyboard


def build_default_manim_script(storyboard: Storyboard) -> str:
    """根据分镜生成纯 Manim 默认脚本。

    该脚本只作为 LLM 全量生成失败时的回退路径，因此必须保持为
    沙箱可直接执行的纯 Manim 脚本。
    """
    lines = [
        MANIM_IMPORT_LINE,
        "import numpy as np",
        "import math",
        "",
        *MANIM_RUNTIME_PRELUDE.splitlines(),
        "",
        f"config.background_color = '{storyboard.video_config.background_color}'",
        "",
        "",
        "class FlexibleElementsScene(MovingCameraScene):",
        "    def __init__(self, **kwargs):",
        "        super().__init__(**kwargs)",
        "        self.last_element = None",
        "        self.element_list = []",
        "        self.current_scale = 1.0",
        "        self._base_camera_center = ORIGIN",
        "        self._base_camera_width = self.camera.frame.width if hasattr(self.camera, 'frame') else None",
        "",
        "    def add_element(self, content, buff=0.3, run_time=0.6):",
        "        if isinstance(content, str):",
        "            content = Text(content, font_size=30)",
        "        element = content",
        "        if self.last_element is not None:",
        "            element.next_to(self.last_element, DOWN, buff=buff)",
        "        else:",
        "            element.move_to(ORIGIN)",
        "        self.play(FadeIn(element), run_time=run_time)",
        "        self.last_element = element",
        "        self.element_list.append(element)",
        "        return element",
        "",
        "    def add_elements(self, *elements, buff=0.3, run_time=0.6):",
        "        added = []",
        "        for element in elements:",
        "            added.append(self.add_element(content=element, buff=buff, run_time=run_time))",
        "        return added",
        "",
        "    def hold_scene(self, remaining_duration):",
        "        remaining = max(float(remaining_duration), 0.0)",
        "        if remaining <= 0.15:",
        "            return",
        "        if hasattr(self.camera, 'frame'):",
        "            drift_distance = min(max(self.camera.frame.width * 0.015, 0.08), 0.18)",
        "            self.play(",
        "                self.camera.frame.animate.shift(RIGHT * drift_distance).scale(1.02),",
        "                run_time=remaining,",
        "                rate_func=there_and_back,",
        "            )",
        "            return",
        "        self.wait(remaining)",
        "",
        "    def clear_scene(self, run_time=0.4):",
        "        animations = [FadeOut(mobject) for mobject in list(self.mobjects)]",
        "        if hasattr(self.camera, 'frame') and self._base_camera_width is not None:",
        "            animations.append(",
        "                self.camera.frame.animate.move_to(self._base_camera_center).set(width=self._base_camera_width)",
        "            )",
        "        if animations:",
        "            self.play(*animations, run_time=run_time)",
        "        self.last_element = None",
        "        self.element_list = []",
        "        self.current_scale = 1.0",
        "",
        "",
        f"class {DEFAULT_MANIM_SCENE_CLASS}(FlexibleElementsScene):",
        "    def construct(self):",
    ]
    last_scene_index = len(storyboard.scenes)
    for index, scene in enumerate(storyboard.scenes, start=1):
        title = scene.title.replace('"', '\\"')
        narration = scene.narration[:48].replace('"', '\\"')
        estimated_scene_duration = 1.9 if index < last_scene_index else 1.5
        hold_duration = max(float(scene.duration_hint) - estimated_scene_duration, 0.0)
        lines.extend(
            [
                f"        # {scene.scene_id}: {title}",
                f"        title_{index} = Text('{title}', font_size=32, font='Noto Sans CJK SC')",
                f"        body_{index} = Text('{narration}', font_size=28, font='Noto Sans CJK SC')",
                f"        self.add_elements(title_{index}, body_{index}, run_time=0.5)",
                f"        self.hold_scene({hold_duration:.3f})",
                "",
            ]
        )
        if index < last_scene_index:
            lines.extend(
                [
                    "        self.clear_scene()",
                    "",
                ]
            )
    return "\n".join(lines).strip() + "\n"


def build_default_fix_script(script_content: str) -> str:
    """对 Manim 脚本执行基本的规则修复。"""
    fixed_script = script_content.replace("ShowCreation", "Create")
    if MANIM_IMPORT_LINE not in fixed_script:
        fixed_script = f"{MANIM_IMPORT_LINE}\n\n" + fixed_script
    if "class " not in fixed_script or "(Scene)" not in fixed_script:
        indented = "\n".join(f"    {line}" for line in fixed_script.splitlines() if line.strip())
        fixed_script = f"{MANIM_IMPORT_LINE}\n\nclass {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n" + indented + "\n"
    return ensure_manim_runtime_prelude(fixed_script)
