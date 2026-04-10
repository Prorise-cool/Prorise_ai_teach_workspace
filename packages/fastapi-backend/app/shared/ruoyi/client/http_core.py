"""RuoYi 底层 HTTP 重试循环混入。"""

from __future__ import annotations

import asyncio
from typing import Any, Mapping

import httpx

from app.core.errors import IntegrationError
from app.core.logging import get_logger, get_request_id, get_task_id
from app.shared.ruoyi.models import build_retry_details, coerce_status_code, format_headers

logger = get_logger("app.shared.ruoyi_client")
_SAFE_RETRY_METHODS = {"GET", "HEAD", "OPTIONS"}


class HttpCoreMixin:
    """底层 HTTP 请求，包含重试、超时、错误码映射逻辑。"""

    retry_attempts: int
    retry_delay_seconds: float
    _client: httpx.AsyncClient

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        retry_enabled: bool | None = None,
    ) -> dict[str, Any]:
        """底层 HTTP 请求，包含重试、超时、错误码映射逻辑。"""
        request_headers = format_headers(headers)
        request_id = get_request_id()
        task_id = get_task_id()
        resolved_retry_enabled = self._is_retry_enabled(method, retry_enabled)
        attempts = self.retry_attempts + 1 if resolved_retry_enabled else 1

        for attempt_index in range(1, attempts + 1):
            try:
                response = await self._client.request(
                    method, path,
                    params=params, json=json_body, headers=request_headers,
                )
            except httpx.TimeoutException as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=timeout",
                        resource, operation, path, attempt_index, attempts,
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise IntegrationError(
                    service="ruoyi", resource=resource, operation=operation,
                    code="RUOYI_TIMEOUT", message="RuoYi 请求超时",
                    status_code=504, retryable=resolved_retry_enabled,
                    details=build_retry_details(
                        service="ruoyi", resource=resource, operation=operation,
                        endpoint=path, attempts=attempt_index,
                        request_id=request_id, task_id=task_id, reason="timeout",
                    ),
                ) from exc
            except httpx.RequestError as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=network",
                        resource, operation, path, attempt_index, attempts,
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise IntegrationError(
                    service="ruoyi", resource=resource, operation=operation,
                    code="RUOYI_NETWORK_ERROR", message="RuoYi 网络异常",
                    status_code=503, retryable=resolved_retry_enabled,
                    details=build_retry_details(
                        service="ruoyi", resource=resource, operation=operation,
                        endpoint=path, attempts=attempt_index,
                        request_id=request_id, task_id=task_id,
                        reason=exc.__class__.__name__,
                    ),
                ) from exc

            payload = self._parse_payload(response, resource=resource, operation=operation, endpoint=path)
            payload_code = coerce_status_code(payload.get("code"))
            effective_status = response.status_code if response.status_code >= 400 else (payload_code or 200)

            if effective_status != 200:
                if resolved_retry_enabled and self._should_retry_status(effective_status) and attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s status=%s upstream_code=%s",
                        resource, operation, path, attempt_index, attempts,
                        effective_status, payload_code,
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise self._build_integration_error(
                    resource=resource, operation=operation, endpoint=path,
                    status_code=effective_status, upstream_code=payload_code,
                    payload=payload, attempts=attempt_index,
                    request_id=request_id, task_id=task_id,
                )

            logger.info(
                "RuoYi request succeeded resource=%s operation=%s endpoint=%s attempts=%s",
                resource, operation, path, attempt_index,
            )
            return payload

        raise self._build_integration_error(
            resource=resource, operation=operation, endpoint=path,
            status_code=502, upstream_code=None, payload={},
            attempts=attempts, request_id=request_id, task_id=task_id,
            reason="retry loop exhausted",
        )

    @staticmethod
    def _is_retry_enabled(method: str, retry_enabled: bool | None) -> bool:
        """根据方法和显式开关决定是否启用重试。"""
        if retry_enabled is not None:
            return retry_enabled
        return method.upper() in _SAFE_RETRY_METHODS

    @staticmethod
    def _should_retry_status(status_code: int) -> bool:
        """判断给定状态码是否值得重试。"""
        return status_code == 429 or status_code >= 500
