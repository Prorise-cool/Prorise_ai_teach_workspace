"""RuoYi 响应解析混入。"""

from __future__ import annotations

from typing import Any, Mapping

import httpx

from app.core.errors import IntegrationError
from app.core.logging import get_logger, get_request_id, get_task_id
from app.shared.ruoyi.models import build_retry_details

logger = get_logger("app.shared.ruoyi.client")


class ResponseParserMixin:
    """HTTP 响应解析与校验。"""

    retry_attempts: int

    def _parse_payload(
        self,
        response: httpx.Response,
        *,
        resource: str,
        operation: str,
        endpoint: str,
    ) -> dict[str, Any]:
        """解析并校验 HTTP 响应体。"""
        try:
            payload = response.json()
        except ValueError as exc:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload={},
                reason="response body is not valid JSON",
            ) from exc

        if not isinstance(payload, dict):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload={},
                reason="response payload is not an object",
            )

        if "code" not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
                reason="missing code field",
            )

        return payload

    def _invalid_response_error(
        self,
        *,
        resource: str,
        operation: str,
        endpoint: str,
        payload: Mapping[str, Any],
        reason: str,
    ) -> IntegrationError:
        """构建响应格式异常错误。"""
        request_id = get_request_id()
        task_id = get_task_id()
        return IntegrationError(
            service="ruoyi", resource=resource, operation=operation,
            code="RUOYI_INVALID_RESPONSE", message="RuoYi 响应格式异常",
            status_code=502, retryable=False,
            details=build_retry_details(
                service="ruoyi", resource=resource, operation=operation,
                endpoint=endpoint, attempts=self.retry_attempts + 1,
                request_id=request_id, task_id=task_id,
                reason=reason,
                upstream_message=str(payload.get("msg")) if payload else None,
            ),
        )

    def _require_mapping_field(
        self,
        payload: Mapping[str, Any],
        *,
        field_name: str,
        resource: str,
        operation: str,
        endpoint: str,
    ) -> dict[str, Any]:
        """要求 payload 中包含指定的 Mapping 类型字段。"""
        if field_name not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
                reason=f"missing {field_name} field",
            )

        value = payload[field_name]
        if not isinstance(value, Mapping):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
                reason=f"{field_name} is not an object",
            )

        return dict(value)
