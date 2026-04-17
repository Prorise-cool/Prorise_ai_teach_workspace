"""Render failure persistence — ManimCat render-failure/service.ts port.

GAP-2: Persist render failures to Redis for analysis and doom loop detection.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

REDIS_KEY_PREFIX = "video:render_failure:"
MAX_HISTORY_PER_SECTION = 20


@dataclass
class RenderFailureRecord:
    """A single render failure event."""
    task_id: str
    section_id: str
    error_type: str
    sanitized_message: str
    error_signature: str  # hash of sanitized message for doom loop detection
    code_snippet: str | None
    memory_mb: float | None
    attempt: int
    timestamp: str  # ISO 8601
    recovery_status: str = "pending"  # pending | recovered | abandoned

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RenderFailureRecord:
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def compute_error_signature(sanitized_message: str) -> str:
    """Hash sanitized error message for doom loop comparison."""
    # Normalize whitespace and case for stable signatures
    normalized = " ".join(sanitized_message.lower().split())
    return hashlib.md5(normalized.encode()).hexdigest()[:16]


class RenderFailureStore:
    """Persist and query render failure records via Redis."""

    def __init__(self, redis_client=None):
        self._redis = redis_client

    def _get_key(self, task_id: str, section_id: str) -> str:
        return f"{REDIS_KEY_PREFIX}{task_id}:{section_id}"

    async def _call_redis(self, method_name: str, *args) -> Any:
        """Support both sync redis-py clients and async Redis-like clients."""
        if self._redis is None:
            return None
        method = getattr(self._redis, method_name)
        result = method(*args)
        if inspect.isawaitable(result):
            return await result
        return result

    async def record_failure(
        self,
        *,
        task_id: str,
        section_id: str,
        error_type: str,
        sanitized_message: str,
        code_snippet: str | None = None,
        memory_mb: float | None = None,
        attempt: int = 0,
    ) -> RenderFailureRecord:
        """Record a render failure event."""
        record = RenderFailureRecord(
            task_id=task_id,
            section_id=section_id,
            error_type=error_type,
            sanitized_message=sanitized_message,
            error_signature=compute_error_signature(sanitized_message),
            code_snippet=code_snippet,
            memory_mb=memory_mb,
            attempt=attempt,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        if self._redis:
            key = self._get_key(task_id, section_id)
            try:
                # Best-effort persistence: never let telemetry mask the render error itself.
                await self._call_redis("rpush", key, json.dumps(record.to_dict()))
                await self._call_redis("ltrim", key, -MAX_HISTORY_PER_SECTION, -1)
                await self._call_redis("expire", key, 86400)  # 24h TTL
            except Exception:
                logger.warning("Failed to persist render failure to Redis", exc_info=True)
        else:
            logger.debug("No Redis client, skipping failure persistence")

        logger.info(
            "Render failure recorded: task=%s section=%s type=%s attempt=%d",
            task_id, section_id, error_type, attempt,
        )
        return record

    async def get_failure_history(
        self, task_id: str, section_id: str
    ) -> list[RenderFailureRecord]:
        """Get failure history for a specific section."""
        if not self._redis:
            return []

        key = self._get_key(task_id, section_id)
        try:
            raw_list = await self._call_redis("lrange", key, 0, -1) or []
            return [
                RenderFailureRecord.from_dict(
                    json.loads(item.decode("utf-8") if isinstance(item, (bytes, bytearray)) else item)
                )
                for item in raw_list
            ]
        except Exception:
            logger.warning("Failed to read failure history from Redis", exc_info=True)
            return []
