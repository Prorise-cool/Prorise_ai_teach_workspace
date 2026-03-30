from __future__ import annotations

import json
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

from dramatiq.brokers.redis import RedisBroker
from dramatiq.brokers.stub import StubBroker
from redis import Redis

from app.core.config import Settings, get_settings
from app.core.logging import format_trace_timestamp
from app.shared.task_framework.status import TaskErrorCode, TaskInternalStatus, map_internal_status


@dataclass(slots=True)
class RuntimeStore:
    backend: str
    redis_url: str
    client: Redis | None = None
    storage: dict[str, object] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    def get(self, key: str) -> object | None:
        if self.client is not None:
            raw_value = self.client.get(key)
            return json.loads(raw_value) if raw_value is not None else None

        with self._lock:
            return self.storage.get(key)

    def set(self, key: str, value: object) -> None:
        if self.client is not None:
            self.client.set(key, json.dumps(value))
            return

        with self._lock:
            self.storage[key] = value

    def clear(self) -> None:
        if self.client is not None:
            self.client.flushdb()
            return

        with self._lock:
            self.storage.clear()

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
        source: str = "unknown"
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
            "updatedAt": format_trace_timestamp()
        }
        self.set(self._task_state_key(task_id), payload)
        return payload

    def get_task_state(self, task_id: str) -> dict[str, object] | None:
        record = self.get(self._task_state_key(task_id))
        if record is None:
            return None
        return dict(record)

    def set_message_mapping(self, message_id: str, task_id: str) -> None:
        self.set(self._message_key(message_id), task_id)

    def get_task_id_by_message(self, message_id: str) -> str | None:
        value = self.get(self._message_key(message_id))
        return str(value) if value is not None else None

    @staticmethod
    def _task_state_key(task_id: str) -> str:
        return f"task_state:{task_id}"

    @staticmethod
    def _message_key(message_id: str) -> str:
        return f"task_message:{message_id}"


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
