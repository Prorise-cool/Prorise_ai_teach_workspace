"""视频生成管线服务——统一导出入口。

实际实现已按职责拆分到子模块，本文件保留 re-export 以兼容现有 import 路径。

子模块清单:
- ``errors``            — VideoPipelineError
- ``understanding``     — UnderstandingService
- ``storyboard``        — StoryboardService
- ``manim``             — ManimGenerationService / RuleBasedFixer / LLMBasedFixer
- ``tts``               — TTSService
- ``compose``           — ComposeService / SubtitleEntry
- ``upload``            — UploadService
- ``artifact_writeback``— ArtifactWritebackService
- ``orchestrator``      — VideoPipelineService / get_video_pipeline_service
- ``_helpers``          — 内部共享工具函数
"""

from __future__ import annotations

import asyncio as asyncio  # noqa: F811, PLC0414 — 保留供测试 monkeypatch 路径兼容

# --- 内部工具函数（测试中有直接引用） ---
from app.features.video.pipeline._helpers import (
    cleanup_pipeline_temp_dirs as _cleanup_pipeline_temp_dirs,
)
from app.features.video.pipeline.artifact_writeback import ArtifactWritebackService
from app.features.video.pipeline.compose import ComposeService, SubtitleEntry

# --- 异常 ---
from app.features.video.pipeline.errors import VideoPipelineError
from app.features.video.pipeline.manim import (
    LLMBasedFixer,
    ManimGenerationService,
    RuleBasedFixer,
)

# --- 编排器 ---
from app.features.video.pipeline.orchestrator import (
    VideoPipelineService,
    get_video_pipeline_service,
)
from app.features.video.pipeline.storyboard import StoryboardService
from app.features.video.pipeline.tts import TTSService

# --- 子服务 ---
from app.features.video.pipeline.understanding import UnderstandingService
from app.features.video.pipeline.upload import UploadService

__all__ = [
    "ArtifactWritebackService",
    "ComposeService",
    "LLMBasedFixer",
    "ManimGenerationService",
    "RuleBasedFixer",
    "StoryboardService",
    "SubtitleEntry",
    "TTSService",
    "UnderstandingService",
    "UploadService",
    "VideoPipelineError",
    "VideoPipelineService",
    "get_video_pipeline_service",
    "_cleanup_pipeline_temp_dirs",
]
