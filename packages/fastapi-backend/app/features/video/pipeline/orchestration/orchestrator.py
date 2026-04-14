"""视频生成编排器 — 基于 Code2Video TeachingVideoAgent。

职责:
1. 从 ProviderRuntimeResolver 获取 LLM/TTS Provider 配置
2. 构建 LLMBridge 并注入到 Code2Video agent
3. 运行 TeachingVideoAgent.GENERATE_VIDEO() 生成无声视频
4. 运行 TTS 生成旁白音频
5. FFmpeg 合成音频+视频
6. 上传最终视频
7. 全程发射 SSE 进度事件
"""

from __future__ import annotations

import asyncio
import base64
import logging
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings
from app.features.video.pipeline.engine.agent import (
    RunConfig,
    TeachingVideoAgent,
    required_render_successes,
)
from app.features.video.pipeline.engine.gpt_request import (
    LLMBridge,
    configure_bridge,
    endpoint_from_provider,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    ComposeResult,
    VideoPreviewSection,
    VideoPreviewSectionStatus,
    VideoResultDetail,
    VideoResult,
    VideoStage,
    get_stage_profile,
    resolve_stage_progress,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    attach_preview_audio_urls,
    build_failure,
    build_preview_state,
    mark_preview_status,
    merge_result_detail,
    update_preview_section,
)
from app.features.video.pipeline.orchestration.upload import UploadService
from app.features.video.pipeline.protocols import VideoMetadataPersister
from app.infra.redis_client import RuntimeStore
from app.providers.failover import ProviderFailoverService
from app.providers.health import ProviderHealthStore
from app.providers.protocols import ProviderResult
from app.providers.runtime_config_service import (
    ProviderRuntimeResolver,
    VideoProviderRuntimeAssembly,
)
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.status import TaskInternalStatus

logger = logging.getLogger(__name__)

SECTION_LOOP_PROGRESS_START = 26
SECTION_LOOP_PROGRESS_END = 94
SECTION_STATUS_RATIOS: dict[VideoPreviewSectionStatus, float] = {
    VideoPreviewSectionStatus.PENDING: 0.0,
    VideoPreviewSectionStatus.GENERATING: 0.25,
    VideoPreviewSectionStatus.RENDERING: 0.75,
    VideoPreviewSectionStatus.FIXING: 0.85,
    VideoPreviewSectionStatus.READY: 1.0,
    VideoPreviewSectionStatus.FAILED: 1.0,
}


# ---------------------------------------------------------------------------
# Stage mapping: Code2Video stages → our VideoStage
# ---------------------------------------------------------------------------

_C2V_STAGE_MAP: dict[str, tuple[VideoStage, float, float]] = {
    # key: (VideoStage, progress_start_ratio, progress_end_ratio)
    "outline": (VideoStage.UNDERSTANDING, 0.0, 1.0),
    "storyboard": (VideoStage.STORYBOARD, 0.0, 1.0),
    "code_gen": (VideoStage.MANIM_GEN, 0.0, 0.5),
    "code_fix": (VideoStage.MANIM_FIX, 0.0, 1.0),
    "render": (VideoStage.RENDER, 0.0, 1.0),
    "tts": (VideoStage.TTS, 0.0, 1.0),
    "compose": (VideoStage.COMPOSE, 0.0, 1.0),
    "upload": (VideoStage.UPLOAD, 0.0, 1.0),
}


def _utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# TTS runner (bridges our async TTS providers into the pipeline)
# ---------------------------------------------------------------------------


async def _run_tts_for_sections(
    sections: list[dict[str, Any]],
    tts_providers: tuple,
    health_store: ProviderHealthStore,
    output_dir: Path,
) -> dict[str, Path]:
    """为每个 section 的 lecture_lines 生成 TTS 音频，带退避重试。"""
    failover = ProviderFailoverService(health_store)
    results: dict[str, Path] = {}
    failed_sections: list[dict[str, Any]] = []

    for section in sections:
        section_id = section.get("id", "unknown")
        lines = section.get("lecture_lines", [])
        if not lines:
            continue

        full_text = "。".join(lines)
        success = False
        for attempt in range(1, 4):  # 每个 section 最多重试3次
            try:
                provider_result: ProviderResult = await failover.synthesize(
                    tts_providers,
                    full_text,
                )
                audio_b64 = provider_result.metadata.get("audioBase64", "")
                audio_fmt = provider_result.metadata.get("audioFormat", "mp3")
                if audio_b64:
                    audio_path = output_dir / f"{section_id}.{audio_fmt}"
                    audio_path.write_bytes(base64.b64decode(audio_b64))
                    results[section_id] = audio_path
                    logger.info(
                        "TTS done for %s (%.1fKB)",
                        section_id,
                        audio_path.stat().st_size / 1024,
                    )
                    success = True
                    break
            except Exception:
                if attempt < 3:
                    delay = attempt * 5  # 5s, 10s
                    logger.warning(
                        "TTS attempt %d/3 failed for %s, retrying in %ds...",
                        attempt, section_id, delay, exc_info=True,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error("TTS failed for %s after 3 attempts", section_id, exc_info=True)
        if not success:
            failed_sections.append(section)

    # 全部失败时，等待后整批重试一次
    if not results and failed_sections:
        logger.warning(
            "All %d sections TTS failed, waiting 15s before batch retry...",
            len(failed_sections),
        )
        await asyncio.sleep(15)
        for section in failed_sections:
            section_id = section.get("id", "unknown")
            lines = section.get("lecture_lines", [])
            if not lines:
                continue
            full_text = "。".join(lines)
            try:
                provider_result = await failover.synthesize(tts_providers, full_text)
                audio_b64 = provider_result.metadata.get("audioBase64", "")
                audio_fmt = provider_result.metadata.get("audioFormat", "mp3")
                if audio_b64:
                    audio_path = output_dir / f"{section_id}.{audio_fmt}"
                    audio_path.write_bytes(base64.b64decode(audio_b64))
                    results[section_id] = audio_path
                    logger.info("TTS batch retry succeeded for %s", section_id)
            except Exception:
                logger.error("TTS batch retry failed for %s", section_id)

    return results


# ---------------------------------------------------------------------------
# FFmpeg compose: merge silent video + TTS audio per section, then concat all
# ---------------------------------------------------------------------------


def _compose_section_with_audio(
    video_path: Path,
    audio_path: Path | None,
    output_path: Path,
) -> Path:
    """合并单个 section 的视频和音频。如果没有音频，直接复制视频。"""
    if audio_path is None or not audio_path.exists():
        shutil.copy2(video_path, output_path)
        return output_path

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        logger.warning(
            "FFmpeg audio merge failed for %s: %s", video_path.name, result.stderr[:200]
        )
        shutil.copy2(video_path, output_path)
    return output_path


def _concat_videos(video_paths: list[Path], output_path: Path) -> Path:
    """FFmpeg concat demuxer 合并多个视频。"""
    list_file = output_path.parent / "concat_list.txt"
    list_file.write_text("\n".join(f"file '{p}'" for p in video_paths))

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c",
        "copy",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg concat failed: {result.stderr[:300]}")
    return output_path


def _extract_cover(video_path: Path, cover_path: Path) -> Path:
    """从视频第 1 秒提取封面。"""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-ss",
        "1",
        "-vframes",
        "1",
        str(cover_path),
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if not cover_path.exists():
        # fallback: create a placeholder
        cover_path.write_bytes(b"")
    return cover_path


def _probe_duration(video_path: Path) -> int:
    """用 ffprobe 获取视频时长（秒）。"""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    try:
        return max(1, int(float(result.stdout.strip())))
    except (ValueError, AttributeError):
        return 60  # fallback


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


class VideoPipelineService:
    """视频生成编排器。

    包装 Code2Video 的 TeachingVideoAgent，集成 TTS、分段预览、上传与 SSE 进度。
    """

    def __init__(
        self,
        runtime_store: RuntimeStore,
        metadata_service: VideoMetadataPersister,
        *,
        settings: Settings | None = None,
    ) -> None:
        self._runtime_store = runtime_store
        self._metadata_service = metadata_service
        self._settings = settings or get_settings()

    async def run(self, task: BaseTask) -> TaskResult:
        """执行完整视频生成管线。"""
        task_id = task.context.task_id
        pipeline_started_at = time.monotonic()
        runtime = VideoRuntimeStateStore(self._runtime_store, task_id)
        metadata = task.context.metadata or {}
        source_payload = metadata.get("sourcePayload", {})
        preview_state = None

        knowledge_point = (
            source_payload.get("text", "")
            or source_payload.get("ocrText", "")
            or str(source_payload)
        )
        if not knowledge_point.strip():
            raise VideoPipelineError(
                stage=VideoStage.UNDERSTANDING,
                error_code=VideoTaskErrorCode.VIDEO_INPUT_EMPTY,
                message="输入内容为空",
            )

        video_root = Path(self._settings.video_asset_root) / "video"
        work_dir = video_root / "CASES" / task_id
        work_dir.mkdir(parents=True, exist_ok=True)
        (video_root / "assets" / "icon").mkdir(parents=True, exist_ok=True)
        (video_root / "assets" / "reference").mkdir(parents=True, exist_ok=True)
        (video_root / "json_files").mkdir(parents=True, exist_ok=True)
        ref_mapping = video_root / "json_files" / "long_video_ref_mapping.json"
        if not ref_mapping.exists():
            ref_mapping.write_text("{}", encoding="utf-8")
        logger.info("Pipeline start  task_id=%s  work_dir=%s", task_id, work_dir)

        try:
            await self._emit(
                task,
                VideoStage.UNDERSTANDING,
                0.0,
                "正在初始化 Provider...",
                progress_override=0,
            )
            assembly = await self._resolve_providers(task)

            bridge = self._build_bridge(assembly)
            configure_bridge(bridge)

            loop = asyncio.get_running_loop()
            agent = self._create_c2v_agent(
                knowledge_point=knowledge_point,
                work_dir=work_dir,
                bridge=bridge,
            )
            self._bind_agent_section_callback(agent, loop, task, runtime)

            await self._emit(
                task,
                VideoStage.UNDERSTANDING,
                0.1,
                "生成教学大纲...",
                progress_override=3,
            )
            # ManimCat optimization: single LLM call for design + storyboard
            # Instead of: generate_outline() + generate_storyboard() (2 calls)
            # We now use: generate_design() (1 call) which produces both
            duration_minutes = metadata.get("duration_minutes", 5)
            try:
                design_text, sections = await loop.run_in_executor(
                    None, agent.generate_design, duration_minutes
                )
                logger.info("ManimCat design generated: %d sections", len(sections))
            except Exception as design_err:
                logger.warning("ManimCat design failed, falling back to original flow: %s", design_err)
                await loop.run_in_executor(None, agent.generate_outline)
                design_text = None
            await self._emit(
                task,
                VideoStage.UNDERSTANDING,
                1.0,
                "教学大纲生成完成",
                progress_override=10,
            )

            await self._emit(
                task,
                VideoStage.STORYBOARD,
                0.0,
                "生成视频分镜...",
                progress_override=11,
            )
            # ManimCat: storyboard is already included in generate_design() result
            if design_text is None:
                # Fallback: use original storyboard generation
                await loop.run_in_executor(None, agent.generate_storyboard)
            # else: sections already populated by generate_design()
            preview_state = self._build_preview_from_agent(task_id, knowledge_point, agent)
            runtime.save_preview(preview_state)
            await self._emit(
                task,
                VideoStage.STORYBOARD,
                1.0,
                "视频分镜生成完成",
                progress_override=20,
                extra_context=self._preview_signal(preview_state),
            )

            await self._emit(
                task,
                VideoStage.TTS,
                0.0,
                "生成旁白...",
                progress_override=21,
                extra_context=self._preview_signal(preview_state),
            )
            tts_audio_map = await self._run_tts(agent, assembly, work_dir)
            expected_sections = len(preview_state.sections)
            tts_success = len(tts_audio_map)
            if expected_sections > 0 and tts_success == 0:
                raise VideoPipelineError(
                    stage=VideoStage.TTS,
                    error_code=VideoTaskErrorCode.VIDEO_TTS_ALL_PROVIDERS_FAILED,
                    message=f"TTS 全部失败（0/{expected_sections} sections），已重试",
                )
            if expected_sections > 0 and tts_success < expected_sections:
                logger.warning(
                    "TTS partial: %d/%d sections have audio, proceeding with available",
                    tts_success,
                    expected_sections,
                )

            asset_store = LocalAssetStore.from_settings(self._settings)
            audio_urls = self._publish_tts_audio_assets(
                asset_store,
                task_id=task_id,
                tts_audio_map=tts_audio_map,
            )
            preview_state = attach_preview_audio_urls(
                preview_state,
                audio_urls=audio_urls,
                preview_available=True,
            )
            runtime.save_preview(preview_state)
            await self._emit(
                task,
                VideoStage.TTS,
                1.0,
                "旁白生成完成",
                progress_override=25,
                extra_context=self._preview_signal(preview_state),
            )

            total_sections = len(preview_state.sections)
            if total_sections == 0:
                raise VideoPipelineError(
                    stage=VideoStage.STORYBOARD,
                    error_code=VideoTaskErrorCode.VIDEO_STORYBOARD_FAILED,
                    message="未生成任何分段内容",
                )

            ordered_section_clips: list[Path] = []
            successful_sections: list[str] = []

            # ManimCat optimization: generate ALL section code in ONE LLM call
            # Instead of: for section: generate_section_code() (N calls)
            # We now use: generate_all_code() (1 call) before the loop
            if design_text is not None:
                await self._emit(
                    task,
                    VideoStage.MANIM_GEN,
                    0.0,
                    "ManimCat 全量代码生成...",
                    progress_override=26,
                )
                try:
                    full_code = await loop.run_in_executor(
                        None, agent.generate_all_code, design_text
                    )
                    logger.info("ManimCat full code generated: %d chars", len(full_code))

                    # Run static guard on full code (0 LLM calls)
                    from ..engine.static_guard import run_guard_loop
                    guard_result = await run_guard_loop(full_code, max_passes=3)
                    if guard_result.passed:
                        logger.info("Static guard passed in %d passes", guard_result.passes_used)
                    else:
                        logger.warning("Static guard found %d issues after %d passes",
                                       len(guard_result.diagnostics), guard_result.passes_used)
                    full_code = guard_result.code

                    # Update the cached code file with guarded version
                    code_file = agent.output_dir / "manimcat_full_code.py"
                    code_file.write_text(full_code, encoding="utf-8")

                except Exception as codegen_err:
                    logger.warning("ManimCat full code gen failed, falling back to per-section: %s", codegen_err)
                    design_text = None  # Fall back to per-section generation

            for index, section in enumerate(getattr(agent, "sections", []) or []):
                preview_state = runtime.load_preview() or preview_state
                preview_state = update_preview_section(
                    preview_state,
                    section_id=section.id,
                    status=VideoPreviewSectionStatus.GENERATING,
                    preview_available=True,
                    error_message=None,
                    fix_attempt=None,
                )
                runtime.save_preview(preview_state)
                await self._emit_section_event(
                    task,
                    preview=preview_state,
                    stage=VideoStage.MANIM_GEN,
                    status=VideoPreviewSectionStatus.GENERATING,
                    event="section_progress",
                    section_id=section.id,
                    section_index=index,
                    total_sections=total_sections,
                    message=self._section_message(
                        VideoPreviewSectionStatus.GENERATING,
                        section_index=index,
                        total_sections=total_sections,
                    ),
                    progress_override=self._section_progress(
                        section_index=index,
                        total_sections=total_sections,
                        status=VideoPreviewSectionStatus.GENERATING,
                    ),
                )

                # ManimCat: code already generated in bulk via generate_all_code()
                # Only fall back to per-section generation if ManimCat path failed
                if design_text is None:
                    await loop.run_in_executor(None, agent.generate_section_code, section)

                preview_state = runtime.load_preview() or preview_state
                preview_state = update_preview_section(
                    preview_state,
                    section_id=section.id,
                    status=VideoPreviewSectionStatus.RENDERING,
                    preview_available=True,
                    error_message=None,
                    fix_attempt=None,
                )
                runtime.save_preview(preview_state)
                await self._emit_section_event(
                    task,
                    preview=preview_state,
                    stage=VideoStage.RENDER,
                    status=VideoPreviewSectionStatus.RENDERING,
                    event="section_progress",
                    section_id=section.id,
                    section_index=index,
                    total_sections=total_sections,
                    message=self._section_message(
                        VideoPreviewSectionStatus.RENDERING,
                        section_index=index,
                        total_sections=total_sections,
                    ),
                    progress_override=self._section_progress(
                        section_index=index,
                        total_sections=total_sections,
                        status=VideoPreviewSectionStatus.RENDERING,
                    ),
                )

                success = await loop.run_in_executor(None, agent.render_section, section)
                preview_state = runtime.load_preview() or preview_state

                if success and section.id in getattr(agent, "section_videos", {}):
                    section_video_path = Path(agent.section_videos[section.id])
                    section_clip_path = self._compose_section_clip(
                        section_id=section.id,
                        section_video_path=section_video_path,
                        audio_path=tts_audio_map.get(section.id),
                        work_dir=work_dir,
                    )
                    clip_url = self._publish_section_clip(
                        asset_store,
                        task_id=task_id,
                        section_id=section.id,
                        section_clip_path=section_clip_path,
                    )
                    ordered_section_clips.append(section_clip_path)
                    successful_sections.append(section.id)
                    preview_state = update_preview_section(
                        preview_state,
                        section_id=section.id,
                        status=VideoPreviewSectionStatus.READY,
                        preview_available=True,
                        clip_url=clip_url,
                        audio_url=audio_urls.get(section.id),
                        error_message=None,
                        fix_attempt=None,
                    )
                    runtime.save_preview(preview_state)
                    await self._emit_section_event(
                        task,
                        preview=preview_state,
                        stage=VideoStage.RENDER,
                        status=VideoPreviewSectionStatus.READY,
                        event="section_ready",
                        section_id=section.id,
                        section_index=index,
                        total_sections=total_sections,
                        message=self._section_message(
                            VideoPreviewSectionStatus.READY,
                            section_index=index,
                            total_sections=total_sections,
                        ),
                        progress_override=self._section_progress(
                            section_index=index,
                            total_sections=total_sections,
                            status=VideoPreviewSectionStatus.READY,
                        ),
                        clip_url=clip_url,
                    )
                    continue

                preview_state = update_preview_section(
                    preview_state,
                    section_id=section.id,
                    status=VideoPreviewSectionStatus.FAILED,
                    preview_available=True,
                    error_message="当前分段渲染失败，已跳过",
                    fix_attempt=None,
                )
                runtime.save_preview(preview_state)
                await self._emit_section_event(
                    task,
                    preview=preview_state,
                    stage=VideoStage.RENDER,
                    status=VideoPreviewSectionStatus.FAILED,
                    event="section_progress",
                    section_id=section.id,
                    section_index=index,
                    total_sections=total_sections,
                    message=self._section_message(
                        VideoPreviewSectionStatus.FAILED,
                        section_index=index,
                        total_sections=total_sections,
                    ),
                    progress_override=self._section_progress(
                        section_index=index,
                        total_sections=total_sections,
                        status=VideoPreviewSectionStatus.FAILED,
                    ),
                    error_message="当前分段渲染失败，已跳过",
                )

            render_summary = self._build_render_summary(
                total_sections=total_sections,
                successful_sections=successful_sections,
            )
            agent.render_summary = render_summary
            render_successes = render_summary["successfulSections"]
            render_total = render_summary["totalSections"]
            if render_successes < render_summary["requiredSuccesses"]:
                raise VideoPipelineError(
                    stage=VideoStage.RENDER,
                    error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                    message=(
                        f"Render quality gate failed: {render_successes}/{render_total} sections, "
                        f"minimum {render_summary['requiredSuccesses']} required"
                    ),
                )

            await self._emit(
                task,
                VideoStage.COMPOSE,
                0.0,
                "拼接最终视频...",
                progress_override=95,
                extra_context=self._preview_signal(preview_state),
            )
            composed_video, cover_path = self._concatenate_section_clips(
                ordered_section_clips,
                work_dir=work_dir,
            )

            duration = _probe_duration(composed_video)
            file_size = composed_video.stat().st_size
            compose_result = ComposeResult(
                video_path=str(composed_video),
                cover_path=str(cover_path),
                duration=max(1, duration),
                file_size=max(1, file_size),
            )

            await self._emit(
                task,
                VideoStage.UPLOAD,
                0.0,
                "上传视频...",
                progress_override=98,
                extra_context=self._preview_signal(preview_state),
            )
            upload_svc = UploadService(
                asset_store=asset_store,
                settings=self._settings,
                runtime=runtime,
            )
            upload_result = await upload_svc.execute(
                task_id=task_id,
                compose_result=compose_result,
            )

            knowledge_points = [
                section.get("title", "")
                for section in (getattr(getattr(agent, "outline", None), "sections", []) or [])
                if isinstance(section, dict) and section.get("title")
            ]
            pipeline_elapsed_seconds = max(1, int(round(time.monotonic() - pipeline_started_at)))
            completion_message = "视频生成完成"
            if render_successes < render_total:
                completion_message = (
                    f"视频生成完成（部分片段降级，已渲染 {render_successes}/{render_total}）"
                )
                logger.warning(
                    "Pipeline completed with degraded render coverage task_id=%s render_success=%s/%s",
                    task_id,
                    render_successes,
                    render_total,
                )

            video_result = VideoResult(
                task_id=task_id,
                video_url=upload_result.video_url,
                cover_url=upload_result.cover_url,
                duration=max(1, duration),
                summary=knowledge_point[:100],
                knowledge_points=knowledge_points or [knowledge_point[:50]],
                result_id=f"vr-{task_id}",
                completed_at=_utc_iso(),
                title=knowledge_point[:60],
                provider_used=assembly.provider_summary(),
                task_elapsed_seconds=pipeline_elapsed_seconds,
                render_summary=render_summary,
            )

            detail = merge_result_detail(
                runtime.load_model("result_detail", VideoResultDetail),
                status="completed",
                result=video_result.model_dump(mode="json", by_alias=True),
            )
            runtime.save_model("result_detail", detail)

            preview_state = mark_preview_status(preview_state, status="completed")
            runtime.save_preview(preview_state)
            await self._emit(
                task,
                VideoStage.UPLOAD,
                1.0,
                completion_message,
                progress_override=100,
                extra_context=self._preview_signal(preview_state),
            )
            logger.info(
                "Pipeline done  task_id=%s  elapsed_ms=%s  output_duration_s=%s  render_success=%s/%s",
                task_id,
                int(round((time.monotonic() - pipeline_started_at) * 1000)),
                duration,
                render_successes,
                render_total,
            )
            return TaskResult.completed(
                message=completion_message,
                context=video_result.model_dump(mode="json", by_alias=True),
            )

        except VideoPipelineError as exc:
            self._persist_failure_runtime(runtime, preview_state, exc)
            raise
        except Exception as exc:
            logger.exception("Pipeline failed  task_id=%s", task_id)
            pipeline_error = VideoPipelineError(
                stage=VideoStage.RENDER,
                error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                message=str(exc),
            )
            self._persist_failure_runtime(runtime, preview_state, pipeline_error)
            raise pipeline_error from exc

    def _create_c2v_agent(
        self,
        knowledge_point: str,
        work_dir: Path,
        bridge: LLMBridge,
    ) -> TeachingVideoAgent:
        """创建 Code2Video agent。动态检测 mllm_feedback endpoint 决定是否开启视觉反馈。"""
        has_mllm = "mllm_feedback" in bridge._endpoints
        cfg = RunConfig(
            use_feedback=has_mllm,
            use_assets=False,
            api=bridge.text_api("manim_gen"),
            feedback_rounds=1 if has_mllm else 0,
            max_code_token_length=10000,
            max_fix_bug_tries=5,
            max_regenerate_tries=3,
            max_feedback_gen_code_tries=2,
            max_mllm_fix_bugs_tries=2,
        )
        if has_mllm:
            logger.info("MLLM feedback ENABLED (1 round) for formula/layout correction")
        else:
            logger.info("MLLM feedback DISABLED — no mllm_feedback binding in database")

        return TeachingVideoAgent(
            idx=0,
            knowledge_point=knowledge_point,
            folder=str(work_dir),
            cfg=cfg,
        )

    def _build_preview_from_agent(
        self,
        task_id: str,
        summary: str,
        agent: TeachingVideoAgent,
    ):
        sections = [
            VideoPreviewSection(
                section_id=str(getattr(section, "id", f"section_{index + 1}")),
                section_index=index,
                title=str(getattr(section, "title", f"第 {index + 1} 段")),
                lecture_lines=list(getattr(section, "lecture_lines", []) or []),
            )
            for index, section in enumerate(getattr(agent, "sections", []) or [])
        ]
        knowledge_points = [
            item.get("title", "")
            for item in (getattr(getattr(agent, "outline", None), "sections", []) or [])
            if isinstance(item, dict) and item.get("title")
        ]
        return build_preview_state(
            task_id=task_id,
            status="processing",
            preview_available=True,
            preview_version=1,
            summary=summary[:100],
            knowledge_points=knowledge_points,
            sections=sections,
        )

    def _publish_tts_audio_assets(
        self,
        asset_store: LocalAssetStore,
        *,
        task_id: str,
        tts_audio_map: dict[str, Path],
    ) -> dict[str, str]:
        """发布可试听的 section 旁白资源。"""
        audio_urls: dict[str, str] = {}
        for section_id, audio_path in tts_audio_map.items():
            if not audio_path.exists():
                continue
            suffix = audio_path.suffix or ".mp3"
            asset = asset_store.copy_file(
                audio_path,
                f"video/{task_id}/tts/{section_id}{suffix}",
            )
            audio_urls[section_id] = asset.public_url
        return audio_urls

    def _compose_section_clip(
        self,
        *,
        section_id: str,
        section_video_path: Path,
        audio_path: Path | None,
        work_dir: Path,
    ) -> Path:
        """合成单个 section 的带音频预览片段。"""
        preview_dir = work_dir / "preview_sections"
        preview_dir.mkdir(exist_ok=True)
        output_path = preview_dir / f"{section_id}_with_audio.mp4"
        return _compose_section_with_audio(section_video_path, audio_path, output_path)

    def _publish_section_clip(
        self,
        asset_store: LocalAssetStore,
        *,
        task_id: str,
        section_id: str,
        section_clip_path: Path,
    ) -> str:
        """发布单个 section 预览片段并返回公开 URL。"""
        asset = asset_store.copy_file(
            section_clip_path,
            f"video/{task_id}/sections/{section_id}.mp4",
        )
        return asset.public_url

    def _concatenate_section_clips(
        self,
        section_clips: list[Path],
        *,
        work_dir: Path,
    ) -> tuple[Path, Path]:
        """拼接所有成功 section 的片段作为最终视频。"""
        if not section_clips:
            raise VideoPipelineError(
                stage=VideoStage.RENDER,
                error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                message="没有可拼接的视频片段",
            )

        composed_dir = work_dir / "composed"
        composed_dir.mkdir(exist_ok=True)
        final_output = composed_dir / "final_with_audio.mp4"
        if len(section_clips) == 1:
            shutil.copy2(section_clips[0], final_output)
        else:
            _concat_videos(section_clips, final_output)

        cover = composed_dir / "cover.jpg"
        _extract_cover(final_output, cover)
        return final_output, cover

    def _build_render_summary(
        self,
        *,
        total_sections: int,
        successful_sections: list[str],
    ) -> dict[str, object]:
        """生成 per-section 流式执行后的渲染汇总。"""
        required_successes = required_render_successes(total_sections)
        successful_count = len(successful_sections)
        incomplete_count = max(0, total_sections - successful_count)
        stop_reason = None
        if incomplete_count > 0:
            stop_reason = (
                "section-failures-omitted"
                if successful_count >= required_successes
                else "quality-gate-failed"
            )
        return {
            "totalSections": total_sections,
            "successfulSections": successful_count,
            "incompleteSections": incomplete_count,
            "requiredSuccesses": required_successes,
            "allSectionsRendered": successful_count == total_sections,
            "completionMode": "full" if successful_count == total_sections else "degraded",
            "stopReason": stop_reason,
            "successfulSectionIds": list(successful_sections),
        }

    def _persist_failure_runtime(
        self,
        runtime: VideoRuntimeStateStore,
        preview_state,
        error: VideoPipelineError,
    ) -> None:
        """在异常场景下回写预览与 result_detail。"""
        current_preview = runtime.load_preview() or preview_state
        if current_preview is not None:
            failed_preview = mark_preview_status(current_preview, status="failed")
            runtime.save_preview(failed_preview)
        failure = build_failure(
            task_id=runtime.task_id,
            stage=error.stage,
            error_code=error.error_code,
            message=str(error),
            failed_at=_utc_iso(),
        )
        detail = merge_result_detail(
            runtime.load_model("result_detail", VideoResultDetail),
            status="failed",
            failure=failure.model_dump(mode="json", by_alias=True),
        )
        runtime.save_model("result_detail", detail)

    def _bind_agent_section_callback(
        self,
        agent: TeachingVideoAgent,
        loop: asyncio.AbstractEventLoop,
        task: BaseTask,
        runtime: VideoRuntimeStateStore,
    ) -> None:
        """将 agent 内部的修复信号转为异步 SSE 事件。"""

        def _log_callback_failure(future: asyncio.Future) -> None:
            error = future.exception()
            if error is None:
                return
            logger.warning(
                "Section callback failed task_id=%s error=%s",
                task.context.task_id,
                error,
                exc_info=error,
            )

        def callback(payload: dict[str, Any]) -> None:
            future = asyncio.run_coroutine_threadsafe(
                self._handle_agent_section_signal(task, runtime, payload),
                loop,
            )
            future.add_done_callback(_log_callback_failure)

        agent.section_status_callback = callback

    async def _handle_agent_section_signal(
        self,
        task: BaseTask,
        runtime: VideoRuntimeStateStore,
        payload: dict[str, Any],
    ) -> None:
        """处理 agent 在线程内发回的分段修复信号。"""
        if str(payload.get("status") or "") != VideoPreviewSectionStatus.FIXING.value:
            return
        preview = runtime.load_preview()
        section_id = str(payload.get("sectionId") or "")
        if preview is None or not section_id:
            return

        section_index = self._resolve_section_index(preview, section_id)
        total_sections = max(1, preview.total_sections)
        fix_attempt = int(payload.get("attemptNo") or 0) or None
        max_fix_attempts = int(payload.get("maxFixAttempts") or 0) or None
        preview = update_preview_section(
            preview,
            section_id=section_id,
            status=VideoPreviewSectionStatus.FIXING,
            preview_available=True,
            fix_attempt=fix_attempt,
        )
        runtime.save_preview(preview)
        await self._emit_section_event(
            task,
            preview=preview,
            stage=VideoStage.MANIM_FIX,
            status=VideoPreviewSectionStatus.FIXING,
            event="section_progress",
            section_id=section_id,
            section_index=section_index,
            total_sections=total_sections,
            message=self._section_message(
                VideoPreviewSectionStatus.FIXING,
                section_index=section_index,
                total_sections=total_sections,
                fix_attempt=fix_attempt,
                max_fix_attempts=max_fix_attempts,
            ),
            progress_override=self._section_progress(
                section_index=section_index,
                total_sections=total_sections,
                status=VideoPreviewSectionStatus.FIXING,
            ),
            fix_attempt=fix_attempt,
            max_fix_attempts=max_fix_attempts,
        )

    @staticmethod
    def _preview_signal(preview) -> dict[str, object]:
        """返回写入 status/SSE context 的 preview 信号。"""
        if preview is None:
            return {"previewAvailable": False, "previewVersion": 0}
        return {
            "previewAvailable": preview.preview_available,
            "previewVersion": preview.preview_version,
        }

    @staticmethod
    def _resolve_section_index(preview, section_id: str) -> int:
        for section in preview.sections:
            if section.section_id == section_id:
                return section.section_index
        return 0

    @staticmethod
    def _section_progress(
        *,
        section_index: int,
        total_sections: int,
        status: VideoPreviewSectionStatus,
    ) -> int:
        if total_sections <= 0:
            return SECTION_LOOP_PROGRESS_START
        span = SECTION_LOOP_PROGRESS_END - SECTION_LOOP_PROGRESS_START
        block_start = SECTION_LOOP_PROGRESS_START + (span * section_index / total_sections)
        block_end = SECTION_LOOP_PROGRESS_START + (span * (section_index + 1) / total_sections)
        ratio = SECTION_STATUS_RATIOS[status]
        return max(
            SECTION_LOOP_PROGRESS_START,
            min(SECTION_LOOP_PROGRESS_END, round(block_start + (block_end - block_start) * ratio)),
        )

    @staticmethod
    def _section_message(
        status: VideoPreviewSectionStatus,
        *,
        section_index: int,
        total_sections: int,
        fix_attempt: int | None = None,
        max_fix_attempts: int | None = None,
    ) -> str:
        ordinal = f"{section_index + 1}/{total_sections}"
        if status == VideoPreviewSectionStatus.GENERATING:
            return f"正在生成第 {ordinal} 段动画脚本"
        if status == VideoPreviewSectionStatus.RENDERING:
            return f"正在渲染第 {ordinal} 段"
        if status == VideoPreviewSectionStatus.FIXING:
            if fix_attempt is not None and max_fix_attempts is not None:
                return f"正在自动修复第 {ordinal} 段（第 {fix_attempt}/{max_fix_attempts} 次尝试）"
            return f"正在自动修复第 {ordinal} 段"
        if status == VideoPreviewSectionStatus.READY:
            return f"第 {ordinal} 段已可预览"
        if status == VideoPreviewSectionStatus.FAILED:
            return f"第 {ordinal} 段渲染失败，已跳过"
        return f"第 {ordinal} 段等待中"

    async def _emit_section_event(
        self,
        task: BaseTask,
        *,
        preview,
        stage: VideoStage,
        status: VideoPreviewSectionStatus,
        event: str,
        section_id: str,
        section_index: int,
        total_sections: int,
        message: str,
        progress_override: int,
        clip_url: str | None = None,
        fix_attempt: int | None = None,
        max_fix_attempts: int | None = None,
        error_message: str | None = None,
    ) -> None:
        """发射 section 级事件，同时复用统一运行态快照。"""
        extra_context = self._preview_signal(preview)
        extra_context.update(
            {
                "sectionId": section_id,
                "sectionIndex": section_index,
                "totalSections": total_sections,
                "sectionStatus": status.value,
                "overallProgress": progress_override,
            }
        )
        if clip_url is not None:
            extra_context["clipUrl"] = clip_url
        if fix_attempt is not None:
            extra_context["fixAttempt"] = fix_attempt
        if max_fix_attempts is not None:
            extra_context["maxFixAttempts"] = max_fix_attempts
        if error_message is not None:
            extra_context["errorMessage"] = error_message

        await self._emit(
            task,
            stage,
            SECTION_STATUS_RATIOS[status],
            message,
            event=event,
            extra_context=extra_context,
            progress_override=progress_override,
        )

    async def _run_tts(
        self,
        agent: TeachingVideoAgent,
        assembly: VideoProviderRuntimeAssembly,
        work_dir: Path,
    ) -> dict[str, Path]:
        """运行 TTS，为每个 section 生成音频。"""
        tts_providers = assembly.tts_for("tts")
        if not tts_providers:
            logger.warning("No TTS providers configured, video will be silent")
            return {}

        sections = [
            {"id": section.id, "lecture_lines": section.lecture_lines}
            for section in (getattr(agent, "sections", []) or [])
        ]
        if not sections:
            return {}

        health_store = ProviderHealthStore(self._runtime_store)
        audio_dir = work_dir / "tts_audio"
        audio_dir.mkdir(exist_ok=True)
        return await _run_tts_for_sections(
            sections,
            tts_providers,
            health_store,
            audio_dir,
        )

    def _build_bridge(self, assembly: VideoProviderRuntimeAssembly) -> LLMBridge:
        """从 Provider 装配结果构建 LLMBridge。"""
        bridge = LLMBridge()
        logger.info(
            "Building LLM bridge  source=%s  summary=%s",
            assembly.source,
            assembly.provider_summary(),
        )
        stage_mapping = {
            "understanding": "understanding",
            "storyboard": "storyboard",
            "manim_gen": "manim_gen",
            "manim_fix": "manim_fix",
            "mllm_feedback": "mllm_feedback",
        }
        for c2v_stage, our_stage in stage_mapping.items():
            providers = assembly.llm_for(our_stage)
            if not providers:
                continue
            try:
                endpoint = endpoint_from_provider(providers[0])
                bridge.register_stage(c2v_stage, endpoint)
                logger.info(
                    "Bridge stage %s -> %s  base_url=%s  model=%s",
                    c2v_stage,
                    providers[0].provider_id,
                    endpoint.base_url[:50],
                    endpoint.model_name,
                )
            except Exception as exc:
                logger.warning(
                    "Failed to extract endpoint for stage %s provider %s: %s",
                    c2v_stage,
                    providers[0].provider_id,
                    exc,
                )

        if assembly.default_llm:
            try:
                bridge.set_default(endpoint_from_provider(assembly.default_llm[0]))
            except Exception as exc:
                logger.warning("Failed to set default endpoint: %s", exc)
        return bridge

    async def _resolve_providers(self, task: BaseTask) -> VideoProviderRuntimeAssembly:
        """解析 Provider 配置。从 Redis 读取任务创建时保存的 auth token。"""
        from app.features.video.runtime_auth import load_video_runtime_auth
        from app.providers.factory import get_provider_factory

        resolver = ProviderRuntimeResolver(
            settings=self._settings,
            provider_factory=get_provider_factory(),
        )
        auth = load_video_runtime_auth(self._runtime_store, task_id=task.context.task_id)
        access_token = auth.access_token if auth else None
        client_id = auth.client_id if auth else None
        return await resolver.resolve_video_pipeline(
            access_token=access_token,
            client_id=client_id,
        )

    async def _emit(
        self,
        task: BaseTask,
        stage: VideoStage,
        ratio: float,
        message: str,
        *,
        event: str = "progress",
        extra_context: dict[str, object] | None = None,
        progress_override: int | None = None,
    ) -> None:
        """发射运行态快照与 SSE 事件。"""
        try:
            abs_progress, stage_progress = resolve_stage_progress(stage, ratio)
            if progress_override is not None:
                abs_progress = progress_override
            profile = get_stage_profile(stage)
            context = {
                "stage": stage.value,
                "stageLabel": profile.display_label,
                "stageProgress": stage_progress,
            }
            context.update(extra_context or {})
            await task.emit_runtime_snapshot(
                internal_status=TaskInternalStatus.RUNNING,
                progress=abs_progress,
                message=message,
                context=context,
                event=event,
            )
        except Exception:
            logger.warning(
                "SSE emit failed  task_id=%s  stage=%s",
                task.context.task_id,
                stage.value,
                exc_info=True,
            )


def get_video_pipeline_service(
    runtime_store: RuntimeStore,
    metadata_service: VideoMetadataPersister,
    *,
    settings: Settings | None = None,
) -> VideoPipelineService:
    """工厂函数，创建视频管线服务实例。"""
    return VideoPipelineService(
        runtime_store,
        metadata_service,
        settings=settings,
    )
