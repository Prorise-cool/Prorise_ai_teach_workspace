"""内存 SSE 事件 broker，负责任务进度事件的发布与断线重放。"""

from collections import defaultdict

from app.core.logging import EMPTY_TRACE_VALUE, bind_trace_context, get_logger, reset_trace_context
from app.core.sse import TaskProgressEvent, ensure_sse_event_identity, parse_sse_event_id


class InMemorySseBroker:
    """内存 SSE 事件 broker，管理事件序列号并支持断线重放。"""

    def __init__(self) -> None:
        """初始化事件存储、序列号计数器和日志记录器。"""
        self._events: dict[str, list[TaskProgressEvent]] = defaultdict(list)
        self._sequences: dict[str, int] = defaultdict(int)
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
            self._sequences[event.task_id] = normalized.sequence or self._sequences[event.task_id]
            self._events[event.task_id].append(normalized)
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
            events = list(self._events.get(task_id, []))
            if after_event_id is None:
                self._logger.info("SSE events replayed count=%s", len(events))
                return events

            after_sequence = self._resolve_after_sequence(task_id, after_event_id)
            replayed = [
                event
                for event in events
                if (event.sequence or 0) > after_sequence
            ]
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

        return self._sequences[event.task_id] + 1

    def _resolve_after_sequence(self, task_id: str, after_event_id: str) -> int:
        parsed_identity = parse_sse_event_id(after_event_id)
        if parsed_identity is not None:
            parsed_task_id, parsed_sequence = parsed_identity
            if parsed_task_id == task_id:
                return parsed_sequence

        for event in self._events.get(task_id, []):
            if event.id == after_event_id:
                return event.sequence or 0

        self._logger.warning("Unknown SSE after_event_id=%s; replaying full stream", after_event_id)
        return 0
