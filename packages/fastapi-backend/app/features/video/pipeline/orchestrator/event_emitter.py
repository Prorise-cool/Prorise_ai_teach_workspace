"""SSE 事件推送混入。"""

from __future__ import annotations

from typing import Any, Sequence

from app.core.logging import get_logger
from app.features.video.pipeline.models import (
    VideoStage,
    build_stage_snapshot,
)
from app.shared.task_framework.base import BaseTask
from app.shared.task_framework.status import TaskInternalStatus

logger = get_logger("app.features.video.pipeline")


class EventEmitterMixin:
    """推送阶段进度与修复事件。"""

    _max_emitted_progress: int

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
        snapshot = build_stage_snapshot(stage, ratio)
        if snapshot.progress < self._max_emitted_progress:
            snapshot = snapshot.model_copy(update={"progress": self._max_emitted_progress})
            logger.debug(
                "Clamp regressive stage event task_id=%s stage=%s progress=%s max_progress=%s",
                task.context.task_id,
                stage.value,
                snapshot.progress,
                self._max_emitted_progress,
            )
        context = snapshot.model_dump(mode="json", by_alias=True)
        context.update(extra or {})
        await task.emit_runtime_snapshot(
            internal_status=TaskInternalStatus.RUNNING,
            progress=snapshot.progress,
            message=message,
            context=context,
            event="progress",
        )
        self._max_emitted_progress = snapshot.progress

    async def _emit_fix_event(
        self,
        task: BaseTask,
        *,
        attempt_no: int,
        fix_event: str,
        message: str,
    ) -> None:
        """推送修复事件。"""
        from app.core.config import Settings
        settings: Settings = self.settings  # type: ignore[attr-defined]
        ratio = min(attempt_no / max(settings.video_fix_max_attempts, 1), 1.0)
        await self._emit_stage(
            task,
            VideoStage.MANIM_FIX,
            ratio,
            message,
            extra={"attemptNo": attempt_no, "fixEvent": fix_event},
        )

    def _build_switch_emitter(self, task: BaseTask, stage: VideoStage, ratio: float):
        """构建 provider 切换事件发射器。"""
        from app.features.video.pipeline.runtime import build_stage_context
        stage_context = build_stage_context(stage, ratio)
        return task.create_provider_switch_emitter(
            progress=build_stage_snapshot(stage, ratio).progress,
            stage=stage.value,
            extra_context=stage_context,
        )

    @staticmethod
    def _collect_unique_providers(providers: Sequence[Any]) -> tuple[str, ...]:
        """收集去重后的 provider ID 列表。"""
        from app.features.video.pipeline._helpers import unique_preserve_order
        return tuple(unique_preserve_order(provider.provider_id for provider in providers))
