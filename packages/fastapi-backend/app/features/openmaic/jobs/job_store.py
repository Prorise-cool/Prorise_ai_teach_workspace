"""RuntimeStore-backed job state store for OpenMAIC classroom generation jobs.

Uses the existing RuntimeStore (synchronous) with xm_openmaic_* key namespace.
All methods are synchronous to match RuntimeStore's interface.
"""

from __future__ import annotations

import json
import logging

from app.infra.redis_client import RuntimeStore

logger = logging.getLogger(__name__)

# Key templates — all prefixed with xm_ per RuntimeStore contract
_STATUS_KEY = "xm_openmaic_job_{job_id}_status"
_PROGRESS_KEY = "xm_openmaic_job_{job_id}_progress"
_RESULT_KEY = "xm_openmaic_job_{job_id}_result"
_ERROR_KEY = "xm_openmaic_job_{job_id}_error"

_DEFAULT_TTL = 24 * 60 * 60  # 24 hours


class JobStore:
    """RuntimeStore wrapper for OpenMAIC job lifecycle management.

    All methods are synchronous (RuntimeStore is sync).
    For use in route handlers, wrap calls in asyncio.to_thread if needed.
    """

    def __init__(self, runtime_store: RuntimeStore) -> None:
        self._store = runtime_store

    def create(self, job_id: str) -> None:
        """Initialize a new job in pending state."""
        self._store.set_runtime_value(
            _STATUS_KEY.format(job_id=job_id), "pending", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(job_id=job_id), 0, ttl_seconds=_DEFAULT_TTL
        )

    def set_status(self, job_id: str, status: str) -> None:
        self._store.set_runtime_value(
            _STATUS_KEY.format(job_id=job_id), status, ttl_seconds=_DEFAULT_TTL
        )

    def set_progress(self, job_id: str, progress: int) -> None:
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(job_id=job_id),
            max(0, min(100, progress)),
            ttl_seconds=_DEFAULT_TTL,
        )

    def set_result(self, job_id: str, classroom: dict) -> None:
        """Persist classroom result and mark job as ready."""
        self._store.set_runtime_value(
            _RESULT_KEY.format(job_id=job_id), classroom, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(job_id=job_id), "ready", ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _PROGRESS_KEY.format(job_id=job_id), 100, ttl_seconds=_DEFAULT_TTL
        )

    def set_error(self, job_id: str, error: str) -> None:
        """Mark job as failed with error message."""
        self._store.set_runtime_value(
            _ERROR_KEY.format(job_id=job_id), error, ttl_seconds=_DEFAULT_TTL
        )
        self._store.set_runtime_value(
            _STATUS_KEY.format(job_id=job_id), "failed", ttl_seconds=_DEFAULT_TTL
        )

    def get_status(self, job_id: str) -> dict:
        """Return job status dict.

        Returns {status, progress, classroom, error}.
        """
        status = self._store.get_runtime_value(_STATUS_KEY.format(job_id=job_id))
        if status is None:
            return {
                "status": "pending",
                "progress": 0,
                "classroom": None,
                "error": "Job not found",
            }

        progress = self._store.get_runtime_value(_PROGRESS_KEY.format(job_id=job_id)) or 0

        classroom = None
        error = None

        if status == "ready":
            classroom = self._store.get_runtime_value(_RESULT_KEY.format(job_id=job_id))

        if status == "failed":
            error = self._store.get_runtime_value(_ERROR_KEY.format(job_id=job_id))

        return {
            "status": status,
            "progress": int(progress),
            "classroom": classroom,
            "error": error,
        }

    def exists(self, job_id: str) -> bool:
        return self._store.get_runtime_value(_STATUS_KEY.format(job_id=job_id)) is not None
