"""视频流水线共享常量。"""

from __future__ import annotations

MANIM_IMPORT_LINE = "from manim import *"
DEFAULT_MANIM_SCENE_CLASS = "GeneratedLesson"
DEFAULT_FIXED_SCENE_CLASS = "FixedLesson"

VIDEO_RESULT_DETAIL_TEMPLATE = "video/{task_id}/result-detail.json"
VIDEO_ARTIFACT_GRAPH_TEMPLATE = "video/{task_id}/artifact-graph.json"

# Output format for Manim renders and final composed video.
# WebM with alpha channel (VP8+libvorbis) for transparent background support.
VIDEO_OUTPUT_FORMAT = "webm"

# ── ManimCat-aligned generation constants ───────────────────────

DESIGNER_TEMPERATURE = 0.8
DESIGNER_MAX_TOKENS = None
DESIGNER_THINKING_TOKENS = None

CODER_TEMPERATURE = 0.7
CODER_MAX_TOKENS = None
CODER_THINKING_TOKENS = None

MAX_RENDER_RETRIES = 4  # ManimCat render-with-retry max
DOOM_LOOP_THRESHOLD = 3  # Same error N times = doom loop

# Error sanitizer limits (ManimCat render-failure/sanitizer.ts)
STDERR_LIMIT = 4096
STDOUT_LIMIT = 2048
