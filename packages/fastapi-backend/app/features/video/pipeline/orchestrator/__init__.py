"""视频流水线编排器。

``VideoPipelineService`` 是整个视频生成流水线的顶层入口，
负责协调理解、分镜、Manim、渲染、TTS、合成、上传各阶段的执行顺序、
SSE 事件推送、错误处理和结果持久化。
"""

from .coordinator import VideoPipelineService, get_video_pipeline_service

__all__ = [
    "VideoPipelineService",
    "get_video_pipeline_service",
]
