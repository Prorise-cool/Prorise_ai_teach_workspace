"""Legacy compatibility façade for video pipeline services."""

from __future__ import annotations

import asyncio
import ast
import base64
import json
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Sequence

from app.core.config import get_settings
from app.features.video.pipeline.auto_fix import ast_fix_code
from app.features.video.pipeline.constants import DEFAULT_FIXED_SCENE_CLASS, DEFAULT_MANIM_SCENE_CLASS
from app.features.video.pipeline.engine.code_cleaner import extract_code_from_response
from app.features.video.pipeline.manim_runtime_prelude import MANIM_RUNTIME_PRELUDE
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    AudioSegment,
    ComposeResult,
    FixResult,
    ManimCodeResult,
    Scene,
    SolutionStep,
    Storyboard,
    TTSResult,
    UnderstandingResult,
    UploadResult,
    VideoArtifactGraph,
    VideoStage,
    VoiceConfig,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore

from .script_templates import build_default_fix_script, build_default_manim_script


def _get_text(payload: Any) -> str:
    if isinstance(payload, dict):
        return str(payload.get("content") or payload.get("text") or "")
    return str(getattr(payload, "content", None) or getattr(payload, "text", "") or "")


def _get_provider_id(provider: Any) -> str:
    return str(getattr(provider, "provider_id", "") or "")


def _get_provider_settings(provider: Any) -> dict[str, Any]:
    config = getattr(provider, "config", None)
    settings = getattr(config, "settings", None)
    return dict(settings or {})


def _parse_jsonish(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(extract_code_from_response(text))


def _normalize_solution_step(raw: Any, index: int) -> SolutionStep:
    data = raw if isinstance(raw, dict) else {}
    raw_step = data.get("step")
    explicit_step_id = data.get("stepId") or data.get("step_id")
    step_id = (
        str(explicit_step_id)
        if explicit_step_id is not None
        else f"step_{raw_step}" if raw_step is not None
        else f"step_{index}"
    )
    title = str(data.get("title") or f"步骤 {index}")
    explanation = str(data.get("explanation") or data.get("action") or title)
    return SolutionStep(step_id=step_id, title=title, explanation=explanation)


def _normalize_scene(raw: dict[str, Any], index: int) -> Scene:
    scene_id = str(raw.get("sceneId") or raw.get("scene_id") or f"scene_{index}")
    title = str(raw.get("title") or f"步骤 {index}")
    narration = str(
        raw.get("narration")
        or raw.get("voiceover")
        or raw.get("voiceText")
        or raw.get("voice_text")
        or title
    )
    visual_description = str(
        raw.get("visualDescription")
        or raw.get("visual_description")
        or raw.get("content")
        or raw.get("description")
        or raw.get("imageDesc")
        or raw.get("image_desc")
        or narration
    )
    duration_hint = int(raw.get("durationHint") or raw.get("duration_hint") or 0)
    order = int(raw.get("order") or index)
    voice_text = str(raw.get("voiceText") or raw.get("voice_text") or narration)
    image_desc = str(raw.get("imageDesc") or raw.get("image_desc") or visual_description)
    return Scene(
        scene_id=scene_id,
        title=title,
        narration=narration,
        visual_description=visual_description,
        duration_hint=max(duration_hint, 0),
        order=order,
        voice_text=voice_text,
        image_desc=image_desc,
    )


def _scale_scene_durations(scenes: list[Scene], target_duration: int) -> None:
    if not scenes:
        return
    raw_total = sum(max(scene.duration_hint, 0) for scene in scenes)
    if raw_total <= 0:
        base = max(target_duration // len(scenes), 1)
        remainder = max(target_duration - base * len(scenes), 0)
        for index, scene in enumerate(scenes):
            scene.duration_hint = base + (1 if index < remainder else 0)
        return

    scaled: list[int] = []
    running_total = 0
    for scene in scenes[:-1]:
        value = max(1, round(target_duration * scene.duration_hint / raw_total))
        scaled.append(value)
        running_total += value
    scaled.append(max(1, target_duration - running_total))
    for scene, duration in zip(scenes, scaled, strict=True):
        scene.duration_hint = duration


def _is_valid_fragment(code: str) -> bool:
    try:
        ast.parse(code)
    except SyntaxError:
        return False
    return True


def _ensure_scene_inheritance(script: str) -> str:
    if "class " not in script:
        return f"class {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n    pass\n\n{script.lstrip()}"

    pattern = re.compile(r"^(\s*class\s+\w+)\s*:\s*$", re.MULTILINE)

    def _replace(match: re.Match[str]) -> str:
        return f"{match.group(1)}(Scene):"

    replaced = pattern.sub(_replace, script, count=1)
    if replaced == script and "(Scene)" not in script and "Scene" not in script:
        return f"class {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n    pass\n\n{script.lstrip()}"
    return replaced


def _write_placeholder_wav(path: Path) -> None:
    path.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt ")


def _decode_audio_payload(response: Any) -> tuple[bytes, str]:
    metadata = getattr(response, "metadata", None) or {}
    if isinstance(metadata, dict) and metadata.get("audioBase64"):
        audio_format = str(metadata.get("audioFormat") or "mp3").lower()
        return base64.b64decode(str(metadata["audioBase64"])), audio_format
    return b"RIFF\x24\x00\x00\x00WAVEfmt ", "wav"


@dataclass(slots=True)
class UnderstandingService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore

    async def execute(self, *, source_payload: dict[str, Any], user_profile: dict[str, Any]) -> UnderstandingResult:
        prompt = json.dumps({"sourcePayload": source_payload, "userProfile": user_profile}, ensure_ascii=False)
        response = await self.failover_service.generate(self.providers, prompt)
        payload = _parse_jsonish(_get_text(response))
        result = UnderstandingResult(
            topic_summary=str(payload.get("topicSummary") or payload.get("topic_summary") or ""),
            knowledge_points=[str(item) for item in payload.get("knowledgePoints") or payload.get("knowledge_points") or []],
            solution_steps=[_normalize_solution_step(step, index) for index, step in enumerate(payload.get("solutionSteps") or payload.get("solution_steps") or [], start=1)],
            difficulty=str(payload.get("difficulty") or "medium"),
            subject=str(payload.get("subject") or "general"),
            provider_used=str(getattr(response, "provider", "") or _get_provider_id(self.providers[0]) if self.providers else ""),
        )
        self.runtime.save_model("understanding", result)
        return result


@dataclass(slots=True)
class StoryboardService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    async def execute(self, *, understanding: UnderstandingResult) -> Storyboard:
        active_settings = self.settings or get_settings()
        target_duration = int(getattr(active_settings, "video_target_duration_seconds", 120) or 120)
        prompt = json.dumps({"understanding": understanding.model_dump(mode="json", by_alias=True)}, ensure_ascii=False)
        response = await self.failover_service.generate(self.providers, prompt)
        payload = _parse_jsonish(_get_text(response))
        scenes = [_normalize_scene(raw, index) for index, raw in enumerate(payload.get("scenes") or [], start=1)]
        _scale_scene_durations(scenes, target_duration)
        result = Storyboard(
            scenes=scenes,
            total_duration=sum(scene.duration_hint for scene in scenes),
            target_duration=target_duration,
            provider_used=str(getattr(response, "provider", "") or _get_provider_id(self.providers[0]) if self.providers else ""),
        )
        self.runtime.save_model("storyboard", result)
        return result


@dataclass(slots=True)
class RuleBasedFixer:
    def fix(self, *, script_content: str, error_log: str) -> FixResult:
        fixed_script = build_default_fix_script(_ensure_scene_inheritance(script_content))
        return FixResult(
            fixed=True,
            fixed_script=fixed_script,
            strategy="rule",
            error_type=(error_log.split(":", 1)[0] or "rule").strip(),
        )


@dataclass(slots=True)
class LLMBasedFixer:
    providers: Sequence[Any]
    failover_service: Any

    async def fix(self, *, storyboard: Storyboard, script_content: str, error_log: str) -> FixResult:
        prompt = json.dumps(
            {
                "storyboard": storyboard.model_dump(mode="json", by_alias=True),
                "scriptContent": script_content,
                "errorLog": error_log,
            },
            ensure_ascii=False,
        )
        try:
            response = await self.failover_service.generate(self.providers, prompt)
            repaired = build_default_fix_script(_get_text(response))
            return FixResult(
                fixed=True,
                fixed_script=repaired,
                strategy="llm",
                error_type=(error_log.split(":", 1)[0] or "llm").strip(),
            )
        except Exception:  # noqa: BLE001
            return RuleBasedFixer().fix(script_content=script_content, error_log=error_log)


@dataclass(slots=True)
class ManimGenerationService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    async def execute(self, *, storyboard: Storyboard) -> ManimCodeResult:
        active_settings = self.settings or get_settings()
        scene_threshold = int(getattr(active_settings, "video_manim_scene_by_scene_max_scenes", 2) or 2)
        use_scene_by_scene = len(storyboard.scenes) >= scene_threshold

        if use_scene_by_scene:
            for index, scene in enumerate(storyboard.scenes, start=1):
                prompt = json.dumps(
                    {"mode": "scene-by-scene", "scene": scene.model_dump(mode="json", by_alias=True)},
                    ensure_ascii=False,
                )
                response = await self.failover_service.generate(self.providers, prompt)
                code = extract_code_from_response(_get_text(response))
                if not _is_valid_fragment(code):
                    fallback_response = await self.failover_service.generate(
                        self.providers,
                        json.dumps({"mode": "fallback", "storyboard": storyboard.model_dump(mode="json", by_alias=True)}, ensure_ascii=False),
                        ignore_cached_unhealthy=True,
                    )
                    fallback_script = build_default_fix_script(_get_text(fallback_response))
                    result = ManimCodeResult(
                        script_content=fallback_script,
                        scene_mapping=[],
                        provider_used=str(getattr(fallback_response, "provider", "") or _get_provider_id(self.providers[0]) if self.providers else ""),
                    )
                    self.runtime.save_model("manim_code", result)
                    return result

            result = ManimCodeResult(
                script_content=build_default_manim_script(storyboard),
                scene_mapping=[],
                provider_used="scene-by-scene",
            )
            self.runtime.save_model("manim_code", result)
            return result

        response = await self.failover_service.generate(
            self.providers,
            json.dumps({"storyboard": storyboard.model_dump(mode="json", by_alias=True)}, ensure_ascii=False),
        )
        result = ManimCodeResult(
            script_content=build_default_fix_script(_get_text(response)),
            scene_mapping=[],
            provider_used=str(getattr(response, "provider", "") or _get_provider_id(self.providers[0]) if self.providers else ""),
        )
        self.runtime.save_model("manim_code", result)
        return result


@dataclass(slots=True)
class ComposeService:
    settings: Any
    runtime: VideoRuntimeStateStore

    def build_subtitle_command(self, video_path: str, output_path: str, *, subtitle_path: str) -> list[str]:
        return [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vf",
            f"ass={subtitle_path}",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            output_path,
        ]

    def build_cover_command(self, output_path: str, cover_path: str) -> list[str]:
        return [
            "ffmpeg",
            "-y",
            "-ss",
            "1",
            "-i",
            output_path,
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
        max_chars_per_line: int,
    ) -> list[SimpleNamespace]:
        del max_chars_per_line
        entries: list[SimpleNamespace] = []
        cursor = 0.0
        for index, (scene, duration) in enumerate(zip(storyboard.scenes, scene_durations, strict=False), start=1):
            start_seconds = cursor
            end_seconds = cursor + float(duration)
            cursor = end_seconds
            entries.append(
                SimpleNamespace(
                    index=index,
                    start_seconds=start_seconds,
                    end_seconds=end_seconds,
                    text=scene.voice_text or scene.narration,
                )
            )
        return entries

    def write_srt(self, entries: Sequence[Any], path: Path) -> None:
        def _format(seconds: float) -> str:
            total_ms = round(seconds * 1000)
            hours, remainder = divmod(total_ms, 3_600_000)
            minutes, remainder = divmod(remainder, 60_000)
            secs, millis = divmod(remainder, 1000)
            return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

        lines: list[str] = []
        for index, entry in enumerate(entries, start=1):
            lines.extend(
                [
                    str(index),
                    f"{_format(float(entry.start_seconds))} --> {_format(float(entry.end_seconds))}",
                    str(entry.text),
                    "",
                ]
            )
        path.write_text("\n".join(lines), encoding="utf-8")


@dataclass(slots=True)
class TTSService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    def _select_providers(self, voice_preference: dict[str, Any] | None) -> list[Any]:
        if not voice_preference:
            return list(self.providers)
        desired = str(voice_preference.get("voiceCode") or voice_preference.get("voice_code") or "")
        matched = [provider for provider in self.providers if _get_provider_settings(provider).get("voice_code") == desired]
        return matched or list(self.providers)

    def _build_voice_config(self, provider: Any) -> VoiceConfig:
        settings = _get_provider_settings(provider)
        return VoiceConfig(
            voice_id=str(settings.get("voice_code") or _get_provider_id(provider)),
            sample_rate=int(settings.get("sample_rate") or 44100),
            format=str(settings.get("format") or "mp3"),
        )

    @staticmethod
    def _can_call_providers_directly(providers: Sequence[Any]) -> bool:
        return bool(providers) and all(callable(getattr(provider, "synthesize", None)) for provider in providers)

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        voice_preference: dict[str, Any] | None = None,
    ) -> TTSResult:
        provider_chain = self._select_providers(voice_preference)
        if provider_chain:
            selected_provider = provider_chain[0]
            selected_settings = _get_provider_settings(selected_provider)
            self.runtime.save_value(
                "tts_selected_voice",
                {
                    "voiceCode": selected_settings.get("voice_code", _get_provider_id(selected_provider)),
                    "resourceCode": selected_settings.get("resource_code"),
                    "resourceName": selected_settings.get("resource_name"),
                },
            )
        else:
            selected_provider = None

        work_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_tts_"))
        audio_segments: list[AudioSegment] = []
        provider_used: list[str] = []
        fallback_happened = False

        for index, scene in enumerate(storyboard.scenes, start=1):
            text = scene.voice_text or scene.narration
            if self._can_call_providers_directly(provider_chain):
                response = None
                provider_id = ""
                last_error: Exception | None = None
                for provider in provider_chain:
                    try:
                        response = await provider.synthesize(
                            text,
                            voice_config=self._build_voice_config(provider),
                        )
                        provider_id = str(getattr(response, "provider", "") or _get_provider_id(provider))
                        break
                    except Exception as exc:  # noqa: BLE001
                        last_error = exc
                if response is None:
                    raise last_error or RuntimeError("all TTS providers failed")
            else:
                response = await self.failover_service.synthesize(
                    provider_chain,
                    text,
                    voice_config=self._build_voice_config(selected_provider or provider_chain[0]) if provider_chain else None,
                )
                provider_id = str(
                    getattr(response, "provider", "") or _get_provider_id(provider_chain[0]) if provider_chain else ""
                )
            provider_used.append(provider_id)
            if provider_chain and provider_id != _get_provider_id(provider_chain[0]):
                fallback_happened = True

            audio_bytes, audio_format = _decode_audio_payload(response)
            audio_path = work_dir / f"{scene.scene_id}.{audio_format}"
            if audio_format == "wav":
                _write_placeholder_wav(audio_path)
            else:
                audio_path.write_bytes(audio_bytes)
            audio_segments.append(
                AudioSegment(
                    scene_id=scene.scene_id,
                    audio_path=str(audio_path),
                    duration=max(1, scene.duration_hint or 1),
                    format=audio_format,
                )
            )

        result = TTSResult(
            audio_segments=audio_segments,
            total_duration=sum(segment.duration for segment in audio_segments),
            provider_used=provider_used,
            failover_occurred=fallback_happened,
        )
        self.runtime.save_model("tts_result", result)
        return result


@dataclass(slots=True)
class UploadService:
    asset_store: LocalAssetStore
    settings: Any
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        task_id: str,
        compose_result: ComposeResult,
        on_retry=None,
    ) -> UploadResult:
        retry_attempts = max(int(getattr(self.settings, "video_upload_retry_attempts", 0) or 0), 0)
        total_attempts = retry_attempts + 1

        for attempt in range(1, total_attempts + 1):
            try:
                video_asset = self.asset_store.copy_file(compose_result.video_path, f"video/{task_id}/output.mp4")
                cover_asset = self.asset_store.copy_file(compose_result.cover_path, f"video/{task_id}/cover.jpg")
                result = UploadResult(
                    video_url=video_asset.public_url,
                    cover_url=cover_asset.public_url,
                )
                self.runtime.save_model("upload_result", result)
                return result
            except Exception as exc:  # noqa: BLE001
                if attempt == total_attempts:
                    raise
                if on_retry is not None:
                    await on_retry(attempt, retry_attempts, exc)
                await asyncio.sleep(attempt)

        raise RuntimeError("unreachable")


@dataclass(slots=True)
class ArtifactWritebackService:
    asset_store: LocalAssetStore

    def execute(
        self,
        *,
        task_id: str,
        understanding: UnderstandingResult,
        storyboard: Storyboard,
        tts_result: Any,
        manim_code: ManimCodeResult,
    ) -> tuple[VideoArtifactGraph, str]:
        timeline = []
        narration = []
        cursor = 0
        for scene in storyboard.scenes:
            start_time = cursor
            end_time = cursor + max(1, scene.duration_hint or 1)
            cursor = end_time
            timeline.append(
                {
                    "sceneId": scene.scene_id,
                    "title": scene.title,
                    "startTime": start_time,
                    "endTime": end_time,
                }
            )
            narration.append(
                {
                    "sceneId": scene.scene_id,
                    "text": scene.voice_text or scene.narration,
                    "startTime": start_time,
                    "endTime": end_time,
                }
            )

        graph = VideoArtifactGraph(
            session_id=task_id,
            artifacts=[
                ArtifactPayload(artifact_type=ArtifactType.TIMELINE, data={"scenes": timeline}),
                ArtifactPayload(artifact_type=ArtifactType.STORYBOARD, data=storyboard.model_dump(mode="json", by_alias=True)),
                ArtifactPayload(artifact_type=ArtifactType.NARRATION, data={"segments": narration}),
                ArtifactPayload(artifact_type=ArtifactType.KNOWLEDGE_POINTS, data={"knowledgePoints": understanding.knowledge_points}),
                ArtifactPayload(
                    artifact_type=ArtifactType.SOLUTION_STEPS,
                    data={"solutionSteps": [step.model_dump(mode="json", by_alias=True) for step in understanding.solution_steps]},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.MANIM_CODE,
                    data=manim_code.model_dump(mode="json", by_alias=True),
                ),
            ],
        )
        asset = self.asset_store.write_json(f"video/{task_id}/artifact-graph.json", graph.model_dump(mode="json", by_alias=True))
        return graph, asset.public_url


def _cleanup_pipeline_temp_dirs(*paths: str) -> None:
    roots: set[Path] = set()
    for raw_path in paths:
        path = Path(raw_path)
        candidate = path if path.is_dir() else path.parent
        while candidate != candidate.parent:
            if candidate.name.startswith("video_"):
                roots.add(candidate)
                break
            candidate = candidate.parent

    for root in roots:
        shutil.rmtree(root, ignore_errors=True)


__all__ = [
    "ArtifactWritebackService",
    "ComposeService",
    "LLMBasedFixer",
    "ManimGenerationService",
    "RuleBasedFixer",
    "StoryboardService",
    "TTSService",
    "UnderstandingService",
    "UploadService",
    "_cleanup_pipeline_temp_dirs",
]
