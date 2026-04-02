from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Generic, Mapping, TypeVar

import httpx

from app.core.config import get_settings
from app.core.errors import IntegrationError
from app.core.logging import get_logger, get_request_id, get_task_id
from app.shared.ruoyi_mapper import RuoYiMapper

T = TypeVar("T")

logger = get_logger("app.shared.ruoyi_client")
_SAFE_RETRY_METHODS = {"GET", "HEAD", "OPTIONS"}


@dataclass(slots=True)
class RuoYiSingleResponse(Generic[T]):
    code: int
    msg: str
    data: T
    raw: dict[str, Any]


@dataclass(slots=True)
class RuoYiPageResponse(Generic[T]):
    code: int
    msg: str
    rows: list[T]
    total: int
    raw: dict[str, Any]


def _coerce_status_code(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _format_headers(headers: Mapping[str, str] | None = None) -> dict[str, str]:
    request_headers: dict[str, str] = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Client-Name": "prorise-fastapi-backend"
    }

    request_id = get_request_id()
    task_id = get_task_id()
    if request_id is not None:
        request_headers["X-Request-ID"] = request_id
    if task_id is not None:
        request_headers["X-Task-ID"] = task_id
    if headers:
        request_headers.update(headers)
    return request_headers


def _build_retry_details(
    *,
    service: str,
    resource: str,
    operation: str,
    endpoint: str,
    attempts: int,
    request_id: str | None,
    task_id: str | None,
    upstream_status: int | None = None,
    upstream_code: int | None = None,
    upstream_message: str | None = None,
    reason: str | None = None
) -> dict[str, object]:
    details: dict[str, object] = {
        "service": service,
        "resource": resource,
        "operation": operation,
        "endpoint": endpoint,
        "attempts": attempts
    }
    if request_id is not None:
        details["request_id"] = request_id
    if task_id is not None:
        details["task_id"] = task_id
    if upstream_status is not None:
        details["upstream_status"] = upstream_status
    if upstream_code is not None:
        details["upstream_code"] = upstream_code
    if upstream_message is not None:
        details["upstream_message"] = upstream_message
    if reason is not None:
        details["reason"] = reason
    return details


class RuoYiClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 10.0,
        retry_attempts: int = 2,
        retry_delay_seconds: float = 0.1,
        access_token: str | None = None,
        default_headers: Mapping[str, str] | None = None,
        transport: httpx.BaseTransport | httpx.AsyncBaseTransport | None = None
    ) -> None:
        headers = dict(default_headers or {})
        if access_token:
            headers.setdefault("Authorization", f"Bearer {access_token}")

        self.base_url = base_url
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = retry_attempts
        self.retry_delay_seconds = retry_delay_seconds
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout_seconds,
            headers=headers,
            transport=transport
        )

    @classmethod
    def from_settings(cls) -> "RuoYiClient":
        settings = get_settings()
        return cls(
            base_url=settings.ruoyi_base_url,
            timeout_seconds=settings.ruoyi_timeout_seconds,
            retry_attempts=settings.ruoyi_retry_attempts,
            retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
            access_token=settings.ruoyi_access_token
        )

    async def __aenter__(self) -> "RuoYiClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_single(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None
    ) -> RuoYiSingleResponse[Any]:
        return await self.request_single(
            "GET",
            path,
            resource=resource,
            operation=operation,
            params=params,
            headers=headers,
            mapper=mapper
        )

    async def post_single(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None,
        retry_enabled: bool | None = None
    ) -> RuoYiSingleResponse[Any]:
        return await self.request_single(
            "POST",
            path,
            resource=resource,
            operation=operation,
            json_body=json_body,
            headers=headers,
            mapper=mapper,
            retry_enabled=retry_enabled
        )

    async def put_single(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None,
        retry_enabled: bool | None = None
    ) -> RuoYiSingleResponse[Any]:
        return await self.request_single(
            "PUT",
            path,
            resource=resource,
            operation=operation,
            json_body=json_body,
            headers=headers,
            mapper=mapper,
            retry_enabled=retry_enabled
        )

    async def get_page(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None
    ) -> RuoYiPageResponse[Any]:
        return await self.request_page(
            "GET",
            path,
            resource=resource,
            operation=operation,
            params=params,
            headers=headers,
            mapper=mapper
        )

    async def request_single(
        self,
        method: str,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None,
        retry_enabled: bool | None = None
    ) -> RuoYiSingleResponse[Any]:
        payload = await self._request_json(
            method,
            path,
            resource=resource,
            operation=operation,
            params=params,
            json_body=json_body,
            headers=headers,
            retry_enabled=retry_enabled
        )

        data = self._require_mapping_field(
            payload,
            field_name="data",
            resource=resource,
            operation=operation,
            endpoint=path
        )
        if mapper is not None and isinstance(data, Mapping):
            data = mapper.from_ruoyi(data)

        return RuoYiSingleResponse(
            code=payload["code"],
            msg=payload["msg"],
            data=data,
            raw=payload
        )

    async def request_page(
        self,
        method: str,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None,
        retry_enabled: bool | None = None
    ) -> RuoYiPageResponse[Any]:
        payload = await self._request_json(
            method,
            path,
            resource=resource,
            operation=operation,
            params=params,
            json_body=json_body,
            headers=headers,
            retry_enabled=retry_enabled
        )

        if "rows" not in payload or "total" not in payload:
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=path,
                payload=payload,
                reason="missing rows or total field"
            )

        rows = payload["rows"]
        if not isinstance(rows, list):
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=path,
                payload=payload,
                reason="rows is not a list"
            )

        if mapper is not None:
            rows = [mapper.from_ruoyi(row) if isinstance(row, Mapping) else row for row in rows]

        total = payload["total"]
        if not isinstance(total, int):
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=path,
                payload=payload,
                reason="total is not an int"
            )

        return RuoYiPageResponse(
            code=payload["code"],
            msg=payload["msg"],
            rows=rows,
            total=total,
            raw=payload
        )

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
        retry_enabled: bool | None = None
    ) -> dict[str, Any]:
        request_headers = _format_headers(headers)
        request_id = get_request_id()
        task_id = get_task_id()
        resolved_retry_enabled = self._is_retry_enabled(method, retry_enabled)
        attempts = self.retry_attempts + 1 if resolved_retry_enabled else 1

        for attempt_index in range(1, attempts + 1):
            try:
                response = await self._client.request(
                    method,
                    path,
                    params=params,
                    json=json_body,
                    headers=request_headers
                )
            except httpx.TimeoutException as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=timeout",
                        resource,
                        operation,
                        path,
                        attempt_index,
                        attempts
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise IntegrationError(
                    service="ruoyi",
                    resource=resource,
                    operation=operation,
                    code="RUOYI_TIMEOUT",
                    message="RuoYi 请求超时",
                    status_code=504,
                    retryable=resolved_retry_enabled,
                    details=_build_retry_details(
                        service="ruoyi",
                        resource=resource,
                        operation=operation,
                        endpoint=path,
                        attempts=attempt_index,
                        request_id=request_id,
                        task_id=task_id,
                        reason="timeout"
                    )
                ) from exc
            except httpx.RequestError as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=network",
                        resource,
                        operation,
                        path,
                        attempt_index,
                        attempts
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise IntegrationError(
                    service="ruoyi",
                    resource=resource,
                    operation=operation,
                    code="RUOYI_NETWORK_ERROR",
                    message="RuoYi 网络异常",
                    status_code=503,
                    retryable=resolved_retry_enabled,
                    details=_build_retry_details(
                        service="ruoyi",
                        resource=resource,
                        operation=operation,
                        endpoint=path,
                        attempts=attempt_index,
                        request_id=request_id,
                        task_id=task_id,
                        reason=exc.__class__.__name__
                    )
                ) from exc

            payload = self._parse_payload(response, resource=resource, operation=operation, endpoint=path)
            payload_code = _coerce_status_code(payload.get("code"))
            effective_status = response.status_code if response.status_code >= 400 else (payload_code or 200)

            if effective_status != 200:
                if resolved_retry_enabled and self._should_retry_status(effective_status) and attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s status=%s upstream_code=%s",
                        resource,
                        operation,
                        path,
                        attempt_index,
                        attempts,
                        effective_status,
                        payload_code
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise self._build_integration_error(
                    resource=resource,
                    operation=operation,
                    endpoint=path,
                    status_code=effective_status,
                    upstream_code=payload_code,
                    payload=payload,
                    attempts=attempt_index,
                    request_id=request_id,
                    task_id=task_id
                )

            logger.info(
                "RuoYi request succeeded resource=%s operation=%s endpoint=%s attempts=%s",
                resource,
                operation,
                path,
                attempt_index
            )
            return payload

        raise self._build_integration_error(
            resource=resource,
            operation=operation,
            endpoint=path,
            status_code=502,
            upstream_code=None,
            payload={},
            attempts=attempts,
            request_id=request_id,
            task_id=task_id,
            reason="retry loop exhausted"
        )

    def _parse_payload(
        self,
        response: httpx.Response,
        *,
        resource: str,
        operation: str,
        endpoint: str
    ) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                payload={},
                reason="response body is not valid JSON"
            ) from exc

        if not isinstance(payload, dict):
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                payload={},
                reason="response payload is not an object"
            )

        if "code" not in payload:
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                payload=payload,
                reason="missing code field"
            )

        return payload

    def _invalid_response_error(
        self,
        *,
        resource: str,
        operation: str,
        endpoint: str,
        payload: Mapping[str, Any],
        reason: str
    ) -> IntegrationError:
        request_id = get_request_id()
        task_id = get_task_id()
        return IntegrationError(
            service="ruoyi",
            resource=resource,
            operation=operation,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details=_build_retry_details(
                service="ruoyi",
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                attempts=self.retry_attempts + 1,
                request_id=request_id,
                task_id=task_id,
                reason=reason,
                upstream_message=str(payload.get("msg")) if payload else None
            )
        )

    def _require_mapping_field(
        self,
        payload: Mapping[str, Any],
        *,
        field_name: str,
        resource: str,
        operation: str,
        endpoint: str
    ) -> dict[str, Any]:
        if field_name not in payload:
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                payload=payload,
                reason=f"missing {field_name} field"
            )

        value = payload[field_name]
        if not isinstance(value, Mapping):
            raise self._invalid_response_error(
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                payload=payload,
                reason=f"{field_name} is not an object"
            )

        return dict(value)

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
        reason: str | None = None
    ) -> IntegrationError:
        error_code, error_status, retryable = self._map_error_status(status_code)
        upstream_message = payload.get("msg")
        message = str(upstream_message) if upstream_message is not None else "RuoYi 请求失败"

        logger.error(
            "RuoYi request failed resource=%s operation=%s endpoint=%s status=%s upstream_code=%s attempts=%s reason=%s",
            resource,
            operation,
            endpoint,
            status_code,
            upstream_code,
            attempts,
            reason or "upstream-error"
        )

        return IntegrationError(
            service="ruoyi",
            resource=resource,
            operation=operation,
            code=error_code,
            message=message,
            status_code=error_status,
            retryable=retryable,
            details=_build_retry_details(
                service="ruoyi",
                resource=resource,
                operation=operation,
                endpoint=endpoint,
                attempts=attempts,
                request_id=request_id,
                task_id=task_id,
                upstream_status=status_code,
                upstream_code=upstream_code,
                upstream_message=str(upstream_message) if upstream_message is not None else None,
                reason=reason
            )
        )

    @staticmethod
    def _map_error_status(status_code: int) -> tuple[str, int, bool]:
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

    @staticmethod
    def _should_retry_status(status_code: int) -> bool:
        return status_code == 429 or status_code >= 500

    @staticmethod
    def _is_retry_enabled(method: str, retry_enabled: bool | None) -> bool:
        if retry_enabled is not None:
            return retry_enabled
        return method.upper() in _SAFE_RETRY_METHODS
