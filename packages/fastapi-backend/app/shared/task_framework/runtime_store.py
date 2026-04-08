"""任务运行态恢复状态与事件构建工具。"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.sse import TaskProgressEvent
from app.shared.task_framework.runtime import TaskRuntimeSnapshot


@dataclass(slots=True, frozen=True)
class TaskRuntimeRecoveryState:
    """任务运行态恢复状态，包含快照和事件列表，用于 SSE 断线重连。"""
    task_id: str
    snapshot: dict[str, object] | None
    events: tuple[TaskProgressEvent, ...]
    latest_event_id_snapshot: str | None = None

    @property
    def latest_event_id(self) -> str | None:
        """返回最新事件的 ID，无事件时返回 None。"""
        if self.latest_event_id_snapshot is not None:
            return self.latest_event_id_snapshot
        if not self.events:
            return None
        return self.events[-1].id


def build_task_event(
    *,
    event: str,
    snapshot: TaskRuntimeSnapshot,
    context: dict[str, object] | None = None
) -> TaskProgressEvent:
    """从运行态快照构建 TaskProgressEvent。"""
    event_context = dict(context or {})
    raw_stage = event_context.get("stage")
    raw_result = event_context.get("result")
    raw_current_stage = event_context.get("currentStage")
    raw_stage_label = event_context.get("stageLabel")
    raw_stage_progress = event_context.get("stageProgress")

    return TaskProgressEvent(
        event=event,
        task_id=snapshot.task_id,
        task_type=snapshot.task_type,
        status=snapshot.status,
        progress=snapshot.progress,
        message=snapshot.message,
        request_id=snapshot.request_id,
        error_code=snapshot.error_code,
        context=event_context,
        stage=raw_stage if isinstance(raw_stage, str) else None,
        current_stage=(
            raw_current_stage if isinstance(raw_current_stage, str)
            else (raw_stage if isinstance(raw_stage, str) else None)
        ),
        stage_label=raw_stage_label if isinstance(raw_stage_label, str) else None,
        stage_progress=raw_stage_progress if isinstance(raw_stage_progress, int) else None,
        result=raw_result if isinstance(raw_result, dict) else None
    )
