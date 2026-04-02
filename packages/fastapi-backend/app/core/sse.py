import re
from typing import Literal

from pydantic import Field, model_validator

from app.core.logging import format_trace_timestamp
from app.shared.task_framework.contracts import TaskContractPayload


TaskEventName = Literal[
    "connected",
    "progress",
    "provider_switch",
    "completed",
    "failed",
    "cancelled",
    "heartbeat",
    "snapshot"
]

SSE_EVENT_ID_SEPARATOR = ":evt:"
SSE_EVENT_ID_PATTERN = re.compile(r"^(?P<task_id>.+):evt:(?P<sequence>\d{6})$")


def build_sse_event_id(task_id: str, sequence: int) -> str:
    return f"{task_id}{SSE_EVENT_ID_SEPARATOR}{sequence:06d}"


def parse_sse_event_id(event_id: str) -> tuple[str, int] | None:
    matched = SSE_EVENT_ID_PATTERN.fullmatch(event_id)

    if matched is None:
        return None

    return matched.group("task_id"), int(matched.group("sequence"))


class TaskProgressEvent(TaskContractPayload):
    id: str | None = None
    sequence: int | None = Field(default=None, ge=1)
    event: TaskEventName
    context: dict[str, object] = Field(default_factory=dict)
    stage: str | None = None
    result: dict[str, object] | None = None
    from_: str | None = Field(default=None, alias="from")
    to: str | None = None
    reason: str | None = None
    resume_from: str | None = None
    timestamp: str = Field(default_factory=format_trace_timestamp)

    @model_validator(mode="after")
    def validate_contract(self) -> "TaskProgressEvent":
        if self.event == "failed" and self.error_code is None:
            raise ValueError("failed event requires error_code")

        if self.event == "provider_switch" and (
            self.from_ is None or self.to is None or self.reason is None
        ):
            raise ValueError("provider_switch event requires from/to/reason")

        if self.event == "snapshot" and self.resume_from is None:
            raise ValueError("snapshot event requires resume_from")

        return self

    def with_identity(self, *, event_id: str, sequence: int) -> "TaskProgressEvent":
        return self.model_copy(update={"id": event_id, "sequence": sequence})


def ensure_sse_event_identity(
    payload: TaskProgressEvent,
    *,
    fallback_sequence: int | None = None
) -> TaskProgressEvent:
    parsed_identity = parse_sse_event_id(payload.id) if payload.id else None
    sequence = payload.sequence or fallback_sequence

    if parsed_identity is not None:
        task_id, parsed_sequence = parsed_identity

        if task_id != payload.task_id:
            raise ValueError("SSE event id task_id does not match payload task_id")

        if sequence is not None and parsed_sequence != sequence:
            raise ValueError("SSE event id sequence does not match payload sequence")

        return payload.with_identity(event_id=payload.id, sequence=parsed_sequence)

    if sequence is None:
        raise ValueError("SSE event requires sequence to build event id")

    return payload.with_identity(
        event_id=build_sse_event_id(payload.task_id, sequence),
        sequence=sequence
    )


def encode_sse_event(payload: TaskProgressEvent, *, ensure_identity: bool = True) -> str:
    normalized = (
        ensure_sse_event_identity(payload, fallback_sequence=payload.sequence)
        if ensure_identity
        else payload
    )
    body = normalized.model_dump_json(by_alias=True, exclude_none=not ensure_identity)
    lines = [f"event: {normalized.event}", f"data: {body}"]

    if normalized.id is not None:
        lines.insert(0, f"id: {normalized.id}")

    return "\n".join(lines) + "\n\n"
