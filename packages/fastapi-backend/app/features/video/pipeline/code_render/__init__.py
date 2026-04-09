"""视频流水线 Jinja2 代码渲染模块。

将场景代码通过 Jinja2 模板渲染为完整的 Manim Python 脚本，
渲染层只负责纯 Manim 脚本组装，TTS 由流水线外部阶段处理。
"""

from __future__ import annotations

from app.features.video.pipeline.code_render.renderer import CodeRenderer

__all__ = ["CodeRenderer"]
