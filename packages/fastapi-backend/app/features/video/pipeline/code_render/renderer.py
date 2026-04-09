"""Jinja2 模板渲染器，负责将场景代码渲染为完整的 Manim Python 脚本。

提供三种渲染模式:
- ``render_full_script``: 渲染包含所有场景的完整 Manim 脚本。
- ``render_scene_increment``: 将当前场景代码增量拼接到已有代码中。
- ``render_test_script``: 渲染单个场景的测试脚本（纯 Manim，无 TTS 依赖）。
"""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.features.video.pipeline.manim_runtime_prelude import MANIM_RUNTIME_PRELUDE

# 模板目录：与 renderer.py 同级的 templates/
_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


class CodeRenderer:
    """基于 Jinja2 的 Manim 脚本渲染器。

    从 ``templates/`` 目录加载 Jinja2 模板，将场景代码渲染为可执行的
    Manim Python 脚本。语音合成由流水线外部 TTS 阶段负责。
    """

    def __init__(self) -> None:
        """初始化 Jinja2 环境与模板加载器。"""
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            keep_trailing_newline=True,
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._base_template = self._env.get_template("base.j2")
        self._process_template = self._env.get_template("process.j2")
        self._tmp_template = self._env.get_template("tmp.j2")

    def render_full_script(
        self,
        scenes: list[dict],
        video_config: dict,
    ) -> str:
        """渲染包含所有场景的完整 Manim 脚本。

        Args:
            scenes: 场景列表，每个场景需包含 ``scene_code`` 字段，
                可保留 ``voiceText`` 和 ``voiceRole`` 等上游字段，但模板不会消费它们。
            video_config: 视频配置字典，需包含
                ``background_color``、``aspect_ratio`` 字段。

        Returns:
            渲染后的完整 Manim Python 脚本字符串。
        """
        return self._base_template.render(
            scenes=scenes,
            background_color=video_config.get("background_color", '"#1a1a2e"'),
            aspect_ratio=video_config.get("aspect_ratio", "16:9"),
            runtime_prelude=MANIM_RUNTIME_PRELUDE,
        )

    def render_scene_increment(
        self,
        prev_code: str,
        current_scene_code: str,
    ) -> str:
        """将当前场景代码增量拼接到已有代码中。

        Args:
            prev_code: 之前已渲染的代码片段。
            current_scene_code: 当前场景的代码片段。

        Returns:
            拼接后的完整代码字符串。
        """
        return self._process_template.render(
            prev_code=prev_code,
            current_code=current_scene_code,
        )

    def render_test_script(
        self,
        scene_code: str,
        video_config: dict,
    ) -> str:
        """渲染单个场景的测试脚本。

        生成一个最小化的 Manim 脚本，用于验证单场景的 Manim 语法正确性，
        不包含 TTS / VoiceoverScene 依赖。

        Args:
            scene_code: 单个场景的 Manim 代码片段。
            video_config: 视频配置字典，需包含
                ``background_color`` 和 ``aspect_ratio`` 字段。

        Returns:
            渲染后的单场景测试 Manim Python 脚本。
        """
        return self._tmp_template.render(
            current_code_info=scene_code,
            background_color=video_config.get("background_color", '"#1a1a2e"'),
            aspect_ratio=video_config.get("aspect_ratio", "16:9"),
            runtime_prelude=MANIM_RUNTIME_PRELUDE,
        )
