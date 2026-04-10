"""各阶段执行方法混入。"""

from __future__ import annotations

from typing import Mapping

from app.core.logging import get_logger
from app.features.video.pipeline.models import (
    ComposeResult,
    ManimCodeResult,
    TTSResult,
    UnderstandingResult,
    VideoStage,
)
from app.shared.task_framework.base import BaseTask

logger = get_logger("app.features.video.pipeline")


class StageRunnersMixin:
    """7 个 _run_* 阶段执行方法。"""

    async def _run_understanding(
        self,
        task: BaseTask,
        service,  # UnderstandingService
        *,
        source_payload: dict[str, object],
        user_profile: dict[str, object],
    ) -> tuple:
        """执行题目理解阶段，同时尝试合并生成分镜。"""
        await self._emit_stage(task, VideoStage.UNDERSTANDING, 0.0, "正在理解题目")
        result = await service.execute(
            source_payload=source_payload,
            user_profile=user_profile,
            emit_switch=self._build_switch_emitter(task, VideoStage.UNDERSTANDING, 0.5),
            include_storyboard=True,
        )
        if isinstance(result, tuple):
            understanding, storyboard = result
        else:
            understanding, storyboard = result, None
        await self._emit_stage(
            task,
            VideoStage.UNDERSTANDING,
            1.0,
            "题目理解完成",
            extra={"understanding": understanding.model_dump(mode="json", by_alias=True)},
        )
        return understanding, storyboard

    async def _run_storyboard(
        self,
        task: BaseTask,
        service,  # StoryboardService
        *,
        understanding: UnderstandingResult,
    ):
        """执行分镜生成阶段。"""
        from app.features.video.pipeline.models import Storyboard

        await self._emit_stage(task, VideoStage.STORYBOARD, 0.0, "正在生成分镜")
        storyboard: Storyboard = await service.execute(
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
        service,  # ManimGenerationService
        *,
        storyboard,  # Storyboard
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

    async def _run_tts(
        self,
        task: BaseTask,
        service,  # TTSService
        *,
        storyboard,  # Storyboard
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
        service,  # ComposeService
        *,
        storyboard,  # Storyboard
        render_result,  # ExecutionResult
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
        service,  # UploadService
        *,
        compose_result: ComposeResult,
    ):
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
