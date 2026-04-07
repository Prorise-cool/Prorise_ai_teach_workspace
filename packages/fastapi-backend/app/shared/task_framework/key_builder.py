"""运行态 Redis key 构造器，定义任务、事件、消息映射和 Provider 健康的 key 规则与 TTL。"""

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
    """构造任务运行态快照的 Redis key。"""
    return f"xm_task:{_normalize_segment(task_id, field_name='task_id')}"


def build_task_events_key(task_id: str) -> str:
    """构造任务事件列表的 Redis key。"""
    return f"xm_task_events:{_normalize_segment(task_id, field_name='task_id')}"


def build_task_message_key(message_id: str) -> str:
    """构造消息 ID 到任务 ID 映射的 Redis key。"""
    return f"xm_task_message:{_normalize_segment(message_id, field_name='message_id')}"


def build_provider_health_key(provider: str) -> str:
    """构造 Provider 健康状态的 Redis key。"""
    normalized = _normalize_segment(provider, field_name="provider").lower()
    return f"xm_provider_health:{normalized}"
