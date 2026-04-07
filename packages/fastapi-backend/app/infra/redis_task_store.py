"""任务状态与事件缓存运行态存储 mixin。

提供任务运行态快照的读写、SSE 事件追加与回放、消息-任务映射、
以及断线恢复状态装配能力。通过 mixin 方式混入 ``RuntimeStore``。
"""

from __future__ import annotations

from typing import Any

from app.core.logging import format_trace_timestamp
from app.core.sse import TaskProgressEvent, ensure_sse_event_identity, parse_sse_event_id
from app.shared.task_framework.key_builder import (
    TASK_EVENTS_TTL_SECONDS,
    TASK_MESSAGE_TTL_SECONDS,
    TASK_RUNTIME_TTL_SECONDS,
    build_task_events_key,
    build_task_message_key,
    build_task_runtime_key,
)
from app.shared.task_framework.runtime_store import TaskRuntimeRecoveryState
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, map_internal_status


class TaskStoreMixin:
    """任务运行态存储 mixin。

    需要宿主类提供 ``get_runtime_value`` 和 ``set_runtime_value`` 接口。
    """

    def set_task_state(
        self,
        *,
        task_id: str,
        internal_status: TaskInternalStatus,
        message: str,
        progress: int,
        task_type: str | None = None,
        request_id: str | None = None,
        error_code: TaskErrorCode | None = None,
        source: str = "unknown",
        context: dict[str, object] | None = None,
        created_at: str | None = None,
    ) -> dict[str, object]:
        """写入/更新任务运行态快照。

        Args:
            task_id: 任务唯一标识。
            internal_status: 内部状态枚举。
            message: 人类可读的状态描述。
            progress: 进度百分比（0-100）。
            task_type: 任务类型标识。
            request_id: 关联请求追踪 ID。
            error_code: 错误码枚举（仅失败时）。
            source: 状态写入来源标识。
            context: 扩展上下文字典。
            created_at: 创建时间戳（省略时自动生成）。

        Returns:
            写入后的完整任务状态字典。
        """
        status = map_internal_status(internal_status)
        existing = self.get_task_state(task_id) or {}
        payload: dict[str, object] = {
            "taskId": task_id,
            "taskType": task_type,
            "internalStatus": internal_status.value,
            "status": status.value,
            "message": message,
            "progress": progress,
            "requestId": request_id,
            "errorCode": error_code.value if error_code is not None else None,
            "source": source,
            "context": dict(context or {}),
            "createdAt": created_at or existing.get("createdAt") or format_trace_timestamp(),
            "updatedAt": format_trace_timestamp()
        }
        self.set_runtime_value(  # type: ignore[attr-defined]
            build_task_runtime_key(task_id),
            payload,
            ttl_seconds=TASK_RUNTIME_TTL_SECONDS
        )
        return payload

    def get_task_state(self, task_id: str) -> dict[str, object] | None:
        """读取任务运行态快照。

        Args:
            task_id: 任务唯一标识。

        Returns:
            任务状态字典，不存在时返回 ``None``。
        """
        record = self.get_runtime_value(build_task_runtime_key(task_id))  # type: ignore[attr-defined]
        if record is None:
            return None
        return dict(record)

    def set_message_mapping(self, message_id: str, task_id: str) -> None:
        """建立 Dramatiq 消息 ID 到任务 ID 的映射。

        Args:
            message_id: Dramatiq 消息 ID。
            task_id: 任务唯一标识。
        """
        self.set_runtime_value(  # type: ignore[attr-defined]
            build_task_message_key(message_id),
            task_id,
            ttl_seconds=TASK_MESSAGE_TTL_SECONDS
        )

    def get_task_id_by_message(self, message_id: str) -> str | None:
        """根据 Dramatiq 消息 ID 查询关联的任务 ID。

        Args:
            message_id: Dramatiq 消息 ID。

        Returns:
            关联的任务 ID，未找到时返回 ``None``。
        """
        value = self.get_runtime_value(build_task_message_key(message_id))  # type: ignore[attr-defined]
        return str(value) if value is not None else None

    def append_task_event(
        self,
        task_id: str,
        event: TaskProgressEvent | dict[str, Any]
    ) -> TaskProgressEvent:
        """追加一条 SSE 进度事件到任务事件列表。

        自动为事件分配递增的 sequence 编号并持久化。

        Args:
            task_id: 任务唯一标识。
            event: 待追加的事件（Pydantic model 或原始 dict）。

        Returns:
            归一化后的事件对象（含分配的 id 和 sequence）。
        """
        candidate = event if isinstance(event, TaskProgressEvent) else TaskProgressEvent.model_validate(event)
        events = self.get_task_events(task_id)
        next_sequence = (events[-1].sequence or 0) + 1 if events else 1
        normalized = ensure_sse_event_identity(candidate, fallback_sequence=next_sequence)
        payload = [
            item.model_dump(mode="json", by_alias=True)
            for item in (*events, normalized)
        ]
        self.set_runtime_value(  # type: ignore[attr-defined]
            build_task_events_key(task_id),
            payload,
            ttl_seconds=TASK_EVENTS_TTL_SECONDS
        )
        return normalized

    def get_task_events(
        self,
        task_id: str,
        *,
        after_event_id: str | None = None
    ) -> list[TaskProgressEvent]:
        """读取任务的全部或增量 SSE 事件列表。

        Args:
            task_id: 任务唯一标识。
            after_event_id: 仅返回该事件之后的事件（用于断线恢复）。

        Returns:
            按 sequence 排序的事件列表。
        """
        payload = self.get_runtime_value(build_task_events_key(task_id))  # type: ignore[attr-defined]
        if payload is None:
            return []

        events = [TaskProgressEvent.model_validate(item) for item in payload]
        if after_event_id is None:
            return events

        after_sequence = self._resolve_after_sequence(task_id, after_event_id, events)
        return [
            event
            for event in events
            if (event.sequence or 0) > after_sequence
        ]

    def load_task_recovery_state(
        self,
        task_id: str,
        *,
        after_event_id: str | None = None
    ) -> TaskRuntimeRecoveryState:
        """装配任务断线恢复状态（快照 + 增量事件）。

        Args:
            task_id: 任务唯一标识。
            after_event_id: 仅包含该事件之后的事件。

        Returns:
            ``TaskRuntimeRecoveryState`` 实例。
        """
        return TaskRuntimeRecoveryState(
            task_id=task_id,
            snapshot=self.get_task_state(task_id),
            events=tuple(self.get_task_events(task_id, after_event_id=after_event_id))
        )

    @staticmethod
    def _resolve_after_sequence(
        task_id: str,
        after_event_id: str,
        events: list[TaskProgressEvent]
    ) -> int:
        """解析 ``after_event_id`` 对应的 sequence 编号。"""
        parsed_identity = parse_sse_event_id(after_event_id)
        if parsed_identity is not None:
            parsed_task_id, parsed_sequence = parsed_identity
            if parsed_task_id == task_id:
                return parsed_sequence

        for event in events:
            if event.id == after_event_id:
                return event.sequence or 0

        return 0
