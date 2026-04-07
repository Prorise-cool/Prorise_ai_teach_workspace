"""视频流水线阶段、结果与持久化模型。"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import Field, field_serializer

from app.core.logging import format_trace_timestamp
from app.features.video.modeling import VideoCamelModel


class VideoStage(StrEnum):
    UNDERSTANDING = "understanding"
    STORYBOARD = "storyboard"
    MANIM_GEN = "manim_gen"
    MANIM_FIX = "manim_fix"
    RENDER = "render"
    TTS = "tts"
    COMPOSE = "compose"
    UPLOAD = "upload"


class VideoStageProfile(VideoCamelModel):
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
        progress_end=12,
        estimated_duration_seconds=(3, 8),
    ),
    VideoStageProfile(
        stage=VideoStage.STORYBOARD,
        display_label="生成分镜",
        progress_start=13,
        progress_end=25,
        estimated_duration_seconds=(5, 10),
    ),
    VideoStageProfile(
        stage=VideoStage.MANIM_GEN,
        display_label="生成动画脚本",
        progress_start=26,
        progress_end=45,
        estimated_duration_seconds=(8, 20),
    ),
    VideoStageProfile(
        stage=VideoStage.MANIM_FIX,
        display_label="修复动画脚本",
        progress_start=46,
        progress_end=55,
        estimated_duration_seconds=(5, 15),
        conditional=True,
    ),
    VideoStageProfile(
        stage=VideoStage.RENDER,
        display_label="渲染动画",
        progress_start=56,
        progress_end=70,
        estimated_duration_seconds=(15, 40),
    ),
    VideoStageProfile(
        stage=VideoStage.TTS,
        display_label="生成旁白",
        progress_start=71,
        progress_end=84,
        estimated_duration_seconds=(8, 20),
    ),
    VideoStageProfile(
        stage=VideoStage.COMPOSE,
        display_label="合成视频",
        progress_start=85,
        progress_end=94,
        estimated_duration_seconds=(5, 12),
    ),
    VideoStageProfile(
        stage=VideoStage.UPLOAD,
        display_label="上传结果",
        progress_start=95,
        progress_end=100,
        estimated_duration_seconds=(3, 10),
    ),
)

VIDEO_STAGE_PROFILE_MAP: dict[VideoStage, VideoStageProfile] = {
    profile.stage: profile for profile in VIDEO_STAGE_PROFILES
}


def get_stage_profile(stage: VideoStage | str) -> VideoStageProfile:
    return VIDEO_STAGE_PROFILE_MAP[VideoStage(stage)]


def resolve_stage_progress(stage: VideoStage | str, ratio: float) -> tuple[int, int]:
    profile = get_stage_profile(stage)
    normalized_ratio = max(0.0, min(float(ratio), 1.0))
    absolute_progress = round(
        profile.progress_start + (profile.progress_end - profile.progress_start) * normalized_ratio
    )
    stage_progress = round(normalized_ratio * 100)
    return absolute_progress, stage_progress


class SolutionStep(VideoCamelModel):
    step_id: str
    title: str
    explanation: str


class UnderstandingResult(VideoCamelModel):
    topic_summary: str
    knowledge_points: list[str]
    solution_steps: list[SolutionStep]
    difficulty: str
    subject: str
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class Scene(VideoCamelModel):
    scene_id: str
    title: str
    narration: str
    visual_description: str
    duration_hint: int = Field(ge=1)
    order: int = Field(ge=1)


class Storyboard(VideoCamelModel):
    scenes: list[Scene]
    total_duration: int = Field(ge=1)
    target_duration: int = Field(ge=90, le=180)
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class SceneCodeMapping(VideoCamelModel):
    scene_id: str
    title: str
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)


class ManimCodeResult(VideoCamelModel):
    script_content: str
    scene_mapping: list[SceneCodeMapping]
    provider_used: str
    generated_at: str = Field(default_factory=format_trace_timestamp)


class FixResult(VideoCamelModel):
    fixed: bool
    fixed_script: str | None = None
    strategy: Literal["rule", "llm"]
    error_type: str
    notes: str | None = None


class FixLogEntry(VideoCamelModel):
    attempt_no: int = Field(ge=1)
    strategy: Literal["rule", "llm"]
    error_type: str
    success: bool
    timestamp: str = Field(default_factory=format_trace_timestamp)
    message: str


class ResourceLimits(VideoCamelModel):
    cpu_count: float = Field(default=1.0, ge=1.0)
    memory_mb: int = Field(default=2048, ge=512)
    timeout_seconds: int = Field(default=120, ge=1)
    tmp_size_mb: int = Field(default=1024, ge=128)
    allow_network: bool = False
    allow_subprocess: bool = False


class ExecutionResult(VideoCamelModel):
    success: bool
    output_path: str | None = None
    stderr: str | None = None
    exit_code: int | None = None
    duration_seconds: float = 0.0
    resource_usage: dict[str, Any] = Field(default_factory=dict)
    error_type: str | None = None


class AudioSegment(VideoCamelModel):
    scene_id: str
    audio_path: str
    duration: int = Field(ge=1)
    format: str


class VoiceConfig(VideoCamelModel):
    language: str = "zh-CN"
    voice_id: str = "demo-voice"
    speed: float = 1.0
    format: str = "mp3"
    sample_rate: int = 44100
    bitrate: str = "192k"
    volume_ratio: float = 1.0
    pitch_ratio: float = 1.0


class TTSResult(VideoCamelModel):
    audio_segments: list[AudioSegment]
    total_duration: int = Field(ge=1)
    provider_used: list[str]
    failover_occurred: bool = False
    generated_at: str = Field(default_factory=format_trace_timestamp)


class ComposeResult(VideoCamelModel):
    video_path: str
    cover_path: str
    duration: int = Field(ge=1)
    file_size: int = Field(ge=1)
    format: str = "mp4"


class UploadResult(VideoCamelModel):
    video_url: str
    cover_url: str
    expires_at: str | None = None
    uploaded_at: str = Field(default_factory=format_trace_timestamp)


class VideoResult(VideoCamelModel):
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


class VideoFailure(VideoCamelModel):
    task_id: str
    error_code: str
    error_message: str
    failed_stage: VideoStage
    failed_at: str
    retryable: bool


class ArtifactType(StrEnum):
    TIMELINE = "timeline"
    STORYBOARD = "storyboard"
    NARRATION = "narration"
    KNOWLEDGE_POINTS = "knowledge_points"
    SOLUTION_STEPS = "solution_steps"
    MANIM_CODE = "manim_code"


class ArtifactPayload(VideoCamelModel):
    artifact_type: ArtifactType
    data: dict[str, Any]
    version: str = "1.0"
    created_at: str = Field(default_factory=format_trace_timestamp)


class VideoArtifactGraph(VideoCamelModel):
    session_id: str
    session_type: Literal["video"] = "video"
    artifacts: list[ArtifactPayload]
    created_at: str = Field(default_factory=format_trace_timestamp)
    version: str = "1.0"


class PublishState(VideoCamelModel):
    published: bool = False
    published_at: str | None = None
    author_name: str | None = None


class VideoResultDetail(VideoCamelModel):
    task_id: str
    status: Literal["processing", "completed", "failed"]
    result: VideoResult | None = None
    failure: VideoFailure | None = None
    publish_state: PublishState = Field(default_factory=PublishState)
    artifact_writeback_failed: bool = False
    long_term_writeback_failed: bool = False
    updated_at: str = Field(default_factory=format_trace_timestamp)


class PublishedVideoCard(VideoCamelModel):
    result_id: str
    title: str
    summary: str
    knowledge_points: list[str]
    cover_url: str
    duration: int = Field(ge=1)
    published_at: str
    author_name: str | None = None


class PublishedVideoCardPage(VideoCamelModel):
    rows: list[PublishedVideoCard]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)


class PublishOperationResult(VideoCamelModel):
    task_id: str
    published: bool
    card: PublishedVideoCard | None = None
    published_at: str | None = None


class VideoResultDetailResponseEnvelope(VideoCamelModel):
    code: int = 200
    msg: str = "查询成功"
    data: VideoResultDetail


class PublishOperationResponseEnvelope(VideoCamelModel):
    code: int = 200
    msg: str = "操作成功"
    data: PublishOperationResult


class PublishedVideoPageResponseEnvelope(VideoCamelModel):
    code: int = 200
    msg: str = "查询成功"
    data: PublishedVideoCardPage


class VideoStageSnapshot(VideoCamelModel):
    stage: VideoStage
    current_stage: VideoStage
    stage_label: str
    stage_progress: int = Field(ge=0, le=100)
    progress: int = Field(ge=0, le=100)


def build_stage_snapshot(stage: VideoStage | str, ratio: float) -> VideoStageSnapshot:
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
    generated_at: str = Field(default_factory=format_trace_timestamp)

    @field_serializer("generated_at", when_used="json")
    def serialize_generated_at(self, value: str) -> str:
        return value


def utc_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
