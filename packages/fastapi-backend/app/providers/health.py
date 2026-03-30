from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Mapping

from app.infra.redis_client import RuntimeStore
from app.providers.protocols import validate_provider_id
from app.shared.task_framework.status import TaskErrorCode


@dataclass(slots=True, frozen=True)
class ProviderHealthSnapshot:
    provider_id: str
    is_healthy: bool
    checked_at: str
    reason: str | None = None
    error_code: str | None = None
    failure_count: int = 0
    source: str = "runtime"
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "provider_id", validate_provider_id(self.provider_id))
        object.__setattr__(self, "metadata", MappingProxyType(dict(self.metadata)))

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> "ProviderHealthSnapshot":
        metadata = dict(payload.get("metadata", {}))
        error_code = metadata.get("errorCode")
        return cls(
            provider_id=str(payload["provider"]),
            is_healthy=bool(payload["isHealthy"]),
            checked_at=str(payload["checkedAt"]),
            reason=str(payload["reason"]) if payload.get("reason") is not None else None,
            error_code=str(error_code) if error_code is not None else None,
            failure_count=int(metadata.get("failureCount", 0)),
            source=str(metadata.get("source", "runtime")),
            metadata=metadata,
        )


class ProviderHealthStore:
    def __init__(self, runtime_store: RuntimeStore) -> None:
        self._runtime_store = runtime_store

    def get(self, provider_id: str) -> ProviderHealthSnapshot | None:
        payload = self._runtime_store.get_provider_health(provider_id)
        if payload is None:
            return None
        return ProviderHealthSnapshot.from_payload(payload)

    def is_available(self, provider_id: str) -> bool:
        snapshot = self.get(provider_id)
        return snapshot is None or snapshot.is_healthy

    def mark_success(
        self,
        provider_id: str,
        *,
        source: str = "provider-call",
        metadata: Mapping[str, Any] | None = None,
    ) -> ProviderHealthSnapshot:
        payload = self._runtime_store.set_provider_health(
            provider_id,
            is_healthy=True,
            reason="ok",
            metadata={
                "source": source,
                "failureCount": 0,
                **dict(metadata or {}),
            },
        )
        return ProviderHealthSnapshot.from_payload(payload)

    def mark_failure(
        self,
        provider_id: str,
        *,
        reason: str,
        error_code: TaskErrorCode | str,
        source: str = "provider-call",
        metadata: Mapping[str, Any] | None = None,
    ) -> ProviderHealthSnapshot:
        previous = self.get(provider_id)
        payload = self._runtime_store.set_provider_health(
            provider_id,
            is_healthy=False,
            reason=reason,
            metadata={
                "source": source,
                "failureCount": 1 if previous is None else previous.failure_count + 1,
                "errorCode": TaskErrorCode(error_code).value,
                **dict(metadata or {}),
            },
        )
        return ProviderHealthSnapshot.from_payload(payload)
