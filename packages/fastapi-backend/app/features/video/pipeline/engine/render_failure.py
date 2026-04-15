"""Render failure persistence — ManimCat render-failure/service.ts port.

GAP-2: Persist render failures to Redis for analysis and doom loop detection.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field, asdict
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
                # Append to list, trim to max
                await self._redis.rpush(key, json.dumps(record.to_dict()))
                await self._redis.ltrim(key, -MAX_HISTORY_PER_SECTION, -1)
                await self._redis.expire(key, 86400)  # 24h TTL
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
            raw_list = await self._redis.lrange(key, 0, -1)
            return [
                RenderFailureRecord.from_dict(json.loads(item))
                for item in raw_list
            ]
        except Exception:
            logger.warning("Failed to read failure history from Redis", exc_info=True)
            return []

    async def update_recovery_status(
        self, task_id: str, section_id: str, status: str
    ) -> None:
        """Mark the most recent failure as recovered or abandoned."""
        if not self._redis:
            return

        key = self._get_key(task_id, section_id)
        try:
            raw_list = await self._redis.lrange(key, -1, -1)
            if raw_list:
                record = RenderFailureRecord.from_dict(json.loads(raw_list[0]))
                record.recovery_status = status
                await self._redis.lset(key, -1, json.dumps(record.to_dict()))
        except Exception:
            logger.warning("Failed to update recovery status", exc_info=True)
