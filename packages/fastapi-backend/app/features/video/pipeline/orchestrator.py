"""视频流水线编排器。

``VideoPipelineService`` 是整个视频生成流水线的顶层入口，
负责协调理解、分镜、Manim、渲染、TTS、合成、上传各阶段的执行顺序、
SSE 事件推送、错误处理和结果持久化。
"""

from __future__ import annotations

import asyncio
from typing import Any, Mapping, Sequence

from app.core.config import Settings, get_settings
from app.core.logging import format_trace_timestamp, get_logger
from app.features.video.pipeline._helpers import (
    build_title,
    cleanup_pipeline_temp_dirs,
    result_storage_key,
    unique_preserve_order,
    utc_now,
)
from app.features.video.pipeline.artifact_writeback import ArtifactWritebackService
from app.features.video.pipeline.assets import LocalAssetStore
from app.features.video.pipeline.compose import ComposeService
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.auto_fix import ast_fix_code, stat_check_fix
from app.features.video.pipeline.manim import LLMBasedFixer, ManimGenerationService, RuleBasedFixer
from app.features.video.pipeline.models import (
    ComposeResult,
    ExecutionResult,
    FixLogEntry,
    ManimCodeResult,
    PublishState,
    ResourceLimits,
    Storyboard,
    TTSResult,
    UnderstandingResult,
    UploadResult,
    VideoResult,
    VideoResultDetail,
    VideoStage,
    build_stage_snapshot,
)
from app.features.video.pipeline.runtime import (
    VideoRuntimeStateStore,
    build_failure,
    build_stage_context,
)
from app.features.video.pipeline.manim_runtime_prelude import ensure_manim_runtime_prelude
from app.features.video.runtime_auth import delete_video_runtime_auth, load_video_runtime_auth
from app.features.video.pipeline.sandbox import (
    DockerSandboxExecutor,
    SandboxExecutor,
    ScriptSecurityViolation,
    resolve_local_fallback_policy,
)
from app.features.video.pipeline.storyboard import StoryboardService
from app.features.video.pipeline.tts import TTSService
from app.features.video.pipeline.understanding import UnderstandingService
from app.features.video.pipeline.upload import UploadService
from app.features.video.pipeline.protocols import VideoMetadataPersister
from app.providers.factory import ProviderFactory, get_provider_factory
from app.providers.runtime_config_service import ProviderRuntimeResolver
from app.shared.ruoyi_auth import RuoYiRequestAuth
from app.shared.task_framework.base import BaseTask, TaskResult
from app.shared.task_framework.context import TaskContext
from app.shared.task_framework.status import (
    TaskErrorCode,
    TaskInternalStatus,
    TaskStatus,
    coerce_task_error_code,
)

logger = get_logger("app.features.video.pipeline")


class VideoPipelineService:
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

    async def run(self, task: BaseTask) -> TaskResult:
        """执行完整的视频生成流水线。"""
        runtime = VideoRuntimeStateStore(self.runtime_store, task.context.task_id)
        request_auth = self._load_worker_request_auth(task_id=task.context.task_id)
        render_result: ExecutionResult | None = None
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

            understanding = await self._run_understanding(
                task,
                understanding_service,
                source_payload=source_payload,
                user_profile=user_profile,
            )
            storyboard = await self._run_storyboard(task, storyboard_service, understanding=understanding)

            # Manim代码生成 和 TTS 并行 — 两者都只依赖 storyboard
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

    # ------------------------------------------------------------------
    # 阶段执行方法
    # ------------------------------------------------------------------

    async def _run_understanding(
        self,
        task: BaseTask,
        service: UnderstandingService,
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
    ) -> UnderstandingResult:
        """执行题目理解阶段。"""
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
        """执行分镜生成阶段。"""
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
        """执行 Manim 脚本生成阶段。"""
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
        """执行渲染 + 四层自动修复循环。

        四层修复管道：
        1. AST 参数注入（自动补全中文渲染参数）
        2. 静态分析检查（参数拼写错误、方法存在性）
        3. 规则修复 + LLM 智能修复
        4. 重新渲染验证
        """
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
                    fallback=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
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
                message=f"开始第 {attempt_no} 次自动修复（四层管道）",
            )

            error_log = render_result.stderr or render_result.error_type or "render_error"
            fixed_script = current_code.script_content

            # Layer 1: AST 参数注入。
            fixed_script = ast_fix_code(fixed_script)
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type="ast_fix",
                    success=True,
                    message="Layer 1: AST 参数注入完成",
                ).model_dump(mode="json", by_alias=True)
            )

            # Layer 2: 静态分析检查。
            fixed_script = stat_check_fix(fixed_script)
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type="stat_check",
                    success=True,
                    message="Layer 2: 静态分析检查完成",
                ).model_dump(mode="json", by_alias=True)
            )

            # Layer 3a: 规则修复。
            rule_fix = rule_fixer.fix(
                script_content=fixed_script,
                error_log=error_log,
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
                fixed_script = rule_fix.fixed_script

            # Layer 3b: LLM 智能修复。
            llm_fix = await llm_fixer.fix(
                storyboard=storyboard,
                script_content=fixed_script,
                error_log=error_log,
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
                fixed_script = llm_fix.fixed_script

            # Layer 4: 更新代码并重新渲染（循环回到 while 顶部）。
            fixed_script = ensure_manim_runtime_prelude(fixed_script)
            current_code = current_code.model_copy(update={"script_content": fixed_script})
            runtime.save_model("manim_code", current_code)
            await self._emit_fix_event(
                task,
                attempt_no=attempt_no,
                fix_event="fix_attempt_success",
                message="四层修复完成，重新进入渲染",
            )

    async def _run_tts(
        self,
        task: BaseTask,
        service: TTSService,
        *,
        storyboard: Storyboard,
    ) -> TTSResult:
        """执行 TTS 合成阶段。"""
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
        """执行视频合成阶段。"""
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
        """执行上传阶段。"""
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

    # ------------------------------------------------------------------
    # 结果持久化
    # ------------------------------------------------------------------

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
        """写入完成态视频结果。"""
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
            title=build_title(understanding.topic_summary),
            provider_used=provider_payload,
        )
        runtime.save_model("result", video_result)
        detail = VideoResultDetail(
            task_id=context.task_id,
            status="completed",
            result=video_result,
            publish_state=PublishState(),
        )
        asset = self.asset_store.write_json(result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
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
        request_auth: RuoYiRequestAuth | None = None,
    ) -> None:
        """写入产物图谱并执行一次性元数据写回。"""
        try:
            detail_ref = runtime.load_value("result_detail_ref")
            if not isinstance(detail_ref, str):
                return
            detail = self.asset_store.read_result_detail(detail_ref)
            artifact_ref: str | None = None
            artifact_writeback_failed = False

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
                    await self.metadata_service.sync_artifact_graph(
                        graph,
                        artifact_ref=artifact_ref,
                        request_auth=request_auth,
                    )
                except Exception:  # noqa: BLE001
                    artifact_writeback_failed = True
                    logger.warning(
                        "Sync video artifact graph degraded task_id=%s",
                        context.task_id,
                        exc_info=True,
                    )
            except Exception:  # noqa: BLE001
                artifact_writeback_failed = True
                logger.warning(
                    "Write video artifact graph degraded task_id=%s",
                    context.task_id,
                    exc_info=True,
                )

            completed_at = utc_now()
            metadata_request = self.metadata_service.build_task_request(
                task_id=context.task_id,
                user_id=context.user_id or "anonymous",
                status=TaskStatus.COMPLETED,
                summary=video_result.summary,
                result_ref=video_result.video_url,
                detail_ref=detail_ref,
                source_artifact_ref=artifact_ref,
                replay_hint=video_result.result_id,
                completed_at=completed_at,
                updated_at=completed_at,
            )

            long_term_failed = False
            try:
                await self.metadata_service.persist_task(
                    metadata_request,
                    request_auth=request_auth,
                )
            except Exception:  # noqa: BLE001
                long_term_failed = True
                logger.warning("Persist completed video metadata degraded task_id=%s", context.task_id, exc_info=True)

            if artifact_writeback_failed or long_term_failed:
                updated_detail = detail.model_copy(
                    update={
                        "artifact_writeback_failed": detail.artifact_writeback_failed or artifact_writeback_failed,
                        "long_term_writeback_failed": detail.long_term_writeback_failed or long_term_failed,
                    }
                )
                self.asset_store.write_json(
                    result_storage_key(video_result.task_id),
                    updated_detail.model_dump(mode="json", by_alias=True),
                )
        except Exception:  # noqa: BLE001
            logger.warning("Video post-processing writeback degraded task_id=%s", context.task_id, exc_info=True)

    # ------------------------------------------------------------------
    # 错误处理
    # ------------------------------------------------------------------

    async def _handle_pipeline_failure(
        self,
        context: TaskContext,
        runtime: VideoRuntimeStateStore,
        exc: VideoPipelineError,
        *,
        request_auth: RuoYiRequestAuth | None = None,
    ) -> TaskResult:
        """处理流水线阶段性失败。"""
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
        asset = self.asset_store.write_json(result_storage_key(context.task_id), detail.model_dump(mode="json", by_alias=True))
        runtime.save_value("result_detail_ref", asset.public_url)

        metadata_request = self.metadata_service.build_task_request(
            task_id=context.task_id,
            user_id=context.user_id or "anonymous",
            status=TaskStatus.FAILED,
            summary=str(exc),
            detail_ref=asset.public_url,
            error_summary=str(exc),
            failed_at=utc_now(),
            updated_at=utc_now(),
        )
        try:
            await self.metadata_service.persist_task(
                metadata_request,
                request_auth=request_auth,
            )
        except Exception:  # noqa: BLE001
            logger.warning("Persist failed video metadata degraded task_id=%s", context.task_id, exc_info=True)

        return TaskResult.failed(
            message=str(exc),
            error_code=exc.error_code,
            progress=build_stage_snapshot(exc.stage, exc.progress_ratio).progress,
            context=stage_context,
        )

    # ------------------------------------------------------------------
    # 渲染与事件推送
    # ------------------------------------------------------------------

    async def _execute_render(
        self,
        task_id: str,
        script_content: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        """在沙箱中执行 Manim 渲染。"""
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
        """推送阶段进度 SSE 事件。"""
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
        """推送修复事件。"""
        ratio = min(attempt_no / max(self.settings.video_fix_max_attempts, 1), 1.0)
        await self._emit_stage(
            task,
            VideoStage.MANIM_FIX,
            ratio,
            message,
            extra={"attemptNo": attempt_no, "fixEvent": fix_event},
        )

    def _build_switch_emitter(self, task: BaseTask, stage: VideoStage, ratio: float):
        """构建 provider 切换事件发射器。"""
        stage_context = build_stage_context(stage, ratio)
        return task.create_provider_switch_emitter(
            progress=build_stage_snapshot(stage, ratio).progress,
            stage=stage.value,
            extra_context=stage_context,
        )

    @staticmethod
    def _collect_unique_providers(providers: Sequence[Any]) -> tuple[str, ...]:
        """收集去重后的 provider ID 列表。"""
        return tuple(unique_preserve_order(provider.provider_id for provider in providers))


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
