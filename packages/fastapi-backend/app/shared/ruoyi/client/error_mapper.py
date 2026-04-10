"""RuoYi 错误映射混入。"""

from __future__ import annotations

from typing import Any, Mapping

from app.core.errors import IntegrationError
from app.core.logging import get_logger, get_request_id, get_task_id
from app.shared.ruoyi.models import build_retry_details

logger = get_logger("app.shared.ruoyi_client")


class ErrorMapperMixin:
    """根据上游状态码构建统一 ``IntegrationError``。"""

    def _build_integration_error(
        self,
        *,
        resource: str,
        operation: str,
        endpoint: str,
        status_code: int,
        upstream_code: int | None,
        payload: Mapping[str, Any],
        attempts: int,
        request_id: str | None,
        task_id: str | None,
        reason: str | None = None,
    ) -> IntegrationError:
        """根据上游状态码构建统一 ``IntegrationError``。"""
        error_code, error_status, retryable = self._map_error_status(status_code)
        upstream_message = payload.get("msg")
        message = str(upstream_message) if upstream_message is not None else "RuoYi 请求失败"

        logger.error(
            "RuoYi request failed resource=%s operation=%s endpoint=%s status=%s upstream_code=%s attempts=%s reason=%s",
            resource, operation, endpoint, status_code,
            upstream_code, attempts, reason or "upstream-error",
        )

        return IntegrationError(
            service="ruoyi", resource=resource, operation=operation,
            code=error_code, message=message,
            status_code=error_status, retryable=retryable,
            details=build_retry_details(
                service="ruoyi", resource=resource, operation=operation,
                endpoint=endpoint, attempts=attempts,
                request_id=request_id, task_id=task_id,
                upstream_status=status_code, upstream_code=upstream_code,
                upstream_message=str(upstream_message) if upstream_message is not None else None,
                reason=reason,
            ),
        )

    @staticmethod
    def _map_error_status(status_code: int) -> tuple[str, int, bool]:
        """将上游 HTTP 状态码映射为 ``(error_code, status, retryable)``。"""
        if status_code == 400:
            return "RUOYI_BAD_REQUEST", 400, False
        if status_code == 401:
            return "RUOYI_UNAUTHORIZED", 401, False
        if status_code == 403:
            return "RUOYI_FORBIDDEN", 403, False
        if status_code == 404:
            return "RUOYI_NOT_FOUND", 404, False
        if status_code == 409:
            return "RUOYI_CONFLICT", 409, False
        if status_code == 422:
            return "RUOYI_UNPROCESSABLE_ENTITY", 422, False
        if status_code == 429:
            return "RUOYI_RATE_LIMITED", 429, True
        if 400 <= status_code < 500:
            return "RUOYI_UPSTREAM_REJECTED", status_code, False
        if status_code >= 500:
            return "RUOYI_UPSTREAM_ERROR", 502, True
        return "RUOYI_UPSTREAM_ERROR", 502, True
