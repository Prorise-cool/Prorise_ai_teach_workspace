"""视频流水线阶段、结果与持久化模型。"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import Field, field_serializer

from app.core.logging import format_trace_timestamp
from app.features.video.pipeline.constants import VIDEO_OUTPUT_FORMAT
from app.features.video.models.base import VideoCamelModel


class VideoStage(StrEnum):
    """视频流水线阶段枚举。"""
    UNDERSTANDING = "understanding"
    SOLVE = "solve"
    STORYBOARD = "storyboard"
    MANIM_GEN = "manim_gen"
    MANIM_FIX = "manim_fix"
    RENDER = "render"
    RENDER_VERIFY = "render_verify"
    TTS = "tts"
    COMPOSE = "compose"
    UPLOAD = "upload"


class VideoStageProfile(VideoCamelModel):
    """视频阶段配置（进度范围与预估耗时）。"""
    stage: VideoStage
    display_label: str
    progress_start: int = Field(ge=0, le=100)
    progress_end: int = Field(ge=0, le=100)
    estimated_duration_seconds: tuple[int, int]
    conditional: bool = False


VIDEO_STAGE_PROFILES: tuple[VideoStageProfile, ...] = (
    VideoStageProfile(
        stage=VideoStage.UNDERSTANDING,
        display_label="理解题目",
        progress_start=0,
        progress_end=8,
        estimated_duration_seconds=(3, 8),
    ),
    VideoStageProfile(
        stage=VideoStage.SOLVE,
        display_label="独立解题",
        progress_start=9,
        progress_end=18,
        estimated_duration_seconds=(5, 15),
    ),
    VideoStageProfile(
        stage=VideoStage.STORYBOARD,
        display_label="生成分镜",
        progress_start=19,
        progress_end=28,
        estimated_duration_seconds=(8, 20),
    ),
    VideoStageProfile(
        stage=VideoStage.MANIM_GEN,
        display_label="生成动画脚本",
        progress_start=29,
        progress_end=42,
        estimated_duration_seconds=(8, 20),
    ),
    VideoStageProfile(
        stage=VideoStage.TTS,
        display_label="生成旁白",
        progress_start=43,
        progress_end=55,
        estimated_duration_seconds=(8, 20),
    ),
    VideoStageProfile(
        stage=VideoStage.MANIM_FIX,
        display_label="修复动画脚本",
        progress_start=56,
        progress_end=60,
        estimated_duration_seconds=(5, 15),
        conditional=True,
    ),
    VideoStageProfile(
        stage=VideoStage.RENDER,
        display_label="渲染动画",
        progress_start=61,
        progress_end=70,
        estimated_duration_seconds=(15, 40),
    ),
    VideoStageProfile(
        stage=VideoStage.RENDER_VERIFY,
        display_label="验证渲染结果",
        progress_start=71,
        progress_end=80,
        estimated_duration_seconds=(10, 60),
        conditional=True,
    ),
    VideoStageProfile(
        stage=VideoStage.COMPOSE,
        display_label="合成视频",
        progress_start=81,
        progress_end=93,
        estimated_duration_seconds=(5, 12),
    ),
    VideoStageProfile(
        stage=VideoStage.UPLOAD,
        display_label="上传结果",
        progress_start=94,
        progress_end=100,
        estimated_duration_seconds=(3, 10),
    ),
)

VIDEO_STAGE_PROFILE_MAP: dict[VideoStage, VideoStageProfile] = {
    profile.stage: profile for profile in VIDEO_STAGE_PROFILES
}


def get_stage_profile(stage: VideoStage | str) -> VideoStageProfile:
    """根据阶段名获取对应的阶段配置。"""
    return VIDEO_STAGE_PROFILE_MAP[VideoStage(stage)]


def resolve_stage_progress(stage: VideoStage | str, ratio: float) -> tuple[int, int]:
    """根据阶段和内部进度比例计算绝对进度值。"""
    profile = get_stage_profile(stage)
    normalized_ratio = max(0.0, min(float(ratio), 1.0))
    absolute_progress = round(
        profile.progress_start + (profile.progress_end - profile.progress_start) * normalized_ratio
    )
    stage_progress = round(normalized_ratio * 100)
    return absolute_progress, stage_progress


class SolutionStep(VideoCamelModel):
    """解题步骤数据。"""
    step_id: str
    title: str
    explanation: str


class UnderstandingResult(VideoCamelModel):
    """题目理解阶段输出。"""
    topic_summary: str
    knowledge_points: list[str]
    solution_steps: list[SolutionStep]
    difficulty: str
    subject: str
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class SolveResult(VideoCamelModel):
    """独立解题阶段输出（参考答案 + 详细步骤）。"""
    reference_answer: str
    solution_steps: list[SolutionStep]
    reasoning_trace: str = ""
    is_fallback: bool = False
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class Scene(VideoCamelModel):
    """分镜场景数据。

    voice_text: TTS 语音文本（数学符号口语化，如 x² → "x的平方"）。
    image_desc: Manim 场景视觉描述（公式用 LaTeX）。
    voice_role: TTS 音色角色标识。
    """

    scene_id: str
    title: str
    narration: str
    visual_description: str
    duration_hint: int = Field(default=0, ge=0)
    order: int = Field(ge=1)
    voice_text: str = ""
    image_desc: str = ""
    voice_role: str = "default_teacher"


class VideoConfig(VideoCamelModel):
    """视频渲染配置。"""

    # Transparent export depends on the Manim CLI `--transparent` flag.
    # Keep the scene background unset here so prompts do not force an opaque backdrop.
    background_color: str | None = None
    aspect_ratio: str = "16:9"
    quality: str = "m"


class Storyboard(VideoCamelModel):
    """完整分镜脚本。"""

    scenes: list[Scene]
    total_duration: int = Field(default=0, ge=0)
    target_duration: int = Field(default=0, ge=0)
    video_config: VideoConfig = Field(default_factory=VideoConfig)
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class SceneCodeMapping(VideoCamelModel):
    """场景与 Manim 脚本行号映射。"""
    scene_id: str
    title: str
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)


class ManimCodeResult(VideoCamelModel):
    """Manim 脚本生成结果。"""
    script_content: str
    scene_mapping: list[SceneCodeMapping]
    scenes_data: list[dict[str, Any]] = Field(default_factory=list)
    video_config: dict[str, Any] = Field(default_factory=dict)
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class SceneGenerationContext(VideoCamelModel):
    """逐场景代码生成上下文，用于增量拼接。"""

    scene_id: str
    scene_code: str
    prev_code_summary: str = ""


class FixResult(VideoCamelModel):
    """脚本修复结果。"""
    fixed: bool
    fixed_script: str | None = None
    strategy: Literal["rule", "llm"]
    error_type: str
    notes: str | None = None


class FixLogEntry(VideoCamelModel):
    """脚本修复日志条目。"""
    attempt_no: int = Field(ge=1)
    strategy: Literal["rule", "llm"]
    error_type: str
    success: bool
    timestamp: str = Field(default_factory=format_trace_timestamp)
    message: str


class AudioSegment(VideoCamelModel):
    """单场景音频片段。"""
    scene_id: str
    audio_path: str
    duration: int = Field(ge=1)
    format: str


class VoiceConfig(VideoCamelModel):
    """TTS 音色与编码配置。"""
    language: str = "zh-CN"
    voice_id: str = "demo-voice"
    speed: float = 1.0
    format: str = "mp3"
    sample_rate: int = 44100
    bitrate: str = "192k"
    volume_ratio: float = 1.0
    pitch_ratio: float = 1.0


class TTSResult(VideoCamelModel):
    """TTS 合成结果。"""
    audio_segments: list[AudioSegment]
    total_duration: int = Field(ge=1)
    provider_used: list[str]
    failover_occurred: bool = False
    generated_at: str = Field(default_factory=format_trace_timestamp)


class ComposeResult(VideoCamelModel):
    """视频合成结果。"""
    video_path: str
    cover_path: str
    duration: int = Field(ge=1)
    file_size: int = Field(ge=1)
    format: str = VIDEO_OUTPUT_FORMAT


class UploadResult(VideoCamelModel):
    """视频上传结果。"""
    video_url: str
    cover_url: str
    expires_at: str | None = None
    uploaded_at: str = Field(default_factory=format_trace_timestamp)


class VideoResult(VideoCamelModel):
    """视频生成最终结果。"""
    task_id: str
    task_type: str = "video"
    video_url: str
    cover_url: str
    duration: int = Field(ge=1)
    summary: str
    knowledge_points: list[str]
    result_id: str
    completed_at: str
    ai_content_flag: bool = True
    title: str
    provider_used: dict[str, Any] = Field(default_factory=dict)
    task_elapsed_seconds: int | None = Field(default=None, ge=1)
    render_summary: dict[str, Any] = Field(default_factory=dict)


class VideoFailure(VideoCamelModel):
    """视频任务失败详情。"""
    task_id: str
    error_code: str
    error_message: str
    failed_stage: VideoStage
    failed_at: str
    retryable: bool


class ArtifactType(StrEnum):
    """产物类型枚举。"""
    TIMELINE = "timeline"
    STORYBOARD = "storyboard"
    NARRATION = "narration"
    KNOWLEDGE_POINTS = "knowledge_points"
    SOLUTION_STEPS = "solution_steps"
    MANIM_CODE = "manim_code"


class ArtifactPayload(VideoCamelModel):
    """单条产物数据载体。"""
    artifact_type: ArtifactType
    data: dict[str, Any]
    version: str = "1.0"
    created_at: str = Field(default_factory=format_trace_timestamp)


class VideoArtifactGraph(VideoCamelModel):
    """视频产物图谱（聚合所有产物）。"""
    session_id: str
    session_type: Literal["video"] = "video"
    artifacts: list[ArtifactPayload]
    created_at: str = Field(default_factory=format_trace_timestamp)
    version: str = "1.0"


class PublishState(VideoCamelModel):
    """公开发布状态数据。"""
    published: bool = False
    published_at: str | None = None
    author_name: str | None = None


class VideoPreviewSectionStatus(StrEnum):
    """等待页分段预览状态。"""

    PENDING = "pending"
    GENERATING = "generating"
    RENDERING = "rendering"
    FIXING = "fixing"
    READY = "ready"
    FAILED = "failed"


class VideoPreviewSection(VideoCamelModel):
    """单个 section 的渐进预览状态。"""

    section_id: str
    section_index: int = Field(ge=0)
    title: str
    lecture_lines: list[str] = Field(default_factory=list)
    status: VideoPreviewSectionStatus = VideoPreviewSectionStatus.PENDING
    audio_url: str | None = None
    clip_url: str | None = None
    error_message: str | None = None
    fix_attempt: int | None = Field(default=None, ge=1)
    updated_at: str = Field(default_factory=format_trace_timestamp)


class VideoTaskPreview(VideoCamelModel):
    """视频任务等待页渐进预览数据。"""

    task_id: str
    status: Literal["processing", "completed", "failed", "cancelled"] = "processing"
    preview_available: bool = False
    preview_version: int = Field(default=0, ge=0)
    summary: str = ""
    knowledge_points: list[str] = Field(default_factory=list)
    total_sections: int = Field(default=0, ge=0)
    ready_sections: int = Field(default=0, ge=0)
    failed_sections: int = Field(default=0, ge=0)
    sections: list[VideoPreviewSection] = Field(default_factory=list)
    updated_at: str = Field(default_factory=format_trace_timestamp)


class VideoResultDetail(VideoCamelModel):
    """视频任务完整结果详情。"""
    task_id: str
    status: Literal["processing", "completed", "failed"]
    result: VideoResult | None = None
    failure: VideoFailure | None = None
    publish_state: PublishState = Field(default_factory=PublishState)
    artifact_writeback_failed: bool = False
    long_term_writeback_failed: bool = False
    updated_at: str = Field(default_factory=format_trace_timestamp)


class PublishedVideoCard(VideoCamelModel):
    """已发布视频卡片（列表展示用）。"""
    result_id: str
    title: str
    summary: str
    knowledge_points: list[str]
    cover_url: str
    duration: int = Field(ge=1)
    published_at: str
    author_name: str | None = None


class PublishedVideoCardPage(VideoCamelModel):
    """已发布视频卡片分页。"""
    rows: list[PublishedVideoCard]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)


class PublishOperationResult(VideoCamelModel):
    """发布/取消发布操作结果。"""
    task_id: str
    published: bool
    card: PublishedVideoCard | None = None
    published_at: str | None = None


class VideoResultDetailResponseEnvelope(VideoCamelModel):
    """视频结果详情响应信封。"""
    code: int = 200
    msg: str = "查询成功"
    data: VideoResultDetail


class VideoTaskPreviewResponseEnvelope(VideoCamelModel):
    """视频任务渐进预览响应信封。"""

    code: int = 200
    msg: str = "查询成功"
    data: VideoTaskPreview


class PublishOperationResponseEnvelope(VideoCamelModel):
    """发布操作响应信封。"""
    code: int = 200
    msg: str = "操作成功"
    data: PublishOperationResult


class PublishedVideoPageResponseEnvelope(VideoCamelModel):
    """已发布视频分页响应信封。"""
    code: int = 200
    msg: str = "查询成功"
    data: PublishedVideoCardPage


class VideoStageSnapshot(VideoCamelModel):
    """视频阶段进度快照。"""
    stage: VideoStage
    current_stage: VideoStage
    stage_label: str
    stage_progress: int = Field(ge=0, le=100)
    progress: int = Field(ge=0, le=100)


def build_stage_snapshot(stage: VideoStage | str, ratio: float) -> VideoStageSnapshot:
    """构建阶段进度快照。"""
    normalized_stage = VideoStage(stage)
    absolute_progress, stage_progress = resolve_stage_progress(normalized_stage, ratio)
    profile = get_stage_profile(normalized_stage)
    return VideoStageSnapshot(
        stage=normalized_stage,
        current_stage=normalized_stage,
        stage_label=profile.display_label,
        stage_progress=stage_progress,
        progress=absolute_progress,
    )


def normalize_storyboard_duration(
    scenes: list[Scene],
    *,
    target_duration: int,
) -> list[Scene]:
    """将分镜场景时长缩放对齐到目标总时长。"""
    if not scenes:
        return []

    bounded_target = max(90, min(target_duration, 180))
    original_total = sum(scene.duration_hint for scene in scenes)
    if original_total == bounded_target:
        return scenes

    if original_total <= 0:
        even_duration = max(1, bounded_target // len(scenes))
        return [
            scene.model_copy(update={"duration_hint": even_duration})
            for scene in scenes
        ]

    scaled: list[Scene] = []
    for scene in scenes:
        ratio = scene.duration_hint / original_total
        scaled_duration = max(1, round(bounded_target * ratio))
        scaled.append(scene.model_copy(update={"duration_hint": scaled_duration}))

    adjusted_total = sum(scene.duration_hint for scene in scaled)
    index = 0
    while adjusted_total != bounded_target and scaled:
        scene = scaled[index % len(scaled)]
        if adjusted_total > bounded_target and scene.duration_hint > 1:
            scaled[index % len(scaled)] = scene.model_copy(update={"duration_hint": scene.duration_hint - 1})
            adjusted_total -= 1
        elif adjusted_total < bounded_target:
            scaled[index % len(scaled)] = scene.model_copy(update={"duration_hint": scene.duration_hint + 1})
            adjusted_total += 1
        index += 1

    return scaled


class JsonSchemaTimestampMixin(VideoCamelModel):
    """带 generated_at 序列化的混入基类。"""
    generated_at: str = Field(default_factory=format_trace_timestamp)

    @field_serializer("generated_at", when_used="json")
    def serialize_generated_at(self, value: str) -> str:
        return value


def utc_iso(dt: datetime) -> str:
    """将 datetime 格式化为 UTC ISO 字符串。"""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
