from __future__ import annotations

"""Redis 运行态访问层，负责任务状态、事件缓存与短期在线态读写。"""

import json
import math
import time
from copy import deepcopy
from dataclasses import dataclass, field
from enum import StrEnum
from threading import Lock
from typing import Any

from dramatiq.brokers.redis import RedisBroker
from dramatiq.brokers.stub import StubBroker
from redis import Redis

from app.core.config import Settings, get_settings
from app.core.logging import format_trace_timestamp
from app.core.sse import TaskProgressEvent, ensure_sse_event_identity, parse_sse_event_id
from app.shared.task_framework.key_builder import (
    PROVIDER_HEALTH_TTL_SECONDS,
    TASK_EVENTS_TTL_SECONDS,
    TASK_MESSAGE_TTL_SECONDS,
    TASK_RUNTIME_TTL_SECONDS,
    build_provider_health_key,
    build_task_events_key,
    build_task_message_key,
    build_task_runtime_key,
)
from app.shared.task_framework.runtime_store import TaskRuntimeRecoveryState
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, map_internal_status

ONLINE_TOKEN_KEY_PREFIX = "online_tokens:"


def build_online_token_key(token_value: str, tenant_id: str | None = None) -> str:
    """构造在线 token 运行态 key。"""
    if tenant_id:
        return f"{tenant_id}:{ONLINE_TOKEN_KEY_PREFIX}{token_value}"
    return f"{ONLINE_TOKEN_KEY_PREFIX}{token_value}"


def build_online_token_key_candidates(
    token_value: str,
    tenant_id: str | None = None
) -> tuple[str, ...]:
    candidates: list[str] = []
    for key in (
        build_online_token_key(token_value, tenant_id=tenant_id),
        build_online_token_key(token_value),
    ):
        if key not in candidates:
            candidates.append(key)
    return tuple(candidates)


def normalize_online_token_payload(payload: object) -> dict[str, object] | None:
    if isinstance(payload, dict):
        return dict(payload)

    if (
        isinstance(payload, list)
        and len(payload) == 2
        and isinstance(payload[1], dict)
    ):
        return dict(payload[1])

    return None


class RuntimeStorageScope(StrEnum):
    RUNTIME = "runtime"
    LONG_TERM = "long_term"


@dataclass(slots=True)
class RuntimeStore:
    """统一运行态存储抽象，禁止承担长期业务持久化。"""

    backend: str
    redis_url: str
    client: Redis | None = None
    storage: dict[str, object] = field(default_factory=dict)
    expirations: dict[str, float] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    def get_runtime_value(self, key: str) -> object | None:
        if self.client is not None:
            raw_value = self.client.get(key)
            return json.loads(raw_value) if raw_value is not None else None

        with self._lock:
            self._purge_expired_locked(key)
            value = self.storage.get(key)
            return deepcopy(value) if value is not None else None

    def set_runtime_value(
        self,
        key: str,
        value: object,
        *,
        ttl_seconds: int,
        scope: RuntimeStorageScope = RuntimeStorageScope.RUNTIME
    ) -> None:
        if RuntimeStorageScope(scope) is not RuntimeStorageScope.RUNTIME:
            raise ValueError("RuntimeStore 不能承担长期业务数据持久化")
        if ttl_seconds <= 0:
            raise ValueError("RuntimeStore 写入必须显式设置正数 TTL")
        if not key.startswith("xm_"):
            raise ValueError("RuntimeStore key 必须使用 xm_ 运行态命名空间")

        if self.client is not None:
            self.client.set(key, json.dumps(value), ex=ttl_seconds)
            return

        with self._lock:
            self.storage[key] = json.loads(json.dumps(value))
            self.expirations[key] = self._now() + ttl_seconds

    def ttl(self, key: str) -> int:
        if self.client is not None:
            return int(self.client.ttl(key))

        with self._lock:
            self._purge_expired_locked(key)
            if key not in self.storage:
                return -2
            expires_at = self.expirations.get(key)
            if expires_at is None:
                return -1
            return max(0, math.ceil(expires_at - self._now()))

    def clear(self) -> None:
        if self.client is not None:
            self.client.flushdb()
            return

        with self._lock:
            self.storage.clear()
            self.expirations.clear()

    def get_online_token_record(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> dict[str, object] | None:
        for key in build_online_token_key_candidates(token_value, tenant_id=tenant_id):
            payload = self.get_runtime_value(key)
            normalized = normalize_online_token_payload(payload)
            if normalized is not None:
                return normalized
        return None

    def set_online_token_record(
        self,
        token_value: str,
        payload: dict[str, object],
        *,
        tenant_id: str | None = None,
        ttl_seconds: int
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("在线态写入必须显式设置正数 TTL")

        key = build_online_token_key(token_value, tenant_id=tenant_id)

        if self.client is not None:
            self.client.set(key, json.dumps(payload), ex=ttl_seconds)
            return

        with self._lock:
            self.storage[key] = json.loads(json.dumps(payload))
            self.expirations[key] = self._now() + ttl_seconds

    def delete_online_token_record(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> None:
        keys = build_online_token_key_candidates(token_value, tenant_id=tenant_id)

        if self.client is not None:
            self.client.delete(*keys)
            return

        with self._lock:
            for key in keys:
                self.storage.pop(key, None)
                self.expirations.pop(key, None)

    def get_online_token_ttl(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> int:
        for key in build_online_token_key_candidates(token_value, tenant_id=tenant_id):
            ttl = self.ttl(key)
            if ttl >= -1:
                return ttl
        return -2

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
        context: dict[str, object] | None = None
    ) -> dict[str, object]:
        status = map_internal_status(internal_status)
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
            "updatedAt": format_trace_timestamp()
        }
        self.set_runtime_value(
            build_task_runtime_key(task_id),
            payload,
            ttl_seconds=TASK_RUNTIME_TTL_SECONDS
        )
        return payload

    def get_task_state(self, task_id: str) -> dict[str, object] | None:
        record = self.get_runtime_value(build_task_runtime_key(task_id))
        if record is None:
            return None
        return dict(record)

    def set_message_mapping(self, message_id: str, task_id: str) -> None:
        self.set_runtime_value(
            build_task_message_key(message_id),
            task_id,
            ttl_seconds=TASK_MESSAGE_TTL_SECONDS
        )

    def get_task_id_by_message(self, message_id: str) -> str | None:
        value = self.get_runtime_value(build_task_message_key(message_id))
        return str(value) if value is not None else None

    def append_task_event(
        self,
        task_id: str,
        event: TaskProgressEvent | dict[str, Any]
    ) -> TaskProgressEvent:
        candidate = event if isinstance(event, TaskProgressEvent) else TaskProgressEvent.model_validate(event)
        events = self.get_task_events(task_id)
        next_sequence = (events[-1].sequence or 0) + 1 if events else 1
        normalized = ensure_sse_event_identity(candidate, fallback_sequence=next_sequence)
        payload = [
            item.model_dump(mode="json", by_alias=True)
            for item in (*events, normalized)
        ]
        self.set_runtime_value(
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
        payload = self.get_runtime_value(build_task_events_key(task_id))
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
        return TaskRuntimeRecoveryState(
            task_id=task_id,
            snapshot=self.get_task_state(task_id),
            events=tuple(self.get_task_events(task_id, after_event_id=after_event_id))
        )

    def set_provider_health(
        self,
        provider: str,
        *,
        is_healthy: bool,
        reason: str | None = None,
        checked_at: str | None = None,
        metadata: dict[str, object] | None = None
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "provider": provider,
            "isHealthy": is_healthy,
            "reason": reason,
            "checkedAt": checked_at or format_trace_timestamp(),
            "metadata": metadata or {}
        }
        self.set_runtime_value(
            build_provider_health_key(provider),
            payload,
            ttl_seconds=PROVIDER_HEALTH_TTL_SECONDS
        )
        return payload

    def get_provider_health(self, provider: str) -> dict[str, object] | None:
        payload = self.get_runtime_value(build_provider_health_key(provider))
        if payload is None:
            return None
        return dict(payload)

    @staticmethod
    def _resolve_after_sequence(
        task_id: str,
        after_event_id: str,
        events: list[TaskProgressEvent]
    ) -> int:
        parsed_identity = parse_sse_event_id(after_event_id)
        if parsed_identity is not None:
            parsed_task_id, parsed_sequence = parsed_identity
            if parsed_task_id == task_id:
                return parsed_sequence

        for event in events:
            if event.id == after_event_id:
                return event.sequence or 0

        return 0

    def _purge_expired_locked(self, key: str) -> None:
        expires_at = self.expirations.get(key)
        if expires_at is None:
            return
        if expires_at <= self._now():
            self.storage.pop(key, None)
            self.expirations.pop(key, None)

    @staticmethod
    def _now() -> float:
        return time.time()


@dataclass(slots=True, frozen=True)
class DramatiqBrokerConfig:
    backend: str
    redis_url: str
    queue_name: str


def create_runtime_store(settings: Settings | None = None) -> RuntimeStore:
    active_settings = settings or get_settings()
    if active_settings.dramatiq_broker_backend == "stub":
        return RuntimeStore(backend="memory-runtime-store", redis_url=active_settings.redis_url)

    return RuntimeStore(
        backend="redis-runtime-store",
        redis_url=active_settings.redis_url,
        client=Redis.from_url(active_settings.redis_url, decode_responses=True),
    )


def create_dramatiq_broker_config(settings: Settings | None = None) -> DramatiqBrokerConfig:
    active_settings = settings or get_settings()
    return DramatiqBrokerConfig(
        backend=active_settings.dramatiq_broker_backend,
        redis_url=active_settings.redis_url,
        queue_name=active_settings.dramatiq_queue_name,
    )


def create_dramatiq_broker(settings: Settings | None = None) -> RedisBroker | StubBroker:
    broker_config = create_dramatiq_broker_config(settings)
    if broker_config.backend == "stub":
        broker = StubBroker()
        broker.emit_after("process_boot")
        return broker
    return RedisBroker(url=broker_config.redis_url)
