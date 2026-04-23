"""内存 SSE 事件 broker，负责任务进度事件的发布与断线重放。

Wave 2 Task 1：内部迁移到 :class:`EventBuffer` 通用抽象，外部 API
保持不变（publish / replay 签名与返回值保持原样），避免 video / tasks
/ dispatcher / publisher 调用方感知到变化。
"""

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.core.sse import TaskProgressEvent, ensure_sse_event_identity, parse_sse_event_id
from app.infra.event_bus import EventBuffer


class InMemorySseBroker:
    """内存 SSE 事件 broker，管理事件序列号并支持断线重放。"""

    def __init__(self) -> None:
        """初始化事件缓冲、序列号计数器和日志记录器。"""
        self._buffer: EventBuffer[TaskProgressEvent] = EventBuffer()
        self._sequences: dict[str, int] = {}
        self._logger = get_logger("app.infra.sse_broker")

    def publish(self, event: TaskProgressEvent) -> TaskProgressEvent:
        """发布一条 SSE 事件，自动分配序列号和事件 ID。"""
        tokens = bind_trace_context(
            task_id=event.task_id,
            error_code=event.error_code or EMPTY_TRACE_VALUE
        )
        try:
            normalized = ensure_sse_event_identity(
                event,
                fallback_sequence=self._next_sequence(event)
            )
            if normalized.sequence is not None:
                self._sequences[event.task_id] = normalized.sequence
            self._buffer.append(event.task_id, normalized)
            self._logger.info(
                "SSE event published id=%s type=%s status=%s progress=%s sequence=%s",
                normalized.id,
                normalized.event,
                normalized.status,
                normalized.progress,
                normalized.sequence
            )

            return normalized
        finally:
            reset_trace_context(tokens)

    def replay(
        self,
        task_id: str,
        *,
        after_event_id: str | None = None
    ) -> list[TaskProgressEvent]:
        """重放指定任务的事件列表，支持 after_event_id 断线续传。"""
        tokens = bind_trace_context(task_id=task_id)
        try:
            if after_event_id is None:
                events = self._buffer.snapshot(task_id)
                self._logger.info("SSE events replayed count=%s", len(events))
                return events

            replayed = self._buffer.replay_after(
                task_id,
                after_event_id=after_event_id,
                event_id_of=lambda ev: ev.id or "",
                resolve_sequence=lambda evt_id: self._resolve_after_sequence(
                    task_id, evt_id
                ),
            )
            self._logger.info(
                "SSE events replayed count=%s after_event_id=%s",
                len(replayed),
                after_event_id
            )
            return replayed
        finally:
            reset_trace_context(tokens)

    def _next_sequence(self, event: TaskProgressEvent) -> int:
        if event.sequence is not None:
            return event.sequence

        return self._sequences.get(event.task_id, 0) + 1

    def _resolve_after_sequence(self, task_id: str, after_event_id: str) -> int | None:
        parsed_identity = parse_sse_event_id(after_event_id)
        if parsed_identity is not None:
            parsed_task_id, parsed_sequence = parsed_identity
            if parsed_task_id == task_id:
                return parsed_sequence

        self._logger.warning("Unknown SSE after_event_id=%s; replaying full stream", after_event_id)
        return None
