"""视频流水线核心服务实现。"""

from __future__ import annotations

import asyncio
import json
import math
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from app.core.config import Settings, get_settings
from app.core.logging import format_trace_timestamp, get_logger
from app.features.video.pipeline.audio import decode_audio_payload, write_silent_wav
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.constants import (
    VIDEO_ARTIFACT_GRAPH_TEMPLATE,
    VIDEO_RESULT_DETAIL_TEMPLATE,
)
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    AudioSegment,
    ComposeResult,
    ExecutionResult,
    FixLogEntry,
    FixResult,
    ManimCodeResult,
    PublishState,
    ResourceLimits,
    Scene,
    SceneCodeMapping,
    SolutionStep,
    Storyboard,
    TTSResult,
    UnderstandingResult,
    UploadResult,
    VideoArtifactGraph,
    VideoResult,
    VideoResultDetail,
    VideoStage,
    VoiceConfig,
    build_stage_snapshot,
    get_stage_profile,
    normalize_storyboard_duration,
)
from app.features.video.pipeline.runtime import (
    VideoRuntimeStateStore,
    build_failure,
    build_stage_context,
)
from app.features.video.runtime_auth import delete_video_runtime_auth, load_video_runtime_auth
from app.features.video.pipeline.script_templates import build_default_fix_script, build_default_manim_script
from app.features.video.pipeline.sandbox import (
    DockerSandboxExecutor,
    LocalSandboxExecutor,
    SandboxExecutor,
    ScriptSecurityViolation,
)
from app.features.video.service import VideoService
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService
from app.providers.factory import ProviderFactory, get_provider_factory
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    coerce_task_error_code,
)

logger = get_logger("app.features.video.pipeline")
JSON_OBJECT_PATTERN = re.compile(r"\{.*\}", re.DOTALL)
CODE_BLOCK_PATTERN = re.compile(r"```(?:python)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)
FAKE_RENDER_BYTES = b"FAKE_MP4_DATA"
SUBTITLE_MAX_CHARS_PER_LINE = 20
SUBTITLE_FONT_NAME = "Source Han Sans CN"
SUBTITLE_FONT_SIZE = 24


@dataclass(slots=True)
class SubtitleEntry:
    start_seconds: float
    end_seconds: float
    text: str


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _first_non_empty(parts: Iterable[str | None], fallback: str) -> str:
    for part in parts:
        if part and part.strip():
            return part.strip()
    return fallback


def _extract_json_object(raw_content: str) -> dict[str, Any] | None:
    matched = JSON_OBJECT_PATTERN.search(raw_content)
    if matched is None:
        return None
    try:
        payload = json.loads(matched.group(0))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _extract_code(raw_content: str) -> str | None:
    matched = CODE_BLOCK_PATTERN.search(raw_content)
    if matched is not None:
        content = matched.group(1).strip()
        return content or None
    return raw_content.strip() or None


def _unique_preserve_order(values: Iterable[str]) -> list[str]:
    results: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        results.append(normalized)
    return results


def _read_text(*values: object) -> str | None:
    for value in values:
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
    return None


def _read_mapping_value(mapping: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in mapping:
            value = mapping[key]
            if value is not None:
                return value
    return None


def _provider_settings(provider: Any) -> Mapping[str, Any]:
    config = getattr(provider, "config", None)
    settings = getattr(config, "settings", None)
    return settings if isinstance(settings, Mapping) else {}


def _coerce_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _is_fake_render_video(path: Path) -> bool:
    try:
        if path.stat().st_size != len(FAKE_RENDER_BYTES):
            return False
        with path.open("rb") as file:
            return file.read(len(FAKE_RENDER_BYTES)) == FAKE_RENDER_BYTES
    except OSError:
        return False


def _probe_media_duration_seconds(path: Path) -> float | None:
    if shutil.which("ffprobe") is None or not path.exists():
        return None

    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    if completed.returncode != 0:
        return None
    try:
        duration = float(completed.stdout.strip())
    except ValueError:
        return None
    return duration if duration > 0 else None


def _round_duration_seconds(duration_seconds: float) -> int:
    return max(int(math.ceil(duration_seconds)), 1)


def _format_srt_timestamp(duration_seconds: float) -> str:
    total_milliseconds = max(int(round(duration_seconds * 1000)), 0)
    hours, remainder = divmod(total_milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def _split_subtitle_text(text: str, *, max_chars_per_line: int) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) <= max_chars_per_line:
        return [normalized] if normalized else []

    segments: list[str] = []
    current_segment = ""
    primary_punctuation = ["。", "？", "！", "!", "；", ";"]
    secondary_punctuation = ["，", "、", "：", ":", ",", " "]

    for char in normalized:
        current_segment += char
        if len(current_segment) < max_chars_per_line:
            continue

        latest_primary = max((current_segment.rfind(symbol) for symbol in primary_punctuation), default=-1)
        if latest_primary > max_chars_per_line // 2:
            segments.append(current_segment[: latest_primary + 1].strip())
            current_segment = current_segment[latest_primary + 1 :].strip()
            continue

        latest_secondary = max((current_segment.rfind(symbol) for symbol in secondary_punctuation), default=-1)
        if latest_secondary > max_chars_per_line // 2:
            segments.append(current_segment[: latest_secondary + 1].strip())
            current_segment = current_segment[latest_secondary + 1 :].strip()
            continue

        segments.append(current_segment.strip())
        current_segment = ""

    if current_segment:
        segments.append(current_segment.strip())
    return [segment for segment in segments if segment]


def _escape_ass_text(text: str) -> str:
    return text.replace("\\", r"\\").replace("{", r"\{").replace("}", r"\}")


def _escape_ffmpeg_filter_path(path: str) -> str:
    return (
        path.replace("\\", r"\\")
        .replace(":", r"\:")
        .replace(",", r"\,")
        .replace("'", r"\'")
    )


def _split_sentences(text: str) -> list[str]:
    chunks = re.split(r"[。！？\n]+", text)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def _is_pipeline_temp_dir(path: Path) -> bool:
    return path.name.startswith(("video_", "video_tts_", "video_compose_"))


def _cleanup_pipeline_temp_dirs(*file_paths: str | None) -> None:
    directories: set[Path] = set()
    for file_path in file_paths:
        if not file_path:
            continue
        directory = Path(file_path).expanduser().resolve().parent
        if _is_pipeline_temp_dir(directory):
            directories.add(directory)

    for directory in sorted(directories, key=lambda item: len(str(item)), reverse=True):
        shutil.rmtree(directory, ignore_errors=True)


def _infer_subject(text: str) -> str:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ("函数", "导数", "积分", "几何", "概率", "数学")):
        return "math"
    if any(keyword in lowered for keyword in ("物理", "速度", "力学", "电路")):
        return "physics"
    if any(keyword in lowered for keyword in ("化学", "离子", "方程式")):
        return "chemistry"
    return "general"


def _infer_difficulty(text: str) -> str:
    if len(text) > 120:
        return "hard"
    if len(text) > 60:
        return "medium"
    return "easy"


def _extract_source_text(source_payload: dict[str, object]) -> str:
    if isinstance(source_payload.get("text"), str):
        return source_payload["text"].strip()
    image_ref = source_payload.get("imageRef")
    ocr_text = source_payload.get("ocrText")
    return _first_non_empty(
        [
            ocr_text if isinstance(ocr_text, str) else None,
            f"请解析图片题目：{image_ref}" if isinstance(image_ref, str) else None,
        ],
        fallback="请解析输入题目",
    )


def _build_title(summary: str) -> str:
    cleaned = re.sub(r"\s+", " ", summary).strip()
    return cleaned[:48] if len(cleaned) > 48 else cleaned


def _serialize_datetime(value: datetime) -> str:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def _build_default_understanding(
    *,
    source_text: str,
    provider_used: str,
    user_profile: dict[str, object],
) -> UnderstandingResult:
    summary = _first_non_empty(_split_sentences(source_text), fallback=source_text[:120] or "题目解析")
    subject = str(user_profile.get("subject") or _infer_subject(source_text))
    difficulty = str(user_profile.get("difficulty") or _infer_difficulty(source_text))
    sentences = _split_sentences(source_text)
    knowledge_points = _unique_preserve_order(
        [
            str(user_profile.get("focusPoint") or ""),
            f"{subject} 核心概念",
            "题干信息提取",
            "分步讲解",
            *[sentence[:18] for sentence in sentences[:3]],
        ]
    )
    solution_steps = [
        SolutionStep(
            step_id=f"step_{index + 1}",
            title=f"步骤 {index + 1}",
            explanation=sentence,
        )
        for index, sentence in enumerate(sentences[:4] or [summary])
    ]
    return UnderstandingResult(
        topic_summary=summary,
        knowledge_points=knowledge_points or ["核心知识点提炼"],
        solution_steps=solution_steps,
        difficulty=difficulty,
        subject=subject,
        provider_used=provider_used,
    )


def _build_default_storyboard(
    *,
    understanding: UnderstandingResult,
    target_duration: int,
    provider_used: str,
) -> Storyboard:
    raw_scenes = [
        Scene(
            scene_id="scene_1",
            title="题目引入",
            narration=f"我们先理解题目：{understanding.topic_summary}",
            visual_description="展示题目关键条件，并标注求解目标。",
            duration_hint=24,
            order=1,
        ),
        Scene(
            scene_id="scene_2",
            title="知识点定位",
            narration=f"这道题重点涉及：{'、'.join(understanding.knowledge_points[:3])}",
            visual_description="逐项高亮核心知识点，并建立与题目条件的对应关系。",
            duration_hint=28,
            order=2,
        ),
    ]
    for index, step in enumerate(understanding.solution_steps[:3], start=3):
        raw_scenes.append(
            Scene(
                scene_id=f"scene_{index}",
                title=step.title,
                narration=step.explanation,
                visual_description=f"用动画方式演示 {step.title}，并在画面上逐步展开推理。",
                duration_hint=22,
                order=index,
            )
        )
    raw_scenes.append(
        Scene(
            scene_id=f"scene_{len(raw_scenes) + 1}",
            title="总结回顾",
            narration="最后回顾解题思路，帮助你记住关键方法。",
            visual_description="总结解法、知识点与常见易错点。",
            duration_hint=20,
            order=len(raw_scenes) + 1,
        )
    )
    scenes = normalize_storyboard_duration(raw_scenes, target_duration=target_duration)
    return Storyboard(
        scenes=scenes,
        total_duration=sum(scene.duration_hint for scene in scenes),
        target_duration=max(90, min(target_duration, 180)),
        provider_used=provider_used,
    )


def _normalize_scene_payload(scene: dict[str, Any], index: int) -> dict[str, Any]:
    title = scene.get("title") or scene.get("name") or scene.get("topic") or f"步骤 {index + 1}"
    narration = scene.get("narration") or scene.get("voiceover") or scene.get("explanation") or scene.get("dialogue")
    visual_description = (
        scene.get("visualDescription")
        or scene.get("visual")
        or scene.get("sceneDescription")
        or scene.get("content")
        or scene.get("description")
    )
    duration_hint = (
        scene.get("durationHint")
        or scene.get("duration")
        or scene.get("durationSeconds")
        or scene.get("estimatedDuration")
    )

    normalized_narration = str(narration or title).strip()
    normalized_visual = str(visual_description or normalized_narration).strip()
    try:
        normalized_duration = max(1, int(float(duration_hint))) if duration_hint is not None else 20
    except (TypeError, ValueError):
        normalized_duration = 20

    return {
        **scene,
        "sceneId": scene.get("sceneId") or scene.get("scene_id") or f"scene_{index + 1}",
        "title": str(title).strip() or f"步骤 {index + 1}",
        "narration": normalized_narration,
        "visualDescription": normalized_visual,
        "durationHint": normalized_duration,
        "order": int(scene.get("order") or index + 1),
    }


def _result_storage_key(task_id: str) -> str:
    return VIDEO_RESULT_DETAIL_TEMPLATE.format(task_id=task_id)


def _artifact_storage_key(task_id: str) -> str:
    return VIDEO_ARTIFACT_GRAPH_TEMPLATE.format(task_id=task_id)


class VideoPipelineError(Exception):
    def __init__(
        self,
        *,
        stage: VideoStage,
        error_code: TaskErrorCode,
        message: str,
        progress_ratio: float = 1.0,
    ) -> None:
        super().__init__(message)
        self.stage = stage
        self.error_code = error_code
        self.progress_ratio = progress_ratio


@dataclass(slots=True)
class UnderstandingService:
    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
        emit_switch=None,
    ) -> UnderstandingResult:
        source_text = _extract_source_text(source_payload)
        prompt = (
            "请把题目理解为 JSON，字段包含 "
            "topicSummary, knowledgePoints, solutionSteps, difficulty, subject。\n"
            f"题目内容：{source_text}\n"
            f"用户画像：{json.dumps(user_profile, ensure_ascii=False)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.UNDERSTANDING,
                error_code=TaskErrorCode.VIDEO_UNDERSTANDING_FAILED,
                message=str(exc),
            ) from exc

        parsed = _extract_json_object(provider_result.content)
        if parsed is not None:
            solution_steps = [
                SolutionStep.model_validate(step)
                for step in parsed.get("solutionSteps", [])
                if isinstance(step, dict)
            ]
            understanding = UnderstandingResult.model_validate(
                {
                    "topicSummary": parsed.get("topicSummary") or source_text[:120],
                    "knowledgePoints": parsed.get("knowledgePoints") or ["核心知识点提炼"],
                    "solutionSteps": solution_steps or [
                        {"stepId": "step_1", "title": "步骤 1", "explanation": source_text[:80]}
                    ],
                    "difficulty": parsed.get("difficulty") or _infer_difficulty(source_text),
                    "subject": parsed.get("subject") or _infer_subject(source_text),
                    "providerUsed": provider_result.provider,
                }
            )
        else:
            understanding = _build_default_understanding(
                source_text=source_text,
                provider_used=provider_result.provider,
                user_profile=user_profile,
            )

        self.runtime.save_model("understanding", understanding)
        return understanding


@dataclass(slots=True)
class StoryboardService:
    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        understanding: UnderstandingResult,
        emit_switch=None,
    ) -> Storyboard:
        target_duration = self.settings.video_target_duration_seconds
        prompt = (
            "请根据理解结果输出 JSON storyboard，字段包含 scenes, totalDuration, targetDuration。\n"
            f"理解结果：{understanding.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.STORYBOARD,
                error_code=TaskErrorCode.VIDEO_STORYBOARD_FAILED,
                message=str(exc),
            ) from exc

        parsed = _extract_json_object(provider_result.content)
        if parsed is not None and isinstance(parsed.get("scenes"), list):
            try:
                scenes = [
                    Scene.model_validate(_normalize_scene_payload(scene, index))
                    for index, scene in enumerate(parsed["scenes"])
                    if isinstance(scene, dict)
                ]
            except Exception:  # noqa: BLE001
                scenes = []

            if scenes:
                scenes = normalize_storyboard_duration(scenes, target_duration=target_duration)
                storyboard = Storyboard(
                    scenes=scenes,
                    total_duration=sum(scene.duration_hint for scene in scenes),
                    target_duration=max(
                        self.settings.video_min_duration_seconds,
                        min(target_duration, self.settings.video_max_duration_seconds),
                    ),
                    provider_used=provider_result.provider,
                )
            else:
                storyboard = _build_default_storyboard(
                    understanding=understanding,
                    target_duration=target_duration,
                    provider_used=provider_result.provider,
                )
        else:
            storyboard = _build_default_storyboard(
                understanding=understanding,
                target_duration=target_duration,
                provider_used=provider_result.provider,
            )

        self.runtime.save_model("storyboard", storyboard)
        return storyboard


@dataclass(slots=True)
class ManimGenerationService:
    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        storyboard: Storyboard,
        emit_switch=None,
    ) -> ManimCodeResult:
        prompt = (
            "请根据 storyboard 输出可执行的 Manim Python 脚本。\n"
            f"{storyboard.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.MANIM_GEN,
                error_code=TaskErrorCode.VIDEO_MANIM_GEN_FAILED,
                message=str(exc),
            ) from exc

        script_content = _extract_code(provider_result.content) or build_default_manim_script(storyboard)
        if "class " not in script_content:
            script_content = build_default_manim_script(storyboard)

        mappings: list[SceneCodeMapping] = []
        current_line = 5
        for scene in storyboard.scenes:
            mappings.append(
                SceneCodeMapping(
                    scene_id=scene.scene_id,
                    title=scene.title,
                    start_line=current_line,
                    end_line=current_line + 5,
                )
            )
            current_line += 7

        result = ManimCodeResult(
            script_content=script_content,
            scene_mapping=mappings,
            provider_used=provider_result.provider,
        )
        self.runtime.save_model("manim_code", result)
        return result


class RuleBasedFixer:
    def fix(self, *, script_content: str, error_log: str) -> FixResult:
        fixed_script = build_default_fix_script(script_content)
        success = fixed_script != script_content or "syntax" in error_log.lower()
        return FixResult(
            fixed=success,
            fixed_script=fixed_script if success else None,
            strategy="rule",
            error_type=_first_non_empty([error_log], fallback="render_error"),
            notes="Applied built-in Manim script normalization rules.",
        )


@dataclass(slots=True)
class LLMBasedFixer:
    providers: Sequence[Any]
    failover_service: ProviderFailoverService

    async def fix(
        self,
        *,
        storyboard: Storyboard,
        script_content: str,
        error_log: str,
        emit_switch=None,
    ) -> FixResult:
        prompt = (
            "请修复下面的 Manim 脚本并仅返回代码。\n"
            f"错误日志：{error_log}\n"
            f"原始脚本：{script_content}\n"
            f"分镜：{storyboard.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError:
            return FixResult(
                fixed=False,
                strategy="llm",
                error_type=error_log[:120] or "llm_fix_failed",
                notes="LLM fix provider chain exhausted.",
            )

        fixed_script = _extract_code(provider_result.content) or build_default_manim_script(storyboard)
        return FixResult(
            fixed=bool(fixed_script.strip()),
            fixed_script=fixed_script,
            strategy="llm",
            error_type=error_log[:120] or "llm_fix",
            notes=f"Provider used: {provider_result.provider}",
        )


@dataclass(slots=True)
class TTSService:
    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        voice_preference: Mapping[str, Any] | None = None,
        emit_switch=None,
        on_scene_completed=None,
    ) -> TTSResult:
        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_tts_{task_id}_"))
        selected_providers = self._select_providers(voice_preference)
        if not selected_providers:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise VideoPipelineError(
                stage=VideoStage.TTS,
                error_code=TaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED,
                message="未配置可用的 TTS Provider",
            )
        voice_config = self._build_voice_config(selected_providers, voice_preference)
        self.runtime.save_value(
            "tts_selected_voice",
            {
                "voiceCode": voice_config.voice_id,
                "voiceName": _read_text(
                    _read_mapping_value(_provider_settings(selected_providers[0]), "resource_name", "resourceName"),
                    voice_config.voice_id,
                ),
                "providerId": selected_providers[0].provider_id,
                "providerName": _read_text(
                    _read_mapping_value(_provider_settings(selected_providers[0]), "provider_name", "providerName"),
                    selected_providers[0].provider_id,
                ),
                "resourceCode": _read_text(
                    _read_mapping_value(_provider_settings(selected_providers[0]), "resource_code", "resourceCode"),
                    selected_providers[0].provider_id,
                ),
            },
        )
        audio_segments: list[AudioSegment] = []
        provider_used: list[str] = []
        failover_occurred = False
        primary_provider_id = selected_providers[0].provider_id

        for index, scene in enumerate(storyboard.scenes, start=1):
            try:
                result = await self.failover_service.synthesize(
                    selected_providers,
                    scene.narration,
                    voice_config=voice_config,
                    emit_switch=emit_switch,
                )
            except ProviderAllFailedError as exc:
                shutil.rmtree(temp_dir, ignore_errors=True)
                raise VideoPipelineError(
                    stage=VideoStage.TTS,
                    error_code=TaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED,
                    message=str(exc),
                    progress_ratio=index / max(len(storyboard.scenes), 1),
                ) from exc

            provider_used.append(result.provider)
            if result.provider != primary_provider_id:
                failover_occurred = True
            decoded_audio = decode_audio_payload(getattr(result, "metadata", None))
            if decoded_audio is not None:
                audio_bytes, audio_format = decoded_audio
                audio_path = temp_dir / f"{task_id}_{scene.scene_id}.{audio_format}"
                audio_path.write_bytes(audio_bytes)
            else:
                audio_format = "wav"
                audio_path = temp_dir / f"{task_id}_{scene.scene_id}.{audio_format}"
                write_silent_wav(
                    audio_path,
                    duration_seconds=max(scene.duration_hint, 1),
                    sample_rate=voice_config.sample_rate,
                )
                logger.warning(
                    "TTS provider returned non-audio payload; generated silent fallback track",
                    extra={
                        "taskId": task_id,
                        "sceneId": scene.scene_id,
                        "providerId": result.provider,
                    },
                )
            audio_duration_seconds = _probe_media_duration_seconds(audio_path) or float(scene.duration_hint)
            audio_segments.append(
                AudioSegment(
                    scene_id=scene.scene_id,
                    audio_path=str(audio_path),
                    duration=_round_duration_seconds(audio_duration_seconds),
                    format=audio_format,
                )
            )
            if on_scene_completed is not None:
                await on_scene_completed(index, len(storyboard.scenes), result.provider, failover_occurred)

        tts_result = TTSResult(
            audio_segments=audio_segments,
            total_duration=sum(segment.duration for segment in audio_segments),
            provider_used=provider_used,
            failover_occurred=failover_occurred,
        )
        self.runtime.save_model("tts_result", tts_result)
        return tts_result

    def _select_providers(self, voice_preference: Mapping[str, Any] | None) -> tuple[Any, ...]:
        provider_chain = tuple(self.providers)
        if not provider_chain:
            return ()
        if voice_preference is None:
            return provider_chain

        requested_voice_code = _read_text(
            _read_mapping_value(voice_preference, "voiceCode", "voice_code"),
        )
        requested_provider_id = _read_text(
            _read_mapping_value(voice_preference, "providerId", "provider_id"),
        )
        matched = [
            provider
            for provider in provider_chain
            if self._matches_voice_preference(
                provider,
                requested_voice_code=requested_voice_code,
                requested_provider_id=requested_provider_id,
            )
        ]
        if matched:
            return tuple(matched)

        criteria = requested_voice_code or requested_provider_id or "unknown"
        raise VideoPipelineError(
            stage=VideoStage.TTS,
            error_code=TaskErrorCode.INVALID_INPUT,
            message=f"未找到可用音色配置：{criteria}",
        )

    def _matches_voice_preference(
        self,
        provider: Any,
        *,
        requested_voice_code: str | None,
        requested_provider_id: str | None,
    ) -> bool:
        settings = _provider_settings(provider)
        provider_voice_code = _read_text(
            _read_mapping_value(settings, "voice_code", "voiceCode"),
        )
        if requested_voice_code and provider_voice_code != requested_voice_code:
            return False
        if requested_provider_id and provider.provider_id != requested_provider_id:
            return False
        return True

    def _build_voice_config(
        self,
        providers: Sequence[Any],
        voice_preference: Mapping[str, Any] | None,
    ) -> VoiceConfig:
        settings = _provider_settings(providers[0]) if providers else {}
        requested_voice_code = None
        if voice_preference is not None:
            requested_voice_code = _read_text(
                _read_mapping_value(voice_preference, "voiceCode", "voice_code"),
            )

        sample_rate = _coerce_int(
            _read_mapping_value(settings, "sample_rate", "sampleRate"),
            self.settings.video_output_audio_sample_rate,
        )
        bitrate = _read_text(
            _read_mapping_value(settings, "bitrate", "audio_bitrate", "audioBitrate"),
            self.settings.video_output_audio_bitrate,
        ) or self.settings.video_output_audio_bitrate
        return VoiceConfig(
            language=_read_text(
                _read_mapping_value(settings, "language_code", "languageCode"),
                "zh-CN",
            ) or "zh-CN",
            voice_id=requested_voice_code
            or _read_text(_read_mapping_value(settings, "voice_code", "voiceCode"), "demo-voice")
            or "demo-voice",
            speed=_coerce_float(
                _read_mapping_value(settings, "speed_ratio", "speedRatio", "speed"),
                1.0,
            ),
            format=_read_text(
                _read_mapping_value(settings, "encoding", "audio_format", "audioFormat"),
                self.settings.video_output_audio_format,
            ) or self.settings.video_output_audio_format,
            sample_rate=sample_rate,
            bitrate=bitrate,
            volume_ratio=_coerce_float(
                _read_mapping_value(settings, "volume_ratio", "volumeRatio"),
                1.0,
            ),
            pitch_ratio=_coerce_float(
                _read_mapping_value(settings, "pitch_ratio", "pitchRatio"),
                1.0,
            ),
        )


@dataclass(slots=True)
class ComposeService:
    settings: Settings
    runtime: VideoRuntimeStateStore

    def build_audio_concat_command(self, audio_paths: Sequence[str], output_path: str) -> list[str]:
        if len(audio_paths) == 1:
            return [
                "ffmpeg",
                "-y",
                "-i",
                audio_paths[0],
                "-vn",
                "-ar",
                str(self.settings.video_output_audio_sample_rate),
                "-ac",
                "1",
                "-c:a",
                "aac",
                "-b:a",
                self.settings.video_output_audio_bitrate,
                output_path,
            ]

        input_args: list[str] = []
        filter_parts: list[str] = []
        concat_inputs: list[str] = []
        for index, audio_path in enumerate(audio_paths):
            input_args.extend(["-i", audio_path])
            filter_parts.append(
                (
                    f"[{index}:a]aresample={self.settings.video_output_audio_sample_rate},"
                    f"aformat=sample_rates={self.settings.video_output_audio_sample_rate}:channel_layouts=mono,"
                    f"asetpts=N/SR/TB[a{index}]"
                )
            )
            concat_inputs.append(f"[a{index}]")

        filter_parts.append(f"{''.join(concat_inputs)}concat=n={len(audio_paths)}:v=0:a=1[aout]")
        return [
            "ffmpeg",
            "-y",
            *input_args,
            "-filter_complex",
            ";".join(filter_parts),
            "-map",
            "[aout]",
            "-c:a",
            "aac",
            "-b:a",
            self.settings.video_output_audio_bitrate,
            output_path,
        ]

    def build_compose_command(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        *,
        subtitle_path: str | None = None,
        extend_seconds: float = 0.0,
    ) -> list[str]:
        command = [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-i",
            audio_path,
        ]
        filters: list[str] = []
        if extend_seconds > 0.01:
            filters.append(f"tpad=stop_mode=clone:stop_duration={extend_seconds:.3f}")
        if subtitle_path:
            filters.append(f"ass={_escape_ffmpeg_filter_path(subtitle_path)}")
        if filters:
            command.extend(["-vf", ",".join(filters)])
        command.extend(
            [
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                output_path,
            ]
        )
        return command

    def build_cover_command(self, video_path: str, cover_path: str) -> list[str]:
        return [
            "ffmpeg",
            "-y",
            "-ss",
            "1",
            "-i",
            video_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            cover_path,
        ]

    def build_subtitle_entries(
        self,
        *,
        storyboard: Storyboard,
        scene_durations: Sequence[float],
        max_chars_per_line: int = SUBTITLE_MAX_CHARS_PER_LINE,
    ) -> list[SubtitleEntry]:
        entries: list[SubtitleEntry] = []
        current_start = 0.0
        for index, scene in enumerate(storyboard.scenes):
            duration = scene_durations[index] if index < len(scene_durations) else float(scene.duration_hint)
            duration = max(duration, 0.1)
            scene_text = re.sub(r"\s+", " ", scene.narration).strip() or scene.title.strip() or f"场景 {index + 1}"
            segments = _split_subtitle_text(scene_text, max_chars_per_line=max_chars_per_line) or [scene_text]
            segment_duration = duration / max(len(segments), 1)
            segment_start = current_start
            for segment_index, segment in enumerate(segments):
                segment_end = (
                    current_start + duration
                    if segment_index == len(segments) - 1
                    else segment_start + segment_duration
                )
                entries.append(
                    SubtitleEntry(
                        start_seconds=segment_start,
                        end_seconds=max(segment_end, segment_start + 0.1),
                        text=segment,
                    )
                )
                segment_start = segment_end
            current_start += duration
        return entries

    def write_srt(self, entries: Sequence[SubtitleEntry], output_path: Path) -> None:
        lines: list[str] = []
        for index, entry in enumerate(entries, start=1):
            lines.extend(
                [
                    str(index),
                    f"{_format_srt_timestamp(entry.start_seconds)} --> {_format_srt_timestamp(entry.end_seconds)}",
                    entry.text,
                    "",
                ]
            )
        output_path.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")

    def write_ass_from_srt(
        self,
        *,
        srt_path: Path,
        ass_path: Path,
        font_name: str = SUBTITLE_FONT_NAME,
        font_size: int = SUBTITLE_FONT_SIZE,
    ) -> None:
        content = srt_path.read_text(encoding="utf-8")
        pattern = re.compile(
            r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\Z)",
            re.MULTILINE,
        )
        ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,0,2,24,24,28,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        events: list[str] = []
        for _, start, end, text in pattern.findall(content):
            start_time = start.replace(",", ".")[:-1]
            end_time = end.replace(",", ".")[:-1]
            normalized_text = _escape_ass_text(text.strip().replace("\n", r"\N"))
            events.append(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{normalized_text}")
        ass_path.write_text(ass_header + "\n".join(events) + "\n", encoding="utf-8")

    def resolve_scene_durations(self, *, storyboard: Storyboard, tts_result: TTSResult) -> list[float]:
        duration_by_scene: dict[str, float] = {}
        for segment in tts_result.audio_segments:
            duration_by_scene[segment.scene_id] = _probe_media_duration_seconds(Path(segment.audio_path)) or float(segment.duration)

        return [
            max(duration_by_scene.get(scene.scene_id, float(scene.duration_hint)), 0.1)
            for scene in storyboard.scenes
        ]

    async def _run_ffmpeg(self, command: Sequence[str]) -> None:
        try:
            await asyncio.to_thread(
                subprocess.run,
                list(command),
                capture_output=True,
                text=True,
                timeout=self.settings.video_ffmpeg_timeout_seconds,
                check=True,
            )
        except Exception as exc:  # noqa: BLE001
            raise VideoPipelineError(
                stage=VideoStage.COMPOSE,
                error_code=TaskErrorCode.VIDEO_COMPOSE_FAILED,
                message=str(exc),
            ) from exc

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        render_result: ExecutionResult,
        tts_result: TTSResult,
    ) -> ComposeResult:
        if render_result.output_path is None:
            raise VideoPipelineError(
                stage=VideoStage.COMPOSE,
                error_code=TaskErrorCode.VIDEO_COMPOSE_FAILED,
                message="render output is missing",
            )
        if not tts_result.audio_segments:
            raise VideoPipelineError(
                stage=VideoStage.COMPOSE,
                error_code=TaskErrorCode.VIDEO_COMPOSE_FAILED,
                message="tts output is missing",
            )

        temp_dir = Path(tempfile.mkdtemp(prefix=f"video_compose_{task_id}_"))
        output_path = temp_dir / "output.mp4"
        cover_path = temp_dir / "cover.jpg"
        mixed_audio_path = temp_dir / "narration.m4a"
        subtitle_srt_path = temp_dir / "subtitles.srt"
        subtitle_ass_path = temp_dir / "subtitles.ass"
        source_video_path = Path(render_result.output_path)
        audio_paths = [segment.audio_path for segment in tts_result.audio_segments]
        scene_durations = self.resolve_scene_durations(storyboard=storyboard, tts_result=tts_result)
        subtitle_entries = self.build_subtitle_entries(storyboard=storyboard, scene_durations=scene_durations)
        self.write_srt(subtitle_entries, subtitle_srt_path)
        self.write_ass_from_srt(srt_path=subtitle_srt_path, ass_path=subtitle_ass_path)

        output_duration_seconds = max(sum(scene_durations), float(tts_result.total_duration), 1.0)
        if shutil.which("ffmpeg") and not _is_fake_render_video(source_video_path):
            concat_command = self.build_audio_concat_command(audio_paths, str(mixed_audio_path))
            await self._run_ffmpeg(concat_command)

            merged_audio_duration = _probe_media_duration_seconds(mixed_audio_path) or output_duration_seconds
            source_video_duration = _probe_media_duration_seconds(source_video_path) or max(render_result.duration_seconds, 0.0)
            output_duration_seconds = max(merged_audio_duration, source_video_duration, 1.0)
            extend_seconds = max(merged_audio_duration - source_video_duration, 0.0)
            compose_command = self.build_compose_command(
                str(source_video_path),
                str(mixed_audio_path),
                str(output_path),
                subtitle_path=str(subtitle_ass_path),
                extend_seconds=extend_seconds,
            )
            cover_command = self.build_cover_command(str(output_path), str(cover_path))
            await self._run_ffmpeg(compose_command)
            await self._run_ffmpeg(cover_command)
        else:
            output_path.write_bytes(b"COMPOSED_FAKE_MP4")
            cover_path.write_bytes(b"FAKE_COVER")

        self.runtime.save_value(
            "compose_subtitles",
            {
                "srtPath": str(subtitle_srt_path),
                "assPath": str(subtitle_ass_path),
            },
        )
        compose_result = ComposeResult(
            video_path=str(output_path),
            cover_path=str(cover_path),
            duration=_round_duration_seconds(output_duration_seconds),
            file_size=output_path.stat().st_size,
        )
        self.runtime.save_model("compose_result", compose_result)
        return compose_result


@dataclass(slots=True)
class UploadService:
    asset_store: LocalAssetStore
    settings: Settings
    runtime: VideoRuntimeStateStore

    async def execute(self, *, task_id: str, compose_result: ComposeResult, on_retry=None) -> UploadResult:
        attempts = max(self.settings.video_upload_retry_attempts + 1, 1)
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                video_asset = self.asset_store.copy_file(compose_result.video_path, f"video/{task_id}/output.mp4")
                cover_asset = self.asset_store.copy_file(compose_result.cover_path, f"video/{task_id}/cover.jpg")
                upload_result = UploadResult(
                    video_url=video_asset.public_url,
                    cover_url=cover_asset.public_url,
                    expires_at=_serialize_datetime(_utc_now()),
                )
                self.runtime.save_model("upload_result", upload_result)
                return upload_result
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == attempts:
                    break
                if on_retry is not None:
                    await on_retry(attempt, attempts - 1, exc)
                await asyncio.sleep(attempt)

        raise VideoPipelineError(
            stage=VideoStage.UPLOAD,
            error_code=TaskErrorCode.VIDEO_UPLOAD_FAILED,
            message=str(last_error or "upload failed"),
        )


@dataclass(slots=True)
class ArtifactWritebackService:
    asset_store: LocalAssetStore

    def execute(
        self,
        *,
        task_id: str,
        understanding: UnderstandingResult,
        storyboard: Storyboard,
        tts_result: TTSResult,
        manim_code: ManimCodeResult,
    ) -> tuple[VideoArtifactGraph, str]:
        timeline_scenes: list[dict[str, object]] = []
        narration_segments: list[dict[str, object]] = []
        current_time = 0
        for scene, audio_segment in zip(storyboard.scenes, tts_result.audio_segments, strict=False):
            timeline_scenes.append(
                {
                    "sceneId": scene.scene_id,
                    "startTime": current_time,
                    "endTime": current_time + scene.duration_hint,
                    "title": scene.title,
                }
            )
            narration_segments.append(
                {
                    "sceneId": scene.scene_id,
                    "text": scene.narration,
                    "startTime": current_time,
                    "endTime": current_time + audio_segment.duration,
                }
            )
            current_time += scene.duration_hint

        graph = VideoArtifactGraph(
            session_id=task_id,
            artifacts=[
                ArtifactPayload(artifact_type=ArtifactType.TIMELINE, data={"scenes": timeline_scenes}),
                ArtifactPayload(
                    artifact_type=ArtifactType.STORYBOARD,
                    data=storyboard.model_dump(mode="json", by_alias=True),
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.NARRATION,
                    data={"segments": narration_segments},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.KNOWLEDGE_POINTS,
                    data={"knowledgePoints": understanding.knowledge_points},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.SOLUTION_STEPS,
                    data={"solutionSteps": understanding.model_dump(mode="json", by_alias=True)["solutionSteps"]},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.MANIM_CODE,
                    data={"scriptContent": manim_code.script_content},
                ),
            ],
        )
        asset = self.asset_store.write_json(_artifact_storage_key(task_id), graph.model_dump(mode="json", by_alias=True))
        return graph, asset.public_url


class VideoPipelineService:
    def __init__(
        self,
        *,
        runtime_store,
        metadata_service: VideoService,
        provider_factory: ProviderFactory,
        settings: Settings,
        asset_store: LocalAssetStore,
        sandbox_executor: SandboxExecutor | None = None,
        provider_runtime_resolver: ProviderRuntimeResolver | None = None,
    ) -> None:
        self.runtime_store = runtime_store
        self.metadata_service = metadata_service
        self.provider_factory = provider_factory
        self.settings = settings
        self.asset_store = asset_store
        self.sandbox_executor = sandbox_executor or DockerSandboxExecutor()
        self.provider_runtime_resolver = provider_runtime_resolver or ProviderRuntimeResolver(
            settings=settings,
            provider_factory=provider_factory,
        )
        self.failover_service = provider_factory.create_failover_service(runtime_store)

    async def run(self, task: BaseTask) -> TaskResult:
        runtime = VideoRuntimeStateStore(self.runtime_store, task.context.task_id)
        runtime_access_token, runtime_client_id = load_video_runtime_auth(
            self.runtime_store,
            task_id=task.context.task_id,
        )
        try:
            provider_runtime = await self.provider_runtime_resolver.resolve_video_pipeline(
                access_token=runtime_access_token,
                client_id=runtime_client_id,
            )
        finally:
            delete_video_runtime_auth(self.runtime_store, task_id=task.context.task_id)
        understanding_service = UnderstandingService(
            provider_runtime.llm_for(VideoStage.UNDERSTANDING.value),
            self.failover_service,
            runtime,
        )
        storyboard_service = StoryboardService(
            provider_runtime.llm_for(VideoStage.STORYBOARD.value),
            self.failover_service,
            runtime,
            self.settings,
        )
        manim_service = ManimGenerationService(
            provider_runtime.llm_for(VideoStage.MANIM_GEN.value),
            self.failover_service,
            runtime,
        )
        rule_fixer = RuleBasedFixer()
        llm_fixer = LLMBasedFixer(provider_runtime.llm_for(VideoStage.MANIM_FIX.value), self.failover_service)
        tts_service = TTSService(
            provider_runtime.tts_for(VideoStage.TTS.value),
            self.failover_service,
            runtime,
            self.settings,
        )
        compose_service = ComposeService(self.settings, runtime)
        upload_service = UploadService(self.asset_store, self.settings, runtime)
        artifact_service = ArtifactWritebackService(self.asset_store)

        source_payload = dict(task.context.metadata.get("sourcePayload", {}))
        user_profile = dict(task.context.metadata.get("userProfile", {}))
        render_result: ExecutionResult | None = None
        tts_result: TTSResult | None = None
        compose_result: ComposeResult | None = None

        try:
            understanding = await self._run_understanding(
                task,
                understanding_service,
                source_payload=source_payload,
                user_profile=user_profile,
            )
            storyboard = await self._run_storyboard(task, storyboard_service, understanding=understanding)
            manim_code = await self._run_manim_generation(task, manim_service, storyboard=storyboard)
            render_result, manim_code = await self._run_render_with_fix_chain(
                task,
                runtime,
                storyboard=storyboard,
                manim_code=manim_code,
                rule_fixer=rule_fixer,
                llm_fixer=llm_fixer,
            )
            tts_result = await self._run_tts(task, tts_service, storyboard=storyboard)
            compose_result = await self._run_compose(
                task,
                compose_service,
                storyboard=storyboard,
                render_result=render_result,
                tts_result=tts_result,
            )
            upload_result = await self._run_upload(task, upload_service, compose_result=compose_result)
            video_result = await self._write_completed_result(
                task.context,
                runtime,
                understanding=understanding,
                upload_result=upload_result,
                compose_result=compose_result,
                providers=provider_runtime.provider_summary(),
            )
            await self._write_artifact_graph(
                runtime,
                context=task.context,
                video_result=video_result,
                artifact_service=artifact_service,
                understanding=understanding,
                storyboard=storyboard,
                tts_result=tts_result,
                manim_code=manim_code,
            )
            final_context = build_stage_context(
                VideoStage.UPLOAD,
                1.0,
                extra={
                    "result": video_result.model_dump(mode="json", by_alias=True),
                    "resultId": video_result.result_id,
                },
            )
            return TaskResult.completed(
                "视频生成完成",
                progress=100,
                context=final_context,
            )
        except VideoPipelineError as exc:
            logger.warning("Video pipeline failed task_id=%s stage=%s", task.context.task_id, exc.stage.value)
            return await self._handle_pipeline_failure(task.context, runtime, exc)
        finally:
            _cleanup_pipeline_temp_dirs(
                render_result.output_path if render_result is not None else None,
                *(segment.audio_path for segment in tts_result.audio_segments) if tts_result is not None else (),
                compose_result.video_path if compose_result is not None else None,
                compose_result.cover_path if compose_result is not None else None,
            )

    async def _run_understanding(
        self,
        task: BaseTask,
        service: UnderstandingService,
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
    ) -> UnderstandingResult:
        await self._emit_stage(task, VideoStage.UNDERSTANDING, 0.0, "正在理解题目")
        understanding = await service.execute(
            source_payload=source_payload,
            user_profile=user_profile,
            emit_switch=self._build_switch_emitter(task, VideoStage.UNDERSTANDING, 0.5),
        )
        await self._emit_stage(
            task,
            VideoStage.UNDERSTANDING,
            1.0,
            "题目理解完成",
            extra={"understanding": understanding.model_dump(mode="json", by_alias=True)},
        )
        return understanding

    async def _run_storyboard(
        self,
        task: BaseTask,
        service: StoryboardService,
        *,
        understanding: UnderstandingResult,
    ) -> Storyboard:
        await self._emit_stage(task, VideoStage.STORYBOARD, 0.0, "正在生成分镜")
        storyboard = await service.execute(
            understanding=understanding,
            emit_switch=self._build_switch_emitter(task, VideoStage.STORYBOARD, 0.4),
        )
        await self._emit_stage(
            task,
            VideoStage.STORYBOARD,
            1.0,
            "分镜生成完成",
            extra={"sceneCount": len(storyboard.scenes)},
        )
        return storyboard

    async def _run_manim_generation(
        self,
        task: BaseTask,
        service: ManimGenerationService,
        *,
        storyboard: Storyboard,
    ) -> ManimCodeResult:
        await self._emit_stage(task, VideoStage.MANIM_GEN, 0.0, "正在生成动画脚本")
        manim_code = await service.execute(
            storyboard=storyboard,
            emit_switch=self._build_switch_emitter(task, VideoStage.MANIM_GEN, 0.5),
        )
        await self._emit_stage(
            task,
            VideoStage.MANIM_GEN,
            1.0,
            "动画脚本生成完成",
            extra={"scriptLength": len(manim_code.script_content)},
        )
        return manim_code

    async def _run_render_with_fix_chain(
        self,
        task: BaseTask,
        runtime: VideoRuntimeStateStore,
        *,
        storyboard: Storyboard,
        manim_code: ManimCodeResult,
        rule_fixer: RuleBasedFixer,
        llm_fixer: LLMBasedFixer,
    ) -> tuple[ExecutionResult, ManimCodeResult]:
        resource_limits = ResourceLimits(
            cpu_count=self.settings.video_sandbox_cpu_count,
            memory_mb=self.settings.video_sandbox_memory_mb,
            timeout_seconds=self.settings.video_sandbox_timeout_seconds,
            tmp_size_mb=self.settings.video_sandbox_tmp_size_mb,
        )
        current_code = manim_code
        max_attempts = max(self.settings.video_fix_max_attempts, 0)
        attempt_no = 0

        while True:
            await self._emit_stage(task, VideoStage.RENDER, 0.0, "正在渲染动画")
            render_result = await self._execute_render(task.context.task_id, current_code.script_content, resource_limits)
            if render_result.success:
                runtime.save_value("render_output", {"outputPath": render_result.output_path})
                await self._emit_stage(task, VideoStage.RENDER, 1.0, "动画渲染完成")
                return render_result, current_code

            if attempt_no >= max_attempts:
                await self._emit_fix_event(
                    task,
                    attempt_no=max(attempt_no, 1),
                    fix_event="fix_exhausted",
                    message="自动修复次数已耗尽",
                )
                error_code = coerce_task_error_code(
                    render_result.error_type,
                    fallback=TaskErrorCode.VIDEO_RENDER_FAILED,
                )
                raise VideoPipelineError(
                    stage=VideoStage.RENDER,
                    error_code=error_code,
                    message=render_result.stderr or "render failed",
                )

            attempt_no += 1
            await self._emit_fix_event(
                task,
                attempt_no=attempt_no,
                fix_event="fix_attempt_start",
                message=f"开始第 {attempt_no} 次自动修复",
            )
            rule_fix = rule_fixer.fix(
                script_content=current_code.script_content,
                error_log=render_result.stderr or render_result.error_type or "render_error",
            )
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type=rule_fix.error_type,
                    success=rule_fix.fixed,
                    message=rule_fix.notes or "rule fix",
                ).model_dump(mode="json", by_alias=True)
            )
            if rule_fix.fixed and rule_fix.fixed_script:
                current_code = current_code.model_copy(update={"script_content": rule_fix.fixed_script})
                runtime.save_model("manim_code", current_code)
                await self._emit_fix_event(
                    task,
                    attempt_no=attempt_no,
                    fix_event="fix_attempt_success",
                    message="规则修复成功，重新进入渲染",
                )
                continue

            llm_fix = await llm_fixer.fix(
                storyboard=storyboard,
                script_content=current_code.script_content,
                error_log=render_result.stderr or render_result.error_type or "render_error",
                emit_switch=self._build_switch_emitter(task, VideoStage.MANIM_FIX, 0.6),
            )
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="llm",
                    error_type=llm_fix.error_type,
                    success=llm_fix.fixed,
                    message=llm_fix.notes or "llm fix",
                ).model_dump(mode="json", by_alias=True)
            )
            if llm_fix.fixed and llm_fix.fixed_script:
                current_code = current_code.model_copy(update={"script_content": llm_fix.fixed_script})
                runtime.save_model("manim_code", current_code)
                await self._emit_fix_event(
                    task,
                    attempt_no=attempt_no,
                    fix_event="fix_attempt_success",
                    message="LLM 修复成功，重新进入渲染",
                )
                continue

            await self._emit_fix_event(
                task,
                attempt_no=attempt_no,
                fix_event="fix_attempt_failed",
                message="当前修复尝试失败",
            )

    async def _run_tts(
        self,
        task: BaseTask,
        service: TTSService,
        *,
        storyboard: Storyboard,
    ) -> TTSResult:
        await self._emit_stage(task, VideoStage.TTS, 0.0, "正在生成旁白")
        voice_preference = task.context.metadata.get("voicePreference")

        async def on_scene_completed(current_scene: int, total_scenes: int, provider: str, failover_occurred: bool) -> None:
            ratio = current_scene / max(total_scenes, 1)
            await self._emit_stage(
                task,
                VideoStage.TTS,
                ratio,
                "旁白生成中",
                extra={
                    "currentScene": current_scene,
                    "totalScenes": total_scenes,
                    "providerUsed": provider,
                    "failoverOccurred": failover_occurred,
                },
            )

        tts_result = await service.execute(
            task_id=task.context.task_id,
            storyboard=storyboard,
            voice_preference=voice_preference if isinstance(voice_preference, Mapping) else None,
            emit_switch=self._build_switch_emitter(task, VideoStage.TTS, 0.5),
            on_scene_completed=on_scene_completed,
        )
        await self._emit_stage(task, VideoStage.TTS, 1.0, "旁白生成完成")
        return tts_result

    async def _run_compose(
        self,
        task: BaseTask,
        service: ComposeService,
        *,
        storyboard: Storyboard,
        render_result: ExecutionResult,
        tts_result: TTSResult,
    ) -> ComposeResult:
        await self._emit_stage(task, VideoStage.COMPOSE, 0.0, "正在合成视频")
        compose_result = await service.execute(
            task_id=task.context.task_id,
            storyboard=storyboard,
            render_result=render_result,
            tts_result=tts_result,
        )
        await self._emit_stage(task, VideoStage.COMPOSE, 1.0, "视频合成完成")
        return compose_result

    async def _run_upload(
        self,
        task: BaseTask,
        service: UploadService,
        *,
        compose_result: ComposeResult,
    ) -> UploadResult:
        await self._emit_stage(task, VideoStage.UPLOAD, 0.0, "正在上传视频结果")

        async def on_retry(retry_attempt: int, total_retries: int, exc: Exception) -> None:
            ratio = min(retry_attempt / max(total_retries + 1, 1), 0.95)
            await self._emit_stage(
                task,
                VideoStage.UPLOAD,
                ratio,
                f"正在重试上传（第 {retry_attempt} 次）",
                extra={"retryAttempt": retry_attempt, "retryError": str(exc)},
            )

        upload_result = await service.execute(
            task_id=task.context.task_id,
            compose_result=compose_result,
            on_retry=on_retry,
        )
        await self._emit_stage(task, VideoStage.UPLOAD, 1.0, "视频上传完成")
        return upload_result

    async def _write_completed_result(
        self,
        context: TaskContext,
        runtime: VideoRuntimeStateStore,
        *,
        understanding: UnderstandingResult,
        upload_result: UploadResult,
        compose_result: ComposeResult,
        providers: dict[str, Any],
    ) -> VideoResult:
        completed_at = format_trace_timestamp()
        provider_payload = dict(providers)
        selected_voice = runtime.load_value("tts_selected_voice")
        if isinstance(selected_voice, Mapping):
            provider_payload["ttsVoice"] = dict(selected_voice)
        video_result = VideoResult(
            task_id=context.task_id,
            video_url=upload_result.video_url,
            cover_url=upload_result.cover_url,
            duration=compose_result.duration,
            summary=understanding.topic_summary,
            knowledge_points=understanding.knowledge_points,
            result_id=f"video_result_{context.task_id}",
            completed_at=completed_at,
            ai_content_flag=True,
            title=_build_title(understanding.topic_summary),
            provider_used=provider_payload,
        )
        runtime.save_model("result", video_result)
        detail = VideoResultDetail(
            task_id=context.task_id,
            status="completed",
            result=video_result,
            publish_state=PublishState(),
        )
        asset = self.asset_store.write_json(_result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        long_term_failed = not await self._persist_completed_metadata(context, video_result, asset.public_url)
        if long_term_failed:
            detail = detail.model_copy(update={"long_term_writeback_failed": True})
            asset = self.asset_store.write_json(_result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        runtime.save_value("result_detail_ref", asset.public_url)
        return video_result

    async def _write_artifact_graph(
        self,
        runtime: VideoRuntimeStateStore,
        *,
        context: TaskContext,
        video_result: VideoResult,
        artifact_service: ArtifactWritebackService,
        understanding: UnderstandingResult,
        storyboard: Storyboard,
        tts_result: TTSResult,
        manim_code: ManimCodeResult,
    ) -> None:
        detail_ref = runtime.load_value("result_detail_ref")
        if not isinstance(detail_ref, str):
            return
        detail = self.asset_store.read_result_detail(detail_ref)
        artifact_ref: str | None = None
        artifact_sync_failed = False
        try:
            graph, artifact_ref = artifact_service.execute(
                task_id=video_result.task_id,
                understanding=understanding,
                storyboard=storyboard,
                tts_result=tts_result,
                manim_code=manim_code,
            )
            runtime.save_value("artifact_ref", artifact_ref)
            try:
                await self.metadata_service.sync_artifact_graph(graph, artifact_ref=artifact_ref)
            except Exception:  # noqa: BLE001
                artifact_sync_failed = True
            metadata_request = self.metadata_service.build_task_request(
                task_id=context.task_id,
                user_id=context.user_id or "anonymous",
                status=TaskStatus.COMPLETED,
                summary=video_result.summary,
                result_ref=video_result.video_url,
                detail_ref=detail_ref,
                source_artifact_ref=artifact_ref,
                replay_hint=video_result.result_id,
                completed_at=_utc_now(),
                updated_at=_utc_now(),
            )
            await self.metadata_service.persist_task(metadata_request)
            if artifact_sync_failed:
                updated_detail = detail.model_copy(update={"artifact_writeback_failed": True})
                self.asset_store.write_json(
                    _result_storage_key(video_result.task_id),
                    updated_detail.model_dump(mode="json", by_alias=True),
                )
        except Exception:  # noqa: BLE001
            updated_detail = detail.model_copy(update={"artifact_writeback_failed": True})
            self.asset_store.write_json(
                _result_storage_key(video_result.task_id),
                updated_detail.model_dump(mode="json", by_alias=True),
            )

    async def _persist_completed_metadata(
        self,
        context: TaskContext,
        video_result: VideoResult,
        detail_ref: str,
    ) -> bool:
        completed_at = _utc_now()
        metadata_request = self.metadata_service.build_task_request(
            task_id=context.task_id,
            user_id=context.user_id or "anonymous",
            status=TaskStatus.COMPLETED,
            summary=video_result.summary,
            result_ref=video_result.video_url,
            detail_ref=detail_ref,
            replay_hint=video_result.result_id,
            completed_at=completed_at,
            updated_at=completed_at,
        )
        try:
            await self.metadata_service.persist_task(metadata_request)
        except Exception:  # noqa: BLE001
            logger.warning("Persist completed video metadata degraded task_id=%s", context.task_id, exc_info=True)
            return False
        return True

    async def _handle_pipeline_failure(
        self,
        context: TaskContext,
        runtime: VideoRuntimeStateStore,
        exc: VideoPipelineError,
    ) -> TaskResult:
        failed_at = format_trace_timestamp()
        failure = build_failure(
            task_id=context.task_id,
            stage=exc.stage,
            error_code=exc.error_code,
            message=str(exc),
            failed_at=failed_at,
        )
        stage_context = build_stage_context(
            exc.stage,
            exc.progress_ratio,
            extra={
                "failure": failure.model_dump(mode="json", by_alias=True),
                "failedStage": exc.stage.value,
            },
        )
        detail = VideoResultDetail(
            task_id=context.task_id,
            status="failed",
            failure=failure,
            publish_state=PublishState(),
        )
        asset = self.asset_store.write_json(_result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        runtime.save_value("result_detail_ref", asset.public_url)

        metadata_request = self.metadata_service.build_task_request(
            task_id=context.task_id,
            user_id=context.user_id or "anonymous",
            status=TaskStatus.FAILED,
            summary=str(exc),
            detail_ref=asset.public_url,
            error_summary=str(exc),
            failed_at=_utc_now(),
            updated_at=_utc_now(),
        )
        try:
            await self.metadata_service.persist_task(metadata_request)
        except Exception:  # noqa: BLE001
            logger.warning("Persist failed video metadata degraded task_id=%s", context.task_id, exc_info=True)

        return TaskResult.failed(
            message=str(exc),
            error_code=exc.error_code,
            progress=build_stage_snapshot(exc.stage, exc.progress_ratio).progress,
            context=stage_context,
        )

    async def _execute_render(
        self,
        task_id: str,
        script_content: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        try:
            return await self.sandbox_executor.execute(
                task_id=task_id,
                script=script_content,
                resource_limits=resource_limits,
            )
        except ScriptSecurityViolation as exc:
            return ExecutionResult(
                success=False,
                stderr=str(exc),
                exit_code=1,
                duration_seconds=0.0,
                error_type=exc.error_code.value,
            )

    async def _emit_stage(
        self,
        task: BaseTask,
        stage: VideoStage,
        ratio: float,
        message: str,
        *,
        extra: dict[str, object] | None = None,
    ) -> None:
        context = build_stage_context(stage, ratio, extra=extra)
        await task.emit_runtime_snapshot(
            internal_status=TaskInternalStatus.RUNNING,
            progress=build_stage_snapshot(stage, ratio).progress,
            message=message,
            context=context,
            event="progress",
        )

    async def _emit_fix_event(
        self,
        task: BaseTask,
        *,
        attempt_no: int,
        fix_event: str,
        message: str,
    ) -> None:
        ratio = min(attempt_no / max(self.settings.video_fix_max_attempts, 1), 1.0)
        await self._emit_stage(
            task,
            VideoStage.MANIM_FIX,
            ratio,
            message,
            extra={"attemptNo": attempt_no, "fixEvent": fix_event},
        )

    def _build_switch_emitter(self, task: BaseTask, stage: VideoStage, ratio: float):
        stage_context = build_stage_context(stage, ratio)
        return task.create_provider_switch_emitter(
            progress=build_stage_snapshot(stage, ratio).progress,
            stage=stage.value,
            extra_context=stage_context,
        )

    @staticmethod
    def _collect_unique_providers(providers: Sequence[Any]) -> tuple[str, ...]:
        return tuple(_unique_preserve_order(provider.provider_id for provider in providers))


def get_video_pipeline_service(runtime_store, metadata_service: VideoService) -> VideoPipelineService:
    settings = get_settings()
    return VideoPipelineService(
        runtime_store=runtime_store,
        metadata_service=metadata_service,
        provider_factory=get_provider_factory(),
        settings=settings,
        asset_store=LocalAssetStore.from_settings(settings),
    )
