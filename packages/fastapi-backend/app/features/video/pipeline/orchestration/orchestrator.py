"""视频生成编排器 — ManimCat-aligned TeachingVideoAgent。

职责:
1. 从 ProviderRuntimeResolver 获取 LLM/TTS Provider 配置
2. 构建 LLMBridge 并注入到 agent
3. 运行两阶段生成: design → code → bulk render
4. 运行 TTS 生成旁白音频
5. FFmpeg 合成音频+视频
6. 上传最终视频
7. 全程发射 SSE 进度事件
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings
from app.features.video.pipeline.constants import VIDEO_OUTPUT_FORMAT
from app.features.video.pipeline.engine.agent import (
    RunConfig,
    TeachingVideoAgent,
    required_render_successes,
)
from app.features.video.pipeline.engine.code_retry import detect_doom_loop
from app.features.video.pipeline.engine.gpt_request import (
    LLMBridge,
    configure_bridge,
    endpoint_from_provider,
)
from app.features.video.pipeline.engine.render_failure import (
    RenderFailureStore,
)
from app.features.video.pipeline.engine.sanitizer import sanitize_render_error
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    ComposeResult,
    UnderstandingResult,
    VideoArtifactGraph,
    VideoPreviewSection,
    VideoPreviewSectionStatus,
    VideoResult,
    VideoResultDetail,
    VideoStage,
    build_video_result_id,
    get_stage_profile,
    resolve_stage_progress,
)
from app.features.video.pipeline.services import UnderstandingService
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration import subtitle as subtitle_mod
from app.features.video.pipeline.orchestration.media_utils import (
    compose_section_with_audio as _compose_section_with_audio,
    concat_videos as _concat_videos,
    extract_cover as _extract_cover,
    probe_duration as _probe_duration,
)
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    attach_preview_audio_urls,
    build_failure,
    build_preview_state,
    mark_preview_status,
    mark_unfinished_preview_sections_failed,
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
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
)

logger = logging.getLogger(__name__)

SECTION_LOOP_PROGRESS_START = 26
SECTION_LOOP_PROGRESS_END = 94
PREVIEW_SUMMARY_MAX_STEPS = 4
PREVIEW_SUMMARY_MAX_CHARS = 1200
SECTION_STATUS_RATIOS: dict[VideoPreviewSectionStatus, float] = {
    VideoPreviewSectionStatus.PENDING: 0.0,
    VideoPreviewSectionStatus.GENERATING: 0.25,
    VideoPreviewSectionStatus.RENDERING: 0.75,
    VideoPreviewSectionStatus.FIXING: 0.85,
    VideoPreviewSectionStatus.READY: 1.0,
    VideoPreviewSectionStatus.FAILED: 1.0,
}


class _VideoPipelineCancelled(RuntimeError):
    """流水线内的协作式取消短路。"""

    def __init__(self, result: TaskResult) -> None:
        super().__init__(result.message)
        self.result = result


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


def _contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def _normalize_preview_compare(text: str) -> str:
    return re.sub(r"[\W_]+", "", text, flags=re.UNICODE).casefold()


# ---------------------------------------------------------------------------
# Pipeline-stage data classes (avoid dict passing between stages)
# ---------------------------------------------------------------------------


@dataclass
class _PipelineContext:
    """Immutable context set once during _init_pipeline."""

    task_id: str
    knowledge_point: str
    work_dir: Path
    video_root: Path
    pipeline_started_at: float
    # 用户上传图片（local:// 解析后的绝对路径）。分镜设计阶段会喂给多模态模型，
    # 让 LLM 真正"看见"图片内容，而不是只吃 understanding 抽取的文字摘要。
    reference_images: list[Path] = field(default_factory=list)
    # learning_coach 预生成 task，由 _run_design_stage 启动（understanding 后），
    # _run_finalize 在 video upload 完成前 await 它。与 storyboard/manim/render/TTS
    # 完全并行，视频通常 3-8min，preload 只需 20-40s，隐藏无痕。
    preload_task: asyncio.Task[Any] | None = None


@dataclass
class _AgentSetup:
    """Outputs of _setup_agent — provider resolution, bridge, and agent."""

    assembly: VideoProviderRuntimeAssembly
    bridge: LLMBridge
    agent: TeachingVideoAgent
    loop: asyncio.AbstractEventLoop


@dataclass
class _DesignResult:
    """Outputs of _run_design_stage."""

    design_text: str
    sections: list[Any]
    understanding: UnderstandingResult
    preview_state: Any = None


@dataclass
class _TTSResult:
    """Outputs of _run_tts_stage."""

    tts_audio_map: dict[str, Path]
    audio_urls: dict[str, str]
    preview_state: Any = None


@dataclass
class _CodegenResult:
    """Outputs of _run_codegen_stage."""

    design_text: str


@dataclass
class _RenderResult:
    """Outputs of _run_render_stage."""

    ordered_clips: list[Path] = field(default_factory=list)
    successful_sections: list[str] = field(default_factory=list)
    render_summary: dict[str, object] = field(default_factory=dict)


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
            except (ConnectionError, TimeoutError, OSError):
                if attempt < 3:
                    delay = attempt * 5  # 5s, 10s
                    logger.warning(
                        "TTS attempt %d/3 failed for %s, retrying in %ds...",
                        attempt,
                        section_id,
                        delay,
                        exc_info=True,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "TTS failed for %s after 3 attempts", section_id, exc_info=True
                    )
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
            except (ConnectionError, TimeoutError, OSError):
                logger.error("TTS batch retry failed for %s", section_id)

    return results



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
        provider_factory: Any | None = None,
        settings: Settings | None = None,
        asset_store: LocalAssetStore | None = None,
    ) -> None:
        self._runtime_store = runtime_store
        self._metadata_service = metadata_service
        # Keep legacy constructor kwargs accepted while orchestration owns
        # provider resolution and asset-store creation internally.
        self._provider_factory = provider_factory
        self._settings = settings or get_settings()
        self._asset_store = asset_store
        self._max_emitted_progress = 0

    # ── Stage 0: Thin coordinator ──────────────────────────────────

    async def _emit_stage(
        self,
        task: BaseTask,
        stage: VideoStage,
        ratio: float,
        message: str,
        *,
        extra: dict[str, object] | None = None,
        event: str = "progress",
    ) -> None:
        """Legacy stage emitter that clamps regressive progress updates."""
        absolute_progress, stage_progress = resolve_stage_progress(stage, ratio)
        clamped_progress = max(self._max_emitted_progress, absolute_progress)
        self._max_emitted_progress = clamped_progress
        profile = get_stage_profile(stage)
        context = {
            "stage": stage.value,
            "stageLabel": profile.display_label,
            "stageProgress": stage_progress,
        }
        context.update(extra or {})
        await task.emit_runtime_snapshot(
            internal_status=TaskInternalStatus.RUNNING,
            progress=clamped_progress,
            message=message,
            context=context,
            event=event,
        )

    async def _handle_pipeline_failure(
        self,
        task_context: Any,
        runtime: VideoRuntimeStateStore,
        error: VideoPipelineError,
    ) -> Any:
        """Legacy failure helper retained for unit-test compatibility."""
        self._persist_failure_runtime(runtime, runtime.load_preview(), error)
        absolute_progress, stage_progress = resolve_stage_progress(error.stage, 1.0)
        clamped_progress = max(self._max_emitted_progress, absolute_progress)
        self._max_emitted_progress = clamped_progress
        profile = get_stage_profile(error.stage)
        return type(
            "PipelineFailureSnapshot",
            (),
            {
                "progress": clamped_progress,
                "message": str(error),
                "context": {
                    "stage": error.stage.value,
                    "stageLabel": profile.display_label,
                    "stageProgress": stage_progress,
                    "failedStage": error.stage.value,
                    "progress": clamped_progress,
                    "taskId": getattr(task_context, "task_id", runtime.task_id),
                },
            },
        )()

    def _get_cancelled_result(
        self,
        runtime: VideoRuntimeStateStore,
        preview_state: Any = None,
    ) -> TaskResult | None:
        """在不污染失败语义的前提下构造取消结果。"""
        if not runtime.is_cancel_requested():
            return None

        current_state = self._runtime_store.get_task_state(runtime.task_id) or {}
        raw_context = current_state.get("context")
        context = dict(raw_context) if isinstance(raw_context, dict) else {}
        context["cancelRequested"] = True

        cancel_request = runtime.load_cancel_request()
        message = "任务已取消" if cancel_request is not None else str(
            current_state.get("message") or "任务已取消"
        )
        latest_preview = runtime.load_preview() or preview_state
        if latest_preview is not None and latest_preview.status != "cancelled":
            runtime.save_preview(mark_preview_status(latest_preview, status="cancelled"))

        return TaskResult(
            status=TaskStatus.CANCELLED,
            message=message,
            progress=max(
                self._max_emitted_progress,
                int(current_state.get("progress") or 0),
            ),
            error_code=str(current_state.get("errorCode") or TaskErrorCode.CANCELLED),
            context=context,
        )

    def _raise_if_cancelled(
        self,
        runtime: VideoRuntimeStateStore,
        preview_state: Any = None,
    ) -> None:
        """若检测到取消请求则立即短路流水线。"""
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            raise _VideoPipelineCancelled(cancelled_result)

    @staticmethod
    def _cancel_pending_codegen(
        pending_codegen: dict[str, asyncio.Future[str]],
    ) -> None:
        """尽量取消尚未开始的后台 codegen 任务。"""
        for future in pending_codegen.values():
            future.cancel()
        pending_codegen.clear()

    async def run(self, task: BaseTask) -> TaskResult:
        """Execute full video generation pipeline (thin coordinator)."""
        self._max_emitted_progress = 0
        runtime = VideoRuntimeStateStore(self._runtime_store, task.context.task_id)
        preview_state = None

        try:
            ctx = self._init_pipeline(task)
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            setup = await self._setup_agent(task, ctx, runtime)
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            design = await self._run_design_stage(task, ctx, setup, runtime)
            preview_state = design.preview_state
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            tts = await self._run_tts_stage(task, ctx, setup, design, runtime)
            preview_state = tts.preview_state
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            codegen = await self._run_codegen_stage(task, ctx, setup, design)
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            render = await self._run_render_stage(
                task,
                ctx,
                setup,
                tts,
                codegen,
                runtime,
            )
            preview_state = runtime.load_preview() or preview_state
            cancelled_result = self._get_cancelled_result(runtime, preview_state)
            if cancelled_result is not None:
                return cancelled_result

            return await self._run_finalize(
                task,
                ctx,
                setup,
                tts,
                render,
                runtime,
            )

        except _VideoPipelineCancelled as exc:
            return exc.result
        except VideoPipelineError as exc:
            self._persist_failure_runtime(runtime, preview_state, exc)
            raise
        except Exception as exc:
            logger.exception("Pipeline failed  task_id=%s", task.context.task_id)
            pipeline_error = VideoPipelineError(
                stage=VideoStage.RENDER,
                error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                message=str(exc),
            )
            self._persist_failure_runtime(runtime, preview_state, pipeline_error)
            raise pipeline_error from exc

    # ── Stage 1: Init paths & validate ─────────────────────────────

    def _init_pipeline(self, task: BaseTask) -> _PipelineContext:
        """Validate input and prepare working directories."""
        task_id = task.context.task_id
        metadata = task.context.metadata or {}
        source_payload = metadata.get("sourcePayload", {})

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

        reference_images = self._resolve_reference_images(source_payload)
        logger.info(
            "Pipeline start  task_id=%s  work_dir=%s  reference_images=%d",
            task_id,
            work_dir,
            len(reference_images),
        )

        return _PipelineContext(
            task_id=task_id,
            knowledge_point=knowledge_point,
            work_dir=work_dir,
            video_root=video_root,
            pipeline_started_at=time.monotonic(),
            reference_images=reference_images,
        )

    def _resolve_reference_images(
        self, source_payload: dict[str, Any]
    ) -> list[Path]:
        """Resolve local:// imageRef(s) in source_payload into absolute Paths.

        前端目前只上传单张，但留出 list 接口以便后续扩展。
        """
        refs: list[str] = []
        single = source_payload.get("imageRef")
        if isinstance(single, str) and single:
            refs.append(single)
        multi = source_payload.get("imageRefs")
        if isinstance(multi, list):
            refs.extend(r for r in multi if isinstance(r, str) and r)

        # imageRef 由 LocalImageStorage 写入 video_image_storage_root（默认
        # data/uploads/video），与管道中间产物根 video_asset_root 不同。
        base_dir = Path(
            getattr(self._settings, "video_image_storage_root", "data/uploads/video")
        )
        resolved: list[Path] = []
        for ref in refs:
            if not ref.startswith("local://"):
                continue
            full_path = base_dir / ref.removeprefix("local://")
            if full_path.exists():
                resolved.append(full_path)
            else:
                logger.warning("Reference image not found on disk: %s", full_path)
        return resolved

    # ── Stage 2: Resolve providers & create agent ──────────────────

    async def _setup_agent(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        runtime: VideoRuntimeStateStore,
    ) -> _AgentSetup:
        """Resolve providers, build bridge, create agent."""
        metadata = task.context.metadata or {}
        self._layout_hint = (
            str(
                metadata.get("layout_hint")
                or getattr(self._settings, "video_default_layout_hint", "center_stage")
            ).strip()
            or "center_stage"
        )
        self._render_quality = (
            str(
                metadata.get("render_quality")
                or getattr(self._settings, "video_render_quality", "l")
            ).strip()
            or "l"
        )
        raw_section_count = metadata.get("section_count")
        if raw_section_count is None:
            raw_section_count = getattr(self._settings, "video_section_max_count", 6)
        try:
            self._section_count = max(1, min(int(raw_section_count), 12))
        except (TypeError, ValueError):
            self._section_count = max(
                1, min(int(getattr(self._settings, "video_section_max_count", 6)), 12)
            )
        raw_codegen_concurrency = metadata.get(
            "section_codegen_concurrency"
        ) or getattr(self._settings, "video_section_codegen_concurrency", 1)
        try:
            self._section_codegen_concurrency = max(
                1, min(int(raw_codegen_concurrency), 8)
            )
        except (TypeError, ValueError):
            self._section_codegen_concurrency = 1

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
            knowledge_point=ctx.knowledge_point,
            work_dir=ctx.work_dir,
            bridge=bridge,
            assembly=assembly,
            reference_images=ctx.reference_images,
        )
        self._bind_agent_section_callback(agent, loop, task, runtime)
        return _AgentSetup(assembly=assembly, bridge=bridge, agent=agent, loop=loop)

    # ── Stage 3: Design (understanding + storyboard) ───────────────

    async def _run_design_stage(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        runtime: VideoRuntimeStateStore,
    ) -> _DesignResult:
        """Generate design text and build initial preview state."""
        metadata = task.context.metadata or {}
        await self._emit(
            task,
            VideoStage.UNDERSTANDING,
            0.1,
            "生成解题摘要...",
            progress_override=3,
        )
        understanding = await self._run_understanding_stage(
            task,
            ctx,
            setup,
            runtime,
        )
        preview_state = self._build_initial_preview_state(
            task_id=ctx.task_id,
            understanding=understanding,
            fallback_summary=ctx.knowledge_point,
        )
        runtime.save_preview(preview_state)
        await self._emit(
            task,
            VideoStage.UNDERSTANDING,
            1.0,
            "解题摘要生成完成",
            progress_override=10,
            extra_context=self._preview_signal(preview_state),
        )

        # 并行预生成：inline asyncio task 真正跟 storyboard/manim/render 共同调度，
        # _run_finalize 末尾会 await 它。不用 Dramatiq 消息（跨进程 + fire-and-forget
        # 都不够可靠），直接在本 event loop 里并发跑。
        topic_hint_for_preload = (
            (understanding.topic_summary if understanding else None)
            or preview_state.summary
            or ctx.knowledge_point
        )
        source_payload_for_preload = metadata.get("sourcePayload") or {}
        image_ref_for_preload = (
            source_payload_for_preload.get("imageRef")
            if isinstance(source_payload_for_preload, dict)
            else None
        )
        ctx.preload_task = asyncio.create_task(
            self._preload_learning_coach_inline(
                task_id=ctx.task_id,
                title=topic_hint_for_preload or "",
                assembly=setup.assembly,
                understanding=understanding,
                image_ref=image_ref_for_preload,
            ),
            name=f"learning_coach_preload:{ctx.task_id}",
        )

        duration_minutes = metadata.get(
            "duration_minutes",
            getattr(self._settings, "video_default_duration_minutes", 5),
        )
        design_text, sections = await setup.loop.run_in_executor(
            None,
            setup.agent.generate_design,
            duration_minutes,
        )
        logger.info("ManimCat design generated: %d sections", len(sections))

        await self._emit(
            task,
            VideoStage.STORYBOARD,
            0.0,
            "生成视频分镜...",
            progress_override=11,
        )
        preview_state = self._build_preview_from_agent(
            ctx.task_id,
            preview_state,
            setup.agent,
            ctx.knowledge_point,
        )
        runtime.save_preview(preview_state)
        await self._emit(
            task,
            VideoStage.STORYBOARD,
            1.0,
            "视频分镜生成完成",
            progress_override=20,
            extra_context=self._preview_signal(preview_state),
        )
        return _DesignResult(
            design_text=design_text,
            sections=sections,
            understanding=understanding
            or UnderstandingResult(
                topic_summary=preview_state.summary,
                knowledge_points=preview_state.knowledge_points,
                solution_steps=[],
                difficulty="unknown",
                subject="general",
                provider_used="fallback",
            ),
            preview_state=preview_state,
        )

    # ── Stage 4: TTS ───────────────────────────────────────────────

    async def _run_tts_stage(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        design: _DesignResult,
        runtime: VideoRuntimeStateStore,
    ) -> _TTSResult:
        """Run TTS for all sections and publish audio URLs."""
        preview_state = design.preview_state
        await self._emit(
            task,
            VideoStage.TTS,
            0.0,
            "生成旁白...",
            progress_override=21,
            extra_context=self._preview_signal(preview_state),
        )
        tts_audio_map = await self._run_tts(
            setup.agent,
            setup.assembly,
            ctx.work_dir,
        )
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
                "TTS partial: %d/%d sections have audio, proceeding",
                tts_success,
                expected_sections,
            )

        asset_store = LocalAssetStore.from_settings(self._settings)
        audio_urls = self._publish_tts_audio_assets(
            asset_store,
            task_id=ctx.task_id,
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
        return _TTSResult(
            tts_audio_map=tts_audio_map,
            audio_urls=audio_urls,
            preview_state=preview_state,
        )

    # ── Stage 5: Code generation ───────────────────────────────────

    async def _run_codegen_stage(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        design: _DesignResult,
    ) -> _CodegenResult:
        """Prepare section-level code generation based on the global design."""
        await self._emit(
            task,
            VideoStage.MANIM_GEN,
            0.0,
            "准备逐段生成动画脚本...",
            progress_override=26,
            extra_context=self._preview_signal(design.preview_state),
        )
        return _CodegenResult(design_text=design.design_text)

    # ── Stage 6: Render with sanitizer + render_failure integration ─

    async def _run_render_stage(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        tts: _TTSResult,
        codegen: _CodegenResult,
        runtime: VideoRuntimeStateStore,
    ) -> _RenderResult:
        """Generate / render sections progressively with per-section failure isolation."""
        preview_state = tts.preview_state
        self._raise_if_cancelled(runtime, preview_state)
        sections = list(getattr(setup.agent, "sections", []) or [])
        total_sections = len(sections)
        if total_sections == 0:
            raise VideoPipelineError(
                stage=VideoStage.STORYBOARD,
                error_code=VideoTaskErrorCode.VIDEO_STORYBOARD_FAILED,
                message="未生成任何分段内容",
            )

        await self._emit(
            task,
            VideoStage.RENDER,
            0.0,
            "逐段生成并渲染透明视频片段...",
            progress_override=27,
            extra_context=self._preview_signal(preview_state),
        )

        failure_store = RenderFailureStore(
            redis_client=self._runtime_store.client,
        )
        asset_store = LocalAssetStore.from_settings(self._settings)
        ordered_clips: list[Path] = []
        successful_sections: list[str] = []
        pending_codegen: dict[str, asyncio.Future[str]] = {}
        section_cursor = 0
        max_codegen_workers = max(1, getattr(self, "_section_codegen_concurrency", 1))

        with ThreadPoolExecutor(max_workers=max_codegen_workers) as codegen_executor:
            preview_state, section_cursor = await self._fill_codegen_queue(
                task=task,
                sections=sections,
                section_cursor=section_cursor,
                pending_codegen=pending_codegen,
                total_sections=total_sections,
                setup=setup,
                preview_state=preview_state,
                runtime=runtime,
                design_text=codegen.design_text,
                executor=codegen_executor,
            )
            if runtime.is_cancel_requested():
                self._cancel_pending_codegen(pending_codegen)
                self._raise_if_cancelled(runtime, runtime.load_preview() or preview_state)

            for index, section in enumerate(sections):
                if runtime.is_cancel_requested():
                    self._cancel_pending_codegen(pending_codegen)
                    self._raise_if_cancelled(
                        runtime, runtime.load_preview() or preview_state
                    )

                preview_state = runtime.load_preview() or preview_state
                codegen_future = pending_codegen.pop(section.id, None)
                if codegen_future is None:
                    preview_state = await self._start_section_codegen(
                        task=task,
                        section=section,
                        index=index,
                        total_sections=total_sections,
                        preview_state=preview_state,
                        runtime=runtime,
                    )
                    codegen_future = setup.loop.run_in_executor(
                        codegen_executor,
                        setup.agent.generate_section_code,
                        section,
                        codegen.design_text,
                    )

                cancelled_result = self._get_cancelled_result(
                    runtime, runtime.load_preview() or preview_state
                )
                if cancelled_result is not None:
                    codegen_future.cancel()
                    self._cancel_pending_codegen(pending_codegen)
                    raise _VideoPipelineCancelled(cancelled_result)

                try:
                    await codegen_future
                except (
                    VideoPipelineError,
                    RuntimeError,
                    OSError,
                    ValueError,
                ) as codegen_err:
                    preview_state = await self._mark_section_failed(
                        task=task,
                        section=section,
                        index=index,
                        total_sections=total_sections,
                        stage=VideoStage.MANIM_GEN,
                        error_message=f"第 {index + 1}/{total_sections} 段脚本生成失败：{codegen_err}",
                        preview_state=preview_state,
                        runtime=runtime,
                    )
                    preview_state, section_cursor = await self._fill_codegen_queue(
                        task=task,
                        sections=sections,
                        section_cursor=section_cursor,
                        pending_codegen=pending_codegen,
                        total_sections=total_sections,
                        setup=setup,
                        preview_state=preview_state,
                        runtime=runtime,
                        design_text=codegen.design_text,
                        executor=codegen_executor,
                    )
                    continue

                preview_state, section_cursor = await self._fill_codegen_queue(
                    task=task,
                    sections=sections,
                    section_cursor=section_cursor,
                    pending_codegen=pending_codegen,
                    total_sections=total_sections,
                    setup=setup,
                    preview_state=preview_state,
                    runtime=runtime,
                    design_text=codegen.design_text,
                        executor=codegen_executor,
                    )

                cancelled_result = self._get_cancelled_result(
                    runtime, runtime.load_preview() or preview_state
                )
                if cancelled_result is not None:
                    self._cancel_pending_codegen(pending_codegen)
                    raise _VideoPipelineCancelled(cancelled_result)

                preview_state = await self._mark_section_rendering(
                    task=task,
                    section=section,
                    index=index,
                    total_sections=total_sections,
                    preview_state=preview_state,
                    runtime=runtime,
                )
                try:
                    section_video = await setup.loop.run_in_executor(
                        None, setup.agent.render_section, section
                    )
                except (
                    subprocess.CalledProcessError,
                    RuntimeError,
                    OSError,
                    ValueError,
                ) as render_err:
                    preview_state = await self._handle_section_failure(
                        task=task,
                        section=section,
                        index=index,
                        total_sections=total_sections,
                        task_id=ctx.task_id,
                        preview_state=preview_state,
                        runtime=runtime,
                        failure_store=failure_store,
                        render_error=render_err,
                    )
                    continue

                (
                    ordered_clips,
                    successful_sections,
                    preview_state,
                ) = await self._handle_section_success(
                    task=task,
                    section=section,
                    index=index,
                    total_sections=total_sections,
                    section_video=section_video,
                    audio_path=tts.tts_audio_map.get(section.id),
                    audio_urls=tts.audio_urls,
                    work_dir=ctx.work_dir,
                    task_id=ctx.task_id,
                    asset_store=asset_store,
                    ordered_clips=ordered_clips,
                    successful_sections=successful_sections,
                    preview_state=preview_state,
                    runtime=runtime,
                )

        render_summary = self._build_render_summary(
            total_sections=total_sections,
            successful_sections=successful_sections,
        )
        setup.agent.render_summary = render_summary
        render_successes = render_summary["successfulSections"]
        if render_successes < render_summary["requiredSuccesses"]:
            raise VideoPipelineError(
                stage=VideoStage.RENDER,
                error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                message=(
                    f"Render quality gate failed: "
                    f"{render_successes}/{render_summary['totalSections']} sections, "
                    f"minimum {render_summary['requiredSuccesses']} required"
                ),
            )
        return _RenderResult(
            ordered_clips=ordered_clips,
            successful_sections=successful_sections,
            render_summary=render_summary,
        )

    # ── Stage 7: Finalize (compose + upload + result) ──────────────

    async def _run_finalize(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        tts: _TTSResult,
        render: _RenderResult,
        runtime: VideoRuntimeStateStore,
    ) -> TaskResult:
        """Compose final video, upload, and return TaskResult."""
        # Prefer the latest persisted preview so render-stage READY/FAILED state survives finalization.
        preview_state = runtime.load_preview() or tts.preview_state
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        render_successes = render.render_summary["successfulSections"]
        render_total = render.render_summary["totalSections"]

        await self._emit(
            task,
            VideoStage.COMPOSE,
            0.0,
            "拼接最终视频...",
            progress_override=95,
            extra_context=self._preview_signal(preview_state),
        )
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        composed_video, cover_path = self._concatenate_section_clips(
            render.ordered_clips,
            work_dir=ctx.work_dir,
        )

        # ── 字幕烧录 ─────────────────────────────────────────────
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        await self._emit(
            task,
            VideoStage.COMPOSE,
            0.5,
            "烧录字幕...",
            progress_override=96,
            extra_context=self._preview_signal(preview_state),
        )

        composed_video = self._burn_subtitles(
            composed_video=composed_video,
            agent_sections=list(getattr(setup.agent, "sections", []) or []),
            successful_section_ids=render.successful_sections,
            section_clips=render.ordered_clips,
            work_dir=ctx.work_dir,
        )

        duration = _probe_duration(composed_video)
        file_size = composed_video.stat().st_size
        compose_result = ComposeResult(
            video_path=str(composed_video),
            cover_path=str(cover_path),
            duration=max(1, duration),
            file_size=max(1, file_size),
        )
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        await self._emit(
            task,
            VideoStage.UPLOAD,
            0.0,
            "上传视频...",
            progress_override=98,
            extra_context=self._preview_signal(preview_state),
        )
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        asset_store = LocalAssetStore.from_settings(self._settings)
        upload_svc = UploadService(
            asset_store=asset_store,
            settings=self._settings,
            runtime=runtime,
        )
        upload_result = await upload_svc.execute(
            task_id=ctx.task_id,
            compose_result=compose_result,
        )
        cancelled_result = self._get_cancelled_result(runtime, preview_state)
        if cancelled_result is not None:
            return cancelled_result

        knowledge_points = [
            section.get("title", "")
            for section in (
                getattr(getattr(setup.agent, "outline", None), "sections", []) or []
            )
            if isinstance(section, dict) and section.get("title")
        ]
        pipeline_elapsed_seconds = max(
            1, int(round(time.monotonic() - ctx.pipeline_started_at))
        )
        completion_message = "视频生成完成"
        if render_successes < render_total:
            completion_message = f"视频生成完成（部分片段降级，已渲染 {render_successes}/{render_total}）"
            logger.warning(
                "Pipeline completed with degraded render task_id=%s render=%s/%s",
                ctx.task_id,
                render_successes,
                render_total,
            )

        video_result = VideoResult(
            task_id=ctx.task_id,
            video_url=upload_result.video_url,
            cover_url=upload_result.cover_url,
            duration=max(1, duration),
            summary=preview_state.summary or ctx.knowledge_point[:100],
            knowledge_points=preview_state.knowledge_points
            or knowledge_points
            or [ctx.knowledge_point[:50]],
            result_id=build_video_result_id(ctx.task_id),
            completed_at=_utc_iso(),
            title=ctx.knowledge_point[:60],
            provider_used=setup.assembly.provider_summary(),
            task_elapsed_seconds=pipeline_elapsed_seconds,
            render_summary=render.render_summary,
        )

        detail = merge_result_detail(
            runtime.load_model("result_detail", VideoResultDetail),
            status="completed",
            result=video_result.model_dump(mode="json", by_alias=True),
        )
        runtime.save_model("result_detail", detail)

        # ── Story 6.7: 持久化 result-detail + artifact-graph + 产物索引 ──
        await self._persist_pipeline_artifacts(
            asset_store=asset_store,
            task=task,
            ctx=ctx,
            setup=setup,
            render=render,
            preview_state=preview_state,
            detail=detail,
            runtime=runtime,
        )

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
            "Pipeline done  task_id=%s  elapsed_ms=%s  duration_s=%s  render=%s/%s",
            ctx.task_id,
            int(round((time.monotonic() - ctx.pipeline_started_at) * 1000)),
            duration,
            render_successes,
            render_total,
        )

        # 等待 learning_coach 预生成完成：_run_design_stage 启动的 inline task 与
        # 整个管道并行跑，通常 20-40s 完成；到这里视频已渲染好（3-8min），预生成
        # 大概率早已 done。await 最多等 90s —— 超时则不阻塞视频交付，用户点
        # quiz 时降级到 entry-trigger 或实时 LLM 路径。
        if ctx.preload_task is not None:
            try:
                await asyncio.wait_for(ctx.preload_task, timeout=90)
                logger.info(
                    "learning_coach.preload.synced_before_finalize  task_id=%s",
                    ctx.task_id,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "learning_coach.preload.timeout_before_finalize  task_id=%s  "
                    "video ready but quiz may need lazy LLM call",
                    ctx.task_id,
                )
            except Exception:  # noqa: BLE001
                logger.warning(
                    "learning_coach.preload.failed_before_finalize  task_id=%s",
                    ctx.task_id,
                    exc_info=True,
                )

        return TaskResult.completed(
            message=completion_message,
            context=video_result.model_dump(mode="json", by_alias=True),
        )

    async def _preload_learning_coach_inline(
        self,
        *,
        task_id: str,
        title: str,
        assembly: VideoProviderRuntimeAssembly,
        understanding: Any = None,
        image_ref: str | None = None,
    ) -> None:
        """视频管道内的 inline 预生成：与 storyboard/manim/render/TTS 并行执行。

        不走 Dramatiq actor —— 那是跨进程 fire-and-forget，不好观测。直接在当前
        event loop 里以 asyncio.Task 形式跑，由 _run_finalize 末尾 await。
        provider_chain 直接复用视频 pipeline 已经 resolve 好的 assembly.llm_for("solve")
        （或任一 stage 的 LLM），避免再过一次 RuoYi runtime resolver。
        """
        try:
            from app.features.learning_coach.schemas import (
                LearningCoachSource,
                LearningCoachSourceSolutionStep,
                LearningCoachSourceType,
            )
            from app.features.learning_coach.service import LearningCoachService

            # assembly.llm_for("solve") 是通用 LLM 链（video 管道所有 stage 共享同一
            # 来源：gemini-3-flash 或 RuoYi 运维配置的默认），拿它给 learning_coach 用
            # 完全兼容。
            llm_chain = assembly.llm_for("solve") or assembly.default_llm
            if not llm_chain:
                logger.warning(
                    "learning_coach.preload_inline.no_llm_chain  task_id=%s",
                    task_id,
                )
                return

            # 把视频管道 understanding 的高密度讲解 + 结构化要点 + 原图透传给
            # quiz 生成器，让 quiz 拿到和视频同一份上下文，避免凭 title 瞎猜。
            understanding_summary = None
            understanding_kps: list[str] | None = None
            understanding_steps: list[LearningCoachSourceSolutionStep] | None = None
            if understanding is not None:
                understanding_summary = (
                    getattr(understanding, "topic_summary", None) or None
                )
                kps = list(getattr(understanding, "knowledge_points", None) or [])
                understanding_kps = [p for p in kps if p] or None
                raw_steps = list(getattr(understanding, "solution_steps", None) or [])
                converted: list[LearningCoachSourceSolutionStep] = []
                for step in raw_steps[:8]:
                    s_title = (getattr(step, "title", "") or "").strip()
                    s_expl = (getattr(step, "explanation", "") or "").strip()
                    if s_title and s_expl:
                        converted.append(
                            LearningCoachSourceSolutionStep(
                                title=s_title[:120], explanation=s_expl[:1000]
                            )
                        )
                understanding_steps = converted or None

            source = LearningCoachSource(
                source_type=LearningCoachSourceType.VIDEO,
                source_session_id=task_id,
                source_task_id=task_id,
                topic_hint=(title or None) if not understanding_summary else (title or None),
                topic_summary=understanding_summary,
                knowledge_points=understanding_kps,
                solution_steps=understanding_steps,
                image_ref=image_ref or None,
            )
            service = LearningCoachService(
                runtime_store=self._runtime_store,
                provider_chain=llm_chain,
            )
            logger.info(
                "learning_coach.preload_inline.start  task_id=%s  title_len=%d",
                task_id,
                len(title or ""),
            )
            await service.preload_for_session(source)
            logger.info(
                "learning_coach.preload_inline.done  task_id=%s",
                task_id,
            )
        except Exception:  # noqa: BLE001 — 预生成绝不影响视频主流程
            logger.warning(
                "learning_coach.preload_inline.failed  task_id=%s",
                task_id,
                exc_info=True,
            )

    def _schedule_learning_coach_preload(self, *, task_id: str, title: str) -> None:
        """视频完成钩子：把 learning_coach 预生成委托给独立 Dramatiq actor。

        复用视频任务创建时落到 Redis 的 access_token（load_video_runtime_auth），
        把它作为消息参数传给 preload_learning_coach actor —— 该 actor 自己用
        asyncio.run 跑 LLM 调用链，生命周期独立于本 orchestrator actor。
        任何失败都只 warn 不抛，不影响视频完成语义。
        """
        try:
            from app.features.video.runtime_auth import load_video_runtime_auth

            auth = load_video_runtime_auth(self._runtime_store, task_id=task_id)
            access_token = auth.access_token if auth else None
            client_id = auth.client_id if auth else None

            from app.worker import preload_learning_coach_actor  # lazy 避免循环依赖

            if preload_learning_coach_actor is None:
                logger.warning(
                    "learning_coach.preload.actor_not_ready  task_id=%s", task_id
                )
                return

            preload_learning_coach_actor.send(
                task_id,
                title or "",
                access_token,
                client_id,
            )
            logger.info(
                "learning_coach.preload.scheduled  task_id=%s",
                task_id,
            )
        except Exception:  # noqa: BLE001 — 预生成调度失败不得阻塞视频完成
            logger.warning(
                "learning_coach.preload.schedule_failed  task_id=%s",
                task_id,
                exc_info=True,
            )

    # ── Story 6.7: Pipeline artifact persistence ──────────────────

    async def _persist_pipeline_artifacts(
        self,
        *,
        asset_store: LocalAssetStore,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        render: _RenderResult,
        preview_state,
        detail: VideoResultDetail,
        runtime: VideoRuntimeStateStore,
    ) -> None:
        """持久化 result-detail、artifact-graph 并同步产物索引到 RuoYi。"""
        from app.features.video.service._helpers import (
            build_artifact_graph_ref,
            persist_result_detail,
        )

        # 1. 持久化 result-detail 到资产路径
        try:
            detail, _detail_ref = persist_result_detail(asset_store, ctx.task_id, detail)
            runtime.save_model("result_detail", detail)
        except Exception:
            logger.warning(
                "persist_result_detail failed  task_id=%s", ctx.task_id, exc_info=True,
            )
            detail = detail.model_copy(update={"artifact_writeback_failed": True})
            runtime.save_model("result_detail", detail)

        # 2. 构建并持久化 artifact-graph
        graph_ref: str | None = None
        try:
            graph = self._build_artifact_graph(
                task_id=ctx.task_id,
                preview_state=preview_state,
                setup=setup,
                render=render,
            )
            graph_ref = build_artifact_graph_ref(asset_store, ctx.task_id)
            asset_store.write_json(
                asset_store.ref_to_key(graph_ref),
                graph.model_dump(mode="json", by_alias=True),
            )
        except Exception:
            logger.warning(
                "artifact-graph persist failed  task_id=%s", ctx.task_id, exc_info=True,
            )
            detail = detail.model_copy(update={"artifact_writeback_failed": True})
            runtime.save_model("result_detail", detail)

        # 3. 同步产物索引到 RuoYi
        if graph_ref is not None:
            try:
                from app.features.video.runtime_auth import load_video_runtime_auth

                request_auth = load_video_runtime_auth(
                    runtime.runtime_store,
                    task_id=ctx.task_id,
                )
                await self._metadata_service.sync_artifact_graph(
                    graph,
                    artifact_ref=graph_ref,
                    request_auth=request_auth,
                )
            except Exception:
                logger.warning(
                    "sync_artifact_graph to RuoYi failed  task_id=%s",
                    ctx.task_id, exc_info=True,
                )
                detail = detail.model_copy(update={"long_term_writeback_failed": True})
                runtime.save_model("result_detail", detail)

    def _build_artifact_graph(
        self,
        *,
        task_id: str,
        preview_state,
        setup: _AgentSetup,
        render: _RenderResult,
    ) -> VideoArtifactGraph:
        """从管道运行结果构建视频产物图谱。"""
        artifacts: list[ArtifactPayload] = []

        # timeline
        timeline_scenes: list[dict[str, Any]] = []
        sections = list(getattr(setup.agent, "sections", []) or [])
        for section in sections:
            section_id = str(getattr(section, "id", ""))
            if not section_id:
                continue
            start_time = getattr(section, "start_time", None)
            end_time = getattr(section, "end_time", None)
            timeline_scenes.append({
                "sceneId": section_id,
                "title": str(getattr(section, "title", "")),
                "startTime": start_time,
                "endTime": end_time,
            })
        if timeline_scenes:
            artifacts.append(ArtifactPayload(
                artifact_type=ArtifactType.TIMELINE,
                data={"scenes": timeline_scenes},
            ))

        # narration
        narration_segments: list[dict[str, Any]] = []
        for section in sections:
            section_id = str(getattr(section, "id", ""))
            lecture_lines = list(getattr(section, "lecture_lines", []) or [])
            if section_id and lecture_lines:
                narration_segments.append({
                    "sceneId": section_id,
                    "text": "。".join(lecture_lines),
                    "startTime": getattr(section, "start_time", None),
                    "endTime": getattr(section, "end_time", None),
                })
        if narration_segments:
            artifacts.append(ArtifactPayload(
                artifact_type=ArtifactType.NARRATION,
                data={"segments": narration_segments},
            ))

        # knowledge_points
        if preview_state is not None and getattr(preview_state, "knowledge_points", None):
            artifacts.append(ArtifactPayload(
                artifact_type=ArtifactType.KNOWLEDGE_POINTS,
                data={"items": list(preview_state.knowledge_points)},
            ))

        # solution_steps (from preview sections titles)
        if preview_state is not None and getattr(preview_state, "sections", None):
            steps = [
                {
                    "stepIndex": s.section_index,
                    "title": s.title,
                    "explanation": " ".join(s.lecture_lines[:2]) if s.lecture_lines else "",
                }
                for s in preview_state.sections
                if s.title
            ]
            if steps:
                artifacts.append(ArtifactPayload(
                    artifact_type=ArtifactType.SOLUTION_STEPS,
                    data={"steps": steps},
                ))

        # topic_summary
        summary = ""
        if preview_state is not None:
            summary = str(getattr(preview_state, "summary", "") or "")
        if summary:
            artifacts.append(ArtifactPayload(
                artifact_type=ArtifactType.STORYBOARD,
                data={"topic_summary": summary},
            ))

        return VideoArtifactGraph(
            session_id=task_id,
            artifacts=artifacts,
        )

    # ── Section success/failure helpers ────────────────────────────

    async def _fill_codegen_queue(
        self,
        *,
        task: BaseTask,
        sections: list[Any],
        section_cursor: int,
        pending_codegen: dict[str, asyncio.Future[str]],
        total_sections: int,
        setup: _AgentSetup,
        preview_state,
        runtime: VideoRuntimeStateStore,
        design_text: str,
        executor: ThreadPoolExecutor,
    ) -> tuple[Any, int]:
        """预填充 section codegen 队列，允许后续 section 在后台生成。"""
        max_workers = max(1, getattr(self, "_section_codegen_concurrency", 1))
        while section_cursor < len(sections) and len(pending_codegen) < max_workers:
            if runtime.is_cancel_requested():
                break
            section = sections[section_cursor]
            if section.id in pending_codegen:
                section_cursor += 1
                continue
            preview_state = await self._start_section_codegen(
                task=task,
                section=section,
                index=section_cursor,
                total_sections=total_sections,
                preview_state=preview_state,
                runtime=runtime,
            )
            pending_codegen[section.id] = setup.loop.run_in_executor(
                executor,
                setup.agent.generate_section_code,
                section,
                design_text,
            )
            section_cursor += 1
        return preview_state, section_cursor

    async def _start_section_codegen(
        self,
        *,
        task: BaseTask,
        section: Any,
        index: int,
        total_sections: int,
        preview_state,
        runtime: VideoRuntimeStateStore,
    ):
        """标记 section 进入 generating 状态并发射事件。"""
        preview_state = update_preview_section(
            preview_state,
            section_id=section.id,
            status=VideoPreviewSectionStatus.GENERATING,
            preview_available=True,
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
        return preview_state

    async def _mark_section_failed(
        self,
        *,
        task: BaseTask,
        section: Any,
        index: int,
        total_sections: int,
        stage: VideoStage,
        error_message: str,
        preview_state,
        runtime: VideoRuntimeStateStore,
        message: str | None = None,
    ):
        """统一收口单 section 的 failed 状态。"""
        preview_state = update_preview_section(
            preview_state,
            section_id=section.id,
            status=VideoPreviewSectionStatus.FAILED,
            preview_available=True,
            error_message=error_message,
        )
        runtime.save_preview(preview_state)
        await self._emit_section_event(
            task,
            preview=preview_state,
            stage=stage,
            status=VideoPreviewSectionStatus.FAILED,
            event="section_progress",
            section_id=section.id,
            section_index=index,
            total_sections=total_sections,
            message=message
            or self._section_message(
                VideoPreviewSectionStatus.FAILED,
                section_index=index,
                total_sections=total_sections,
            ),
            progress_override=self._section_progress(
                section_index=index,
                total_sections=total_sections,
                status=VideoPreviewSectionStatus.FAILED,
            ),
            error_message=error_message,
        )
        return preview_state

    async def _mark_section_rendering(
        self,
        *,
        task: BaseTask,
        section: Any,
        index: int,
        total_sections: int,
        preview_state,
        runtime: VideoRuntimeStateStore,
    ):
        """标记 section 进入 rendering 状态并发射事件。"""
        preview_state = update_preview_section(
            preview_state,
            section_id=section.id,
            status=VideoPreviewSectionStatus.RENDERING,
            preview_available=True,
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
        return preview_state

    async def _handle_section_success(
        self,
        *,
        task: BaseTask,
        section: Any,
        index: int,
        total_sections: int,
        section_video: str,
        audio_path: Path | None,
        audio_urls: dict[str, str],
        work_dir: Path,
        task_id: str,
        asset_store: LocalAssetStore,
        ordered_clips: list[Path],
        successful_sections: list[str],
        preview_state,
        runtime: VideoRuntimeStateStore,
    ) -> tuple[list[Path], list[str], Any]:
        """Process a successfully rendered section: compose, publish, emit."""
        section_video_path = Path(section_video)
        section_clip_path = self._compose_section_clip(
            section_id=section.id,
            section_video_path=section_video_path,
            audio_path=audio_path,
            work_dir=work_dir,
        )
        clip_url = self._publish_section_clip(
            asset_store,
            task_id=task_id,
            section_id=section.id,
            section_clip_path=section_clip_path,
        )
        ordered_clips.append(section_clip_path)
        successful_sections.append(section.id)

        preview_state = update_preview_section(
            preview_state,
            section_id=section.id,
            status=VideoPreviewSectionStatus.READY,
            preview_available=True,
            clip_url=clip_url,
            audio_url=audio_urls.get(section.id),
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
        return ordered_clips, successful_sections, preview_state

    async def _handle_section_failure(
        self,
        *,
        task: BaseTask,
        section: Any,
        index: int,
        total_sections: int,
        task_id: str,
        preview_state,
        runtime: VideoRuntimeStateStore,
        failure_store: RenderFailureStore,
        render_error: Exception,
    ) -> Any:
        """Sanitize render error, persist failure, check doom loop."""
        stderr_text = str(getattr(render_error, "stderr", "") or render_error)
        stdout_text = str(getattr(render_error, "stdout", "") or "")
        code_text = str(getattr(render_error, "code", "") or "")
        sanitized = sanitize_render_error(
            stderr=stderr_text,
            stdout=stdout_text,
            code=code_text,
        )

        await failure_store.record_failure(
            task_id=task_id,
            section_id=section.id,
            error_type=sanitized.error_type.value,
            sanitized_message=sanitized.message,
            code_snippet=sanitized.code_snippet,
        )

        history = await failure_store.get_failure_history(task_id, section.id)
        signatures = [r.error_signature for r in history]
        is_doom = detect_doom_loop(signatures)
        error_detail = (
            f"Doom loop detected ({sanitized.error_type.value}): {sanitized.message}"
            if is_doom
            else f"[{sanitized.error_type.value}] {sanitized.message}"
        )
        if is_doom:
            logger.warning(
                "Doom loop detected for section %s, stopping retries",
                section.id,
            )

        preview_state = await self._mark_section_failed(
            task=task,
            section=section,
            index=index,
            total_sections=total_sections,
            stage=VideoStage.RENDER,
            error_message=error_detail,
            preview_state=preview_state,
            runtime=runtime,
        )
        return preview_state

    def _resolve_stage_knob(
        self,
        assembly: VideoProviderRuntimeAssembly | None,
        stage: str,
        key: str,
        fallback: Any,
    ) -> tuple[Any, str]:
        """按 binding.runtime_settings > settings/default 三级 fallback 解析旋钮。

        返回 (value, source)，source ∈ {"ruoyi-binding", "fallback"}。
        """
        if assembly is not None:
            stage_settings = assembly.runtime_settings_for(stage) or {}
            if key in stage_settings:
                return stage_settings[key], "ruoyi-binding"
        return fallback, "fallback"

    def _create_c2v_agent(
        self,
        knowledge_point: str,
        work_dir: Path,
        bridge: LLMBridge,
        assembly: VideoProviderRuntimeAssembly | None = None,
        reference_images: list[Path] | None = None,
    ) -> TeachingVideoAgent:
        """创建 Code2Video agent，优先走 section 级生成/渲染路径。

        所有可调旋钮优先级（高→低）：
          1. RuoYi 后台 xm_ai_module_binding.runtime_settings_json（对应 stage）—— 运维可调
          2. settings / env 兜底
          3. 硬编码默认
        agent.py 内再用 max/min 做硬安全边界。
        """
        # patch_retry_max_retries 走 retry_attempts 列（与 runtime_settings 分离）
        patch_retry = None
        if assembly is not None:
            patch_retry = assembly.retry_attempts_for("manim_fix")
        patch_retry_source = "ruoyi-binding" if patch_retry is not None else "fallback"
        if patch_retry is None:
            patch_retry = getattr(
                self._settings, "video_patch_retry_max_retries", 2
            )

        # 其余旋钮走 binding.runtime_settings_json
        feedback_rounds, fr_src = self._resolve_stage_knob(
            assembly, "mllm_feedback", "feedbackRounds", 0
        )
        max_fix_bug_tries, mfb_src = self._resolve_stage_knob(
            assembly, "manim_fix", "maxFixBugTries", 1
        )
        max_regenerate_tries, mrt_src = self._resolve_stage_knob(
            assembly, "manim_gen", "maxRegenerateTries", 1
        )
        max_feedback_gen_code_tries, mfgct_src = self._resolve_stage_knob(
            assembly, "mllm_feedback", "maxFeedbackGenCodeTries", 0
        )
        max_mllm_fix_bugs_tries, mmfbt_src = self._resolve_stage_knob(
            assembly, "mllm_feedback", "maxMllmFixBugsTries", 0
        )
        static_guard_max_passes, sgmp_src = self._resolve_stage_knob(
            assembly, "render_verify", "staticGuardMaxPasses",
            getattr(self._settings, "video_static_guard_max_passes", 3),
        )
        section_codegen_max_tokens, scmt_src = self._resolve_stage_knob(
            assembly, "manim_gen", "sectionCodegenMaxTokens",
            getattr(self._settings, "video_section_codegen_max_tokens", 4000),
        )
        section_codegen_max_completion_tokens, scmct_src = self._resolve_stage_knob(
            assembly, "manim_gen", "sectionCodegenMaxCompletionTokens",
            getattr(self._settings, "video_section_codegen_max_completion_tokens", 8000),
        )
        section_codegen_concurrency, scc_src = self._resolve_stage_knob(
            assembly, "manim_gen", "sectionCodegenConcurrency",
            getattr(self, "_section_codegen_concurrency", 1),
        )
        render_quality, rq_src = self._resolve_stage_knob(
            assembly, "render_verify", "renderQuality",
            getattr(
                self,
                "_render_quality",
                getattr(self._settings, "video_render_quality", "l"),
            ),
        )

        cfg = RunConfig(
            use_feedback=False,
            use_assets=False,
            api=bridge.text_api("manim_gen"),
            feedback_rounds=int(feedback_rounds),
            max_code_token_length=10000,
            max_fix_bug_tries=int(max_fix_bug_tries),
            max_regenerate_tries=int(max_regenerate_tries),
            max_feedback_gen_code_tries=int(max_feedback_gen_code_tries),
            max_mllm_fix_bugs_tries=int(max_mllm_fix_bugs_tries),
            layout_hint=getattr(self, "_layout_hint", None),
            static_guard_max_passes=int(static_guard_max_passes),
            patch_retry_max_retries=int(patch_retry),
            section_count=getattr(self, "_section_count", None),
            section_codegen_max_tokens=int(section_codegen_max_tokens),
            section_codegen_max_completion_tokens=int(section_codegen_max_completion_tokens),
            section_codegen_concurrency=int(section_codegen_concurrency),
            render_quality=str(render_quality),
        )
        resolved_knobs = {
            "feedback_rounds": (feedback_rounds, fr_src),
            "max_fix_bug_tries": (max_fix_bug_tries, mfb_src),
            "max_regenerate_tries": (max_regenerate_tries, mrt_src),
            "max_feedback_gen_code_tries": (max_feedback_gen_code_tries, mfgct_src),
            "max_mllm_fix_bugs_tries": (max_mllm_fix_bugs_tries, mmfbt_src),
            "static_guard_max_passes": (static_guard_max_passes, sgmp_src),
            "patch_retry_max_retries": (int(patch_retry), patch_retry_source),
            "section_codegen_max_tokens": (section_codegen_max_tokens, scmt_src),
            "section_codegen_max_completion_tokens": (
                section_codegen_max_completion_tokens, scmct_src
            ),
            "section_codegen_concurrency": (section_codegen_concurrency, scc_src),
            "render_quality": (render_quality, rq_src),
            "layout_hint": (getattr(self, "_layout_hint", None), "metadata/settings"),
        }
        logger.info("pipeline knobs resolved: %s", resolved_knobs)

        return TeachingVideoAgent(
            idx=0,
            knowledge_point=knowledge_point,
            folder=str(work_dir),
            cfg=cfg,
            reference_images=list(reference_images or []),
        )

    def _build_preview_from_agent(
        self,
        task_id: str,
        preview_seed,
        agent: TeachingVideoAgent,
        source_text: str,
    ):
        sections = [
            VideoPreviewSection(
                section_id=str(getattr(section, "id", f"section_{index + 1}")),
                section_index=index,
                title=str(getattr(section, "title", f"第 {index + 1} 段")),
                lecture_lines=list(getattr(section, "lecture_lines", []) or []),
                visual_notes=self._build_preview_visual_notes(section),
            )
            for index, section in enumerate(getattr(agent, "sections", []) or [])
        ]
        outline_points = [
            item.get("title", "")
            for item in (getattr(getattr(agent, "outline", None), "sections", []) or [])
            if isinstance(item, dict) and item.get("title")
        ]
        return build_preview_state(
            task_id=task_id,
            status="processing",
            preview_available=True,
            preview_version=(getattr(preview_seed, "preview_version", 0) or 0) + 1,
            summary=self._resolve_preview_summary_from_agent(
                preview_seed=preview_seed,
                sections=sections,
                fallback=source_text,
            ),
            knowledge_points=self._resolve_preview_knowledge_points(
                preview_seed=getattr(preview_seed, "knowledge_points", None) or [],
                sections=sections,
                outline_points=outline_points,
                source_text=source_text,
            ),
            sections=sections,
        )

    @staticmethod
    def _looks_like_preview_fallback(summary: str, *, fallback: str) -> bool:
        cleaned_summary = summary.strip()
        if len(cleaned_summary) < 24:
            return True

        normalized_summary = _normalize_preview_compare(cleaned_summary)
        normalized_fallback = _normalize_preview_compare(fallback)
        if normalized_summary and normalized_fallback:
            if normalized_summary == normalized_fallback:
                return True
            if normalized_fallback in normalized_summary and len(normalized_summary) <= len(normalized_fallback) + 16:
                return True

        return _contains_cjk(fallback) and not _contains_cjk(cleaned_summary)

    @staticmethod
    def _filter_preview_points(points: list[str], *, source_text: str) -> list[str]:
        prefers_cjk = _contains_cjk(source_text)
        cleaned: list[str] = []
        seen: set[str] = set()

        for raw_point in points:
            point = str(raw_point or "").strip()
            if not point or len(point) > 32:
                continue
            if prefers_cjk and not _contains_cjk(point):
                continue
            fingerprint = _normalize_preview_compare(point)
            if not fingerprint or fingerprint in seen:
                continue
            seen.add(fingerprint)
            cleaned.append(point)

        return cleaned[:4]

    @staticmethod
    def _build_preview_summary_from_sections(
        sections: list[VideoPreviewSection],
        *,
        fallback: str,
    ) -> str:
        step_lines: list[str] = []
        for section in sections[:PREVIEW_SUMMARY_MAX_STEPS]:
            lecture_lines = [
                line.strip()
                for line in section.lecture_lines
                if isinstance(line, str) and line.strip()
            ]
            explanation = lecture_lines[0] if lecture_lines else section.title.strip()
            title = section.title.strip()
            if not explanation:
                continue
            if title and title not in explanation:
                step_lines.append(f"- {title}：{explanation}")
            else:
                step_lines.append(f"- {explanation}")

        if not step_lines:
            return fallback.strip()

        if _contains_cjk(fallback):
            return (
                "先别急着只看题面，可以先按这条讲解主线理解：\n\n"
                + "\n".join(step_lines)
                + "\n\n先把这几步顺下来，后面的视频会更容易看懂。"
            )[:PREVIEW_SUMMARY_MAX_CHARS]

        return (
            "You can follow this explanation thread first:\n\n"
            + "\n".join(step_lines)
            + "\n\nOnce this flow is clear, the later video will be easier to follow."
        )[:PREVIEW_SUMMARY_MAX_CHARS]

    def _resolve_preview_summary_from_agent(
        self,
        *,
        preview_seed,
        sections: list[VideoPreviewSection],
        fallback: str,
    ) -> str:
        existing_summary = str(getattr(preview_seed, "summary", "") or "").strip()
        if existing_summary and not self._looks_like_preview_fallback(existing_summary, fallback=fallback):
            return existing_summary[:PREVIEW_SUMMARY_MAX_CHARS]
        return self._build_preview_summary_from_sections(sections, fallback=fallback)

    def _resolve_preview_knowledge_points(
        self,
        *,
        preview_seed: list[str],
        sections: list[VideoPreviewSection],
        outline_points: list[str],
        source_text: str,
    ) -> list[str]:
        existing_points = self._filter_preview_points(list(preview_seed), source_text=source_text)
        if existing_points:
            return existing_points

        section_titles = self._filter_preview_points(
            [section.title for section in sections],
            source_text=source_text,
        )
        if section_titles:
            return section_titles

        return self._filter_preview_points(outline_points, source_text=source_text)

    @staticmethod
    def _build_preview_summary(
        understanding: UnderstandingResult | None,
        *,
        fallback: str,
    ) -> str:
        """把理解阶段产物收束成等待页与结果页可共用的摘要 Markdown。"""
        blocks: list[str] = []

        if understanding is not None:
            topic_summary = understanding.topic_summary.strip()
            if topic_summary:
                blocks.append(topic_summary)

            step_lines: list[str] = []
            for index, step in enumerate(
                understanding.solution_steps[:PREVIEW_SUMMARY_MAX_STEPS],
                start=1,
            ):
                explanation = step.explanation.strip()
                title = step.title.strip()
                if not explanation:
                    continue
                if title and title not in explanation:
                    step_lines.append(f"- {title}：{explanation}")
                else:
                    step_lines.append(f"- {explanation}")

            if step_lines:
                blocks.append("\n".join(step_lines))

        if not blocks and fallback.strip():
            blocks.append(fallback.strip())

        return "\n\n".join(blocks).strip()[:PREVIEW_SUMMARY_MAX_CHARS]

    def _build_initial_preview_state(
        self,
        *,
        task_id: str,
        understanding: UnderstandingResult | None,
        fallback_summary: str,
    ):
        """在 storyboard 生成前先发布可读摘要，避免等待页只能空等。"""
        knowledge_points = understanding.knowledge_points if understanding is not None else []
        return build_preview_state(
            task_id=task_id,
            status="processing",
            preview_available=True,
            preview_version=1,
            summary=self._build_preview_summary(
                understanding,
                fallback=fallback_summary,
            ),
            knowledge_points=knowledge_points,
            sections=[],
        )

    async def _run_understanding_stage(
        self,
        task: BaseTask,
        ctx: _PipelineContext,
        setup: _AgentSetup,
        runtime: VideoRuntimeStateStore,
    ) -> UnderstandingResult | None:
        """调用理解阶段 LLM，为等待页尽早产出解题摘要。"""
        metadata = task.context.metadata or {}
        providers = getattr(setup.assembly, "llm_for", lambda _stage: ())(
            "understanding"
        )
        if not providers:
            logger.warning(
                "No understanding providers configured; fallback to raw prompt summary"
            )
            return None

        try:
            service = UnderstandingService(
                providers=providers,
                failover_service=ProviderFailoverService(
                    ProviderHealthStore(self._runtime_store)
                ),
                runtime=runtime,
            )
            return await service.execute(
                source_payload=metadata.get("sourcePayload", {}),
                user_profile=metadata.get("userProfile", {}),
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "Understanding stage failed, fallback to raw prompt summary task_id=%s",
                ctx.task_id,
            )
            return None

    @staticmethod
    def _build_preview_visual_notes(section: Any) -> list[str]:
        """把 agent section 中的画面信息收束成等待页可直接展示的 visual notes。"""
        notes: list[str] = []
        candidates = [
            *list(getattr(section, "animations", []) or []),
            getattr(section, "layout_line", ""),
            getattr(section, "start_state", ""),
            getattr(section, "end_state", ""),
            getattr(section, "raw_shot", ""),
            getattr(section, "design_text", ""),
        ]

        for candidate in candidates:
            value = str(candidate or "").strip()
            if not value or value in notes:
                continue
            notes.append(value)

        return notes[:4]

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
        output_path = preview_dir / f"{section_id}_with_audio.{VIDEO_OUTPUT_FORMAT}"
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
            f"video/{task_id}/sections/{section_id}.{VIDEO_OUTPUT_FORMAT}",
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
        final_output = composed_dir / f"final_with_audio.{VIDEO_OUTPUT_FORMAT}"
        if len(section_clips) == 1:
            shutil.copy2(section_clips[0], final_output)
        else:
            _concat_videos(section_clips, final_output)

        cover = composed_dir / "cover.jpg"
        _extract_cover(final_output, cover)
        return final_output, cover

    def _burn_subtitles(
        self,
        *,
        composed_video: Path,
        agent_sections: list[Any],
        successful_section_ids: list[str],
        section_clips: list[Path],
        work_dir: Path,
    ) -> Path:
        """从 agent sections 的 lecture_lines 生成字幕并烧录到最终视频。"""
        # 只保留成功渲染的 sections，且与 section_clips 顺序一致
        successful_id_set = set(successful_section_ids)
        matched_sections: list[dict[str, Any]] = []
        matched_clips: list[Path] = []

        for section in agent_sections:
            section_id = str(getattr(section, "id", ""))
            if section_id not in successful_id_set:
                continue
            lecture_lines = list(getattr(section, "lecture_lines", []) or [])
            matched_sections.append(
                {"id": section_id, "lecture_lines": lecture_lines}
            )

        # 按 successful_section_ids 的顺序对齐 clips
        id_to_clip = dict(zip(successful_section_ids, section_clips))
        for sid in successful_section_ids:
            clip = id_to_clip.get(sid)
            if clip and clip.exists():
                matched_clips.append(clip)

        if not matched_sections or not matched_clips:
            logger.info("No matched sections for subtitles, skipping")
            return composed_video

        subtitle_dir = work_dir / "subtitles"
        subtitle_dir.mkdir(exist_ok=True)

        try:
            return subtitle_mod.generate_and_burn_subtitles(
                video_path=composed_video,
                sections=matched_sections,
                section_clips=matched_clips,
                output_dir=subtitle_dir,
            )
        except Exception:
            logger.warning(
                "Subtitle burn failed, using video without subtitles",
                exc_info=True,
            )
            return composed_video

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
            "completionMode": "full"
            if successful_count == total_sections
            else "degraded",
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
            failed_preview = mark_unfinished_preview_sections_failed(
                current_preview,
                error_message=str(error),
            )
            failed_preview = mark_preview_status(failed_preview, status="failed")
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
        block_start = SECTION_LOOP_PROGRESS_START + (
            span * section_index / total_sections
        )
        block_end = SECTION_LOOP_PROGRESS_START + (
            span * (section_index + 1) / total_sections
        )
        ratio = SECTION_STATUS_RATIOS[status]
        return max(
            SECTION_LOOP_PROGRESS_START,
            min(
                SECTION_LOOP_PROGRESS_END,
                round(block_start + (block_end - block_start) * ratio),
            ),
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
            except (ValueError, KeyError, AttributeError) as exc:
                logger.warning(
                    "Failed to extract endpoint for stage %s provider %s: %s",
                    c2v_stage,
                    providers[0].provider_id,
                    exc,
                )

        if assembly.default_llm:
            try:
                bridge.set_default(endpoint_from_provider(assembly.default_llm[0]))
            except (ValueError, KeyError, AttributeError) as exc:
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
        auth = load_video_runtime_auth(
            self._runtime_store, task_id=task.context.task_id
        )
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
            clamped_progress = max(self._max_emitted_progress, abs_progress)
            self._max_emitted_progress = clamped_progress
            profile = get_stage_profile(stage)
            context = {
                "stage": stage.value,
                "stageLabel": profile.display_label,
                "stageProgress": stage_progress,
            }
            context.update(extra_context or {})
            await task.emit_runtime_snapshot(
                internal_status=TaskInternalStatus.RUNNING,
                progress=clamped_progress,
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
