"""视频生成管线服务——统一导出入口。

基于 Code2Video TeachingVideoAgent 的全新实现。
保留 re-export 以兼容现有 import 路径。
"""
from __future__ import annotations

# --- 异常 ---
from app.features.video.pipeline.errors import VideoPipelineError

# --- 编排器 ---
from app.features.video.pipeline.orchestrator import (
    VideoPipelineService,
    get_video_pipeline_service,
)

__all__ = [
    "VideoPipelineError",
    "VideoPipelineService",
    "get_video_pipeline_service",
]
