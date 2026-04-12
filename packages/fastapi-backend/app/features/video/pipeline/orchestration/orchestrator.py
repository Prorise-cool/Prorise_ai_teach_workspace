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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings
from app.features.video.pipeline.engine.agent import RunConfig, TeachingVideoAgent
from app.features.video.pipeline.engine.gpt_request import (
    LLMBridge,
    configure_bridge,
    endpoint_from_provider,
)
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    ComposeResult,
    VideoResult,
    VideoStage,
    get_stage_profile,
    resolve_stage_progress,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import (
    VideoRuntimeStateStore,
    merge_result_detail,
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

    包装 Code2Video 的 TeachingVideoAgent，集成我们的 TTS、上传和 SSE 进度。
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
        runtime = VideoRuntimeStateStore(self._runtime_store, task_id)
        metadata = task.context.metadata or {}
        source_payload = metadata.get("sourcePayload", {})

        # 提取知识点文本
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

        # 工作目录：每个任务独立隔离，避免缓存污染
        video_root = Path(self._settings.video_asset_root) / "video"
        work_dir = video_root / "CASES" / task_id
        work_dir.mkdir(parents=True, exist_ok=True)
        # 确保 Code2Video 的共享辅助目录存在
        (video_root / "assets" / "icon").mkdir(parents=True, exist_ok=True)
        (video_root / "assets" / "reference").mkdir(parents=True, exist_ok=True)
        (video_root / "json_files").mkdir(parents=True, exist_ok=True)
        ref_mapping = video_root / "json_files" / "long_video_ref_mapping.json"
        if not ref_mapping.exists():
            ref_mapping.write_text("{}")
        logger.info("Pipeline start  task_id=%s  work_dir=%s", task_id, work_dir)

        try:
            # --- 1. 解析 Provider 链 ---
            await self._emit(
                task, VideoStage.UNDERSTANDING, 0.0, "正在初始化 Provider..."
            )
            assembly = await self._resolve_providers(task)

            # --- 2. 构建 LLM Bridge ---
            bridge = self._build_bridge(assembly)
            configure_bridge(bridge)

            # --- 3. 运行 Code2Video Agent（同步，在线程池中执行） ---
            await self._emit(task, VideoStage.UNDERSTANDING, 0.1, "生成教学大纲...")

            agent, final_video = await asyncio.get_event_loop().run_in_executor(
                None,
                self._run_c2v_agent,
                knowledge_point,
                work_dir,
                bridge,
                task,
                assembly,
            )

            if final_video is None:
                raise VideoPipelineError(
                    stage=VideoStage.RENDER,
                    error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                    message="Code2Video agent 未生成视频",
                )

            final_video_path = Path(final_video)

            # --- 4. TTS ---
            await self._emit(task, VideoStage.TTS, 0.0, "生成旁白...")
            tts_audio_map = await self._run_tts(
                agent,
                assembly,
                work_dir,
            )

            # --- 4.5 质量门禁：TTS ---
            expected_sections = len(getattr(agent, "sections", []) or [])
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
                    tts_success, expected_sections,
                )

            # --- 5. 合成（音频 + 视频） ---
            await self._emit(task, VideoStage.COMPOSE, 0.0, "合成最终视频...")
            composed_video, cover_path = self._compose_final(
                agent,
                final_video_path,
                tts_audio_map,
                work_dir,
            )

            duration = _probe_duration(composed_video)
            file_size = composed_video.stat().st_size
            compose_result = ComposeResult(
                video_path=str(composed_video),
                cover_path=str(cover_path),
                duration=max(1, duration),
                file_size=max(1, file_size),
            )

            # --- 6. 上传 ---
            await self._emit(task, VideoStage.UPLOAD, 0.0, "上传视频...")
            asset_store = LocalAssetStore.from_settings(self._settings)
            upload_svc = UploadService(
                asset_store=asset_store,
                settings=self._settings,
                runtime=runtime,
            )
            upload_result = await upload_svc.execute(
                task_id=task_id, compose_result=compose_result
            )

            # --- 7. 构建结果 ---
            knowledge_points = []
            if hasattr(agent, "outline") and agent.outline:
                knowledge_points = [
                    s.get("title", "") for s in (agent.outline.sections or [])
                ]

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
            )

            # 持久化结果
            detail = merge_result_detail(
                None,
                status="completed",
                result=video_result.model_dump(mode="json", by_alias=True),
            )
            runtime.save_model("result_detail", detail)

            await self._emit(task, VideoStage.UPLOAD, 1.0, "完成")
            logger.info("Pipeline done  task_id=%s  duration=%ds", task_id, duration)

            return TaskResult.completed(
                message="视频生成完成",
                context=video_result.model_dump(mode="json", by_alias=True),
            )

        except VideoPipelineError:
            raise
        except Exception as exc:
            logger.exception("Pipeline failed  task_id=%s", task_id)
            raise VideoPipelineError(
                stage=VideoStage.RENDER,
                error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                message=str(exc),
            ) from exc
        finally:
            pass  # work_dir 保留用于调试；生产环境可按需清理 CASES/{task_id}/

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _run_c2v_agent(
        self,
        knowledge_point: str,
        work_dir: Path,
        bridge: LLMBridge,
        task: BaseTask,
        assembly: VideoProviderRuntimeAssembly,
    ) -> tuple[TeachingVideoAgent, str | None]:
        """在同步上下文中运行 Code2Video agent。"""
        cfg = RunConfig(
            use_feedback=False,  # 暂时关闭 MLLM 反馈（需要 Gemini 视频分析，较慢）
            use_assets=False,  # 暂时关闭外部资产下载
            api=bridge.text_api("manim_gen"),
            feedback_rounds=0,
            max_code_token_length=10000,
            max_fix_bug_tries=5,
            max_regenerate_tries=3,
            max_feedback_gen_code_tries=2,
            max_mllm_fix_bugs_tries=2,
        )

        agent = TeachingVideoAgent(
            idx=0,
            knowledge_point=knowledge_point,
            folder=str(work_dir),
            cfg=cfg,
        )

        final_video = agent.GENERATE_VIDEO()
        return agent, final_video

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

        sections = []
        if hasattr(agent, "sections") and agent.sections:
            sections = [
                {"id": s.id, "lecture_lines": s.lecture_lines} for s in agent.sections
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

    def _compose_final(
        self,
        agent: TeachingVideoAgent,
        final_video_path: Path,
        tts_audio_map: dict[str, Path],
        work_dir: Path,
    ) -> tuple[Path, Path]:
        """合成最终视频（如果有 TTS 音频则逐 section 合并后再 concat）。"""
        composed_dir = work_dir / "composed"
        composed_dir.mkdir(exist_ok=True)

        if not tts_audio_map:
            # 没有 TTS，直接用 Code2Video 的输出
            cover = composed_dir / "cover.jpg"
            _extract_cover(final_video_path, cover)
            return final_video_path, cover

        # 有 TTS：逐 section 合并音频，再 concat
        section_videos = getattr(agent, "section_videos", {})
        if not section_videos:
            cover = composed_dir / "cover.jpg"
            _extract_cover(final_video_path, cover)
            return final_video_path, cover

        composed_parts: list[Path] = []
        for section_id in sorted(section_videos.keys()):
            video_path = Path(section_videos[section_id])
            if not video_path.exists():
                continue
            audio_path = tts_audio_map.get(section_id)
            output = composed_dir / f"{section_id}_with_audio.mp4"
            _compose_section_with_audio(video_path, audio_path, output)
            composed_parts.append(output)

        if not composed_parts:
            cover = composed_dir / "cover.jpg"
            _extract_cover(final_video_path, cover)
            return final_video_path, cover

        final_output = composed_dir / "final_with_audio.mp4"
        _concat_videos(composed_parts, final_output)

        cover = composed_dir / "cover.jpg"
        _extract_cover(final_output, cover)
        return final_output, cover

    def _build_bridge(self, assembly: VideoProviderRuntimeAssembly) -> LLMBridge:
        """从 Provider 装配结果构建 LLMBridge。"""
        bridge = LLMBridge()

        logger.info(
            "Building LLM bridge  source=%s  summary=%s",
            assembly.source,
            assembly.provider_summary(),
        )

        # 为每个 stage 注册 endpoint
        stage_mapping = {
            "understanding": "understanding",
            "storyboard": "storyboard",
            "manim_gen": "manim_gen",
            "manim_fix": "manim_fix",
            "mllm_feedback": "manim_fix",
        }

        for c2v_stage, our_stage in stage_mapping.items():
            providers = assembly.llm_for(our_stage)
            if providers:
                try:
                    ep = endpoint_from_provider(providers[0])
                    bridge.register_stage(c2v_stage, ep)
                    logger.info(
                        "Bridge stage %s -> %s  base_url=%s  model=%s",
                        c2v_stage,
                        providers[0].provider_id,
                        ep.base_url[:50],
                        ep.model_name,
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to extract endpoint for stage %s provider %s: %s",
                        c2v_stage,
                        providers[0].provider_id,
                        exc,
                    )

        # 设置默认 endpoint
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

        factory = get_provider_factory()
        resolver = ProviderRuntimeResolver(
            settings=self._settings,
            provider_factory=factory,
        )

        # 从 Redis 读取任务创建时保存的 auth 凭据
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
    ) -> None:
        """发射 SSE 进度事件。"""
        try:
            abs_progress, stage_progress = resolve_stage_progress(stage, ratio)
            profile = get_stage_profile(stage)
            await task.emit_runtime_snapshot(
                internal_status=TaskInternalStatus.RUNNING,
                progress=abs_progress,
                message=message,
                context={
                    "stage": stage.value,
                    "stageLabel": profile.display_label,
                    "stageProgress": stage_progress,
                },
                event="progress",
            )
        except Exception:
            logger.warning(
                "SSE emit failed  task_id=%s  stage=%s",
                task.context.task_id, stage.value,
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
