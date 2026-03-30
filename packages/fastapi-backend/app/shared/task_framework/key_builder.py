from __future__ import annotations

TASK_RUNTIME_TTL_SECONDS = 2 * 60 * 60
TASK_EVENTS_TTL_SECONDS = 60 * 60
TASK_MESSAGE_TTL_SECONDS = TASK_RUNTIME_TTL_SECONDS
PROVIDER_HEALTH_TTL_SECONDS = 60


def _normalize_segment(value: str, *, field_name: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_name} 不能为空")
    return normalized


def build_task_runtime_key(task_id: str) -> str:
    return f"xm_task:{_normalize_segment(task_id, field_name='task_id')}"


def build_task_events_key(task_id: str) -> str:
    return f"xm_task_events:{_normalize_segment(task_id, field_name='task_id')}"


def build_task_message_key(message_id: str) -> str:
    return f"xm_task_message:{_normalize_segment(message_id, field_name='message_id')}"


def build_provider_health_key(provider: str) -> str:
    normalized = _normalize_segment(provider, field_name="provider").lower()
    return f"xm_provider_health:{normalized}"
