"""核心编排：构造函数与 run() 入口。"""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.features.video.pipeline._helpers import cleanup_pipeline_temp_dirs
from app.features.video.pipeline.artifact_writeback import ArtifactWritebackService
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.compose import ComposeService
from app.features.video.pipeline.errors import VideoPipelineError
from app.features.video.pipeline.manim import LLMBasedFixer, ManimGenerationService, RuleBasedFixer
from app.features.video.pipeline.models import (
    ComposeResult,
    ManimCodeResult,
    TTSResult,
    VideoStage,
    build_stage_snapshot,
)
from app.features.video.pipeline.runtime import (
    VideoRuntimeStateStore,
    build_stage_context,
)
from app.features.video.pipeline.sandbox import (
    DockerSandboxExecutor,
    SandboxExecutor,
    resolve_local_fallback_policy,
)
from app.features.video.pipeline.storyboard import StoryboardService
from app.features.video.pipeline.tts import TTSService
from app.features.video.pipeline.understanding import UnderstandingService
from app.features.video.pipeline.upload import UploadService
from app.features.video.pipeline.protocols import VideoMetadataPersister
from app.features.video.runtime_auth import delete_video_runtime_auth, load_video_runtime_auth
from app.providers.factory import ProviderFactory, get_provider_factory
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.status import TaskInternalStatus

from .event_emitter import EventEmitterMixin
from .failure_handler import FailureHandlerMixin
from .render_fix_chain import RenderFixChainMixin
from .result_persister import ResultPersisterMixin
from .stage_runners import StageRunnersMixin

logger = get_logger("app.features.video.pipeline")


class VideoPipelineService(
    StageRunnersMixin,
    RenderFixChainMixin,
    ResultPersisterMixin,
    FailureHandlerMixin,
    EventEmitterMixin,
):
    """视频流水线编排器，协调各子服务完成端到端视频生成。"""

    def __init__(
        self,
        *,
        runtime_store,
        metadata_service: VideoMetadataPersister,
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
        self.sandbox_executor = sandbox_executor or DockerSandboxExecutor(
            allow_local_fallback=resolve_local_fallback_policy(
                environment=settings.environment,
                configured=settings.video_sandbox_allow_local_fallback,
            ),
            render_quality=settings.video_render_quality,
        )
        self.provider_runtime_resolver = provider_runtime_resolver or ProviderRuntimeResolver(
            settings=settings,
            provider_factory=provider_factory,
        )
        self.failover_service = provider_factory.create_failover_service(runtime_store)
        self._max_emitted_progress = 0

    async def run(self, task: BaseTask) -> TaskResult:
        """执行完整的视频生成流水线。"""
        self._max_emitted_progress = 0
        runtime = VideoRuntimeStateStore(self.runtime_store, task.context.task_id)
        request_auth = self._load_worker_request_auth(task_id=task.context.task_id)
        render_result = None
        tts_result: TTSResult | None = None
        compose_result: ComposeResult | None = None
        try:
            provider_runtime = await self.provider_runtime_resolver.resolve_video_pipeline(
                access_token=request_auth.access_token if request_auth is not None else None,
                client_id=request_auth.client_id if request_auth is not None else None,
            )
            understanding_service = UnderstandingService(
                provider_runtime.llm_for(VideoStage.UNDERSTANDING.value),
                self.failover_service,
                runtime,
                settings=self.settings,
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
                self.settings,
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

            # Docker 镜像预热与 understanding 并行
            warmup_task = asyncio.create_task(self._warm_up_sandbox())

            understanding, merged_storyboard = await self._run_understanding(
                task,
                understanding_service,
                source_payload=source_payload,
                user_profile=user_profile,
            )
            if merged_storyboard is not None:
                storyboard = merged_storyboard
                await self._emit_stage(task, VideoStage.STORYBOARD, 1.0, "分镜生成完成（合并模式）", extra={"sceneCount": len(storyboard.scenes)})
            else:
                storyboard = await self._run_storyboard(task, storyboard_service, understanding=understanding)

            # Manim代码生成 和 TTS 并行 — 两者都只依赖 storyboard
            await warmup_task  # 确保 Docker 镜像预热完成
            manim_task = asyncio.create_task(
                self._run_manim_generation(task, manim_service, storyboard=storyboard)
            )
            tts_task = asyncio.create_task(
                self._run_tts(task, tts_service, storyboard=storyboard)
            )
            manim_code, tts_result = await asyncio.gather(manim_task, tts_task)

            render_result, manim_code = await self._run_render_with_fix_chain(
                task,
                runtime,
                storyboard=storyboard,
                manim_code=manim_code,
                rule_fixer=rule_fixer,
                llm_fixer=llm_fixer,
            )
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
                request_auth=request_auth,
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
            return await self._handle_pipeline_failure(
                task.context,
                runtime,
                exc,
                request_auth=request_auth,
            )
        finally:
            cleanup_pipeline_temp_dirs(
                render_result.output_path if render_result is not None else None,
                *(segment.audio_path for segment in tts_result.audio_segments) if tts_result is not None else (),
                compose_result.video_path if compose_result is not None else None,
                compose_result.cover_path if compose_result is not None else None,
            )
            delete_video_runtime_auth(self.runtime_store, task_id=task.context.task_id)

    def _load_worker_request_auth(self, *, task_id: str) -> RuoYiRequestAuth | None:
        """从任务运行态读取当前任务的显式请求鉴权。"""
        request_auth = load_video_runtime_auth(self.runtime_store, task_id=task_id)
        if request_auth is None:
            logger.warning(
                "Video pipeline request auth missing task_id=%s; fallback to local provider settings and best-effort writeback",
                task_id,
            )
        return request_auth

    async def _warm_up_sandbox(self) -> None:
        """预热 Docker 沙箱镜像（如果执行器支持）。"""
        if hasattr(self.sandbox_executor, "warm_up"):
            await self.sandbox_executor.warm_up()


def get_video_pipeline_service(runtime_store, metadata_service: VideoMetadataPersister) -> VideoPipelineService:
    """工厂函数：创建 VideoPipelineService 实例。"""
    settings = get_settings()
    return VideoPipelineService(
        runtime_store=runtime_store,
        metadata_service=metadata_service,
        provider_factory=get_provider_factory(),
        settings=settings,
        asset_store=LocalAssetStore.from_settings(settings),
    )
