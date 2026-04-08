"""RuoYi 平台异步 HTTP 客户端。

本模块封装对 RuoYi 后台的所有 HTTP 请求，包括单条查询、分页查询、
仅确认写入三种模式，并内置超时/网络异常重试、统一错误码映射与日志追踪。

数据类与通用辅助函数定义在 ``ruoyi_models`` 模块中，此处 re-export
以保持向后兼容。
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any, Callable, Mapping

if TYPE_CHECKING:
    from app.core.security import AccessContext

import httpx

from app.core.config import get_settings
from app.core.errors import IntegrationError
from app.core.logging import get_logger, get_request_id, get_task_id
from app.shared.ruoyi_mapper import RuoYiMapper

# Re-export 数据类和辅助函数，保持 ``from app.shared.ruoyi_client import X`` 兼容
from app.shared.ruoyi_models import (  # noqa: F401 – re-export
    RuoYiAckResponse,
    RuoYiPageResponse,
    RuoYiSingleResponse,
    build_retry_details,
    coerce_status_code,
    extract_client_id_from_access_token,
    format_headers,
)

logger = get_logger("app.shared.ruoyi_client")
_SAFE_RETRY_METHODS = {"GET", "HEAD", "OPTIONS"}

# 向后兼容：保留旧的下划线前缀别名
_coerce_status_code = coerce_status_code
_extract_client_id_from_access_token = extract_client_id_from_access_token
_format_headers = format_headers
_build_retry_details = build_retry_details


class RuoYiClient:
    """RuoYi 平台异步 HTTP 客户端。

    提供三种请求模式：
    - ``request_single``：单条记录查询，返回 ``RuoYiSingleResponse``。
    - ``request_page``：分页列表查询，返回 ``RuoYiPageResponse``。
    - ``request_ack``：仅确认写入，返回 ``RuoYiAckResponse``。

    内置超时/网络异常自动重试、统一错误码映射和结构化日志追踪。
    """

    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 10.0,
        retry_attempts: int = 2,
        retry_delay_seconds: float = 0.1,
        access_token: str | None = None,
        client_id: str | None = None,
        default_headers: Mapping[str, str] | None = None,
        transport: httpx.BaseTransport | httpx.AsyncBaseTransport | None = None
    ) -> None:
        headers = dict(default_headers or {})
        if access_token:
            headers.setdefault("Authorization", f"Bearer {access_token}")
        resolved_client_id = client_id or extract_client_id_from_access_token(access_token)
        if resolved_client_id:
            headers.setdefault("Clientid", resolved_client_id)

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
        """从全局 ``Settings`` 创建客户端实例。"""
        settings = get_settings()
        return cls(
            base_url=settings.ruoyi_base_url,
            timeout_seconds=settings.ruoyi_timeout_seconds,
            retry_attempts=settings.ruoyi_retry_attempts,
            retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
            access_token=settings.ruoyi_access_token,
            client_id=settings.ruoyi_client_id,
        )

    @classmethod
    def from_access_context(cls, ctx: "AccessContext") -> "RuoYiClient":
        """用当前请求用户的 token 创建客户端实例。

        Args:
            ctx: 已认证用户的请求级安全上下文。

        Returns:
            携带用户 token 的 RuoYiClient 实例。
        """
        settings = get_settings()
        return cls(
            base_url=settings.ruoyi_base_url,
            timeout_seconds=settings.ruoyi_timeout_seconds,
            retry_attempts=settings.ruoyi_retry_attempts,
            retry_delay_seconds=settings.ruoyi_retry_delay_seconds,
            access_token=ctx.token,
            client_id=ctx.client_id,
        )

    async def __aenter__(self) -> "RuoYiClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        await self.aclose()

    async def aclose(self) -> None:
        """关闭底层 HTTP 连接。"""
        await self._client.aclose()

    # ------------------------------------------------------------------
    # 快捷方法
    # ------------------------------------------------------------------

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
        """GET 单条记录。"""
        return await self.request_single(
            "GET", path, resource=resource, operation=operation,
            params=params, headers=headers, mapper=mapper
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
        """POST 单条记录。"""
        return await self.request_single(
            "POST", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, mapper=mapper,
            retry_enabled=retry_enabled
        )

    async def post_ack(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        retry_enabled: bool | None = None,
    ) -> RuoYiAckResponse:
        """POST 仅确认写入。"""
        return await self.request_ack(
            "POST", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, retry_enabled=retry_enabled,
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
        """PUT 单条记录。"""
        return await self.request_single(
            "PUT", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, mapper=mapper,
            retry_enabled=retry_enabled
        )

    async def put_ack(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        json_body: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        retry_enabled: bool | None = None,
    ) -> RuoYiAckResponse:
        """PUT 仅确认写入。"""
        return await self.request_ack(
            "PUT", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, retry_enabled=retry_enabled,
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
        """GET 分页列表。"""
        return await self.request_page(
            "GET", path, resource=resource, operation=operation,
            params=params, headers=headers, mapper=mapper
        )

    # ------------------------------------------------------------------
    # 核心请求方法
    # ------------------------------------------------------------------

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
        """发起请求并解析为单条记录响应。"""
        payload = await self._request_json(
            method, path, resource=resource, operation=operation,
            params=params, json_body=json_body, headers=headers,
            retry_enabled=retry_enabled
        )

        data = self._require_mapping_field(
            payload, field_name="data",
            resource=resource, operation=operation, endpoint=path
        )
        if mapper is not None and isinstance(data, Mapping):
            data = mapper.from_ruoyi(data)

        return RuoYiSingleResponse(
            code=payload["code"], msg=payload["msg"], data=data, raw=payload
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
        """发起请求并解析为分页列表响应。"""
        payload = await self._request_json(
            method, path, resource=resource, operation=operation,
            params=params, json_body=json_body, headers=headers,
            retry_enabled=retry_enabled
        )

        if "rows" not in payload or "total" not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="missing rows or total field"
            )

        rows = payload["rows"]
        if not isinstance(rows, list):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="rows is not a list"
            )

        if mapper is not None:
            rows = [mapper.from_ruoyi(row) if isinstance(row, Mapping) else row for row in rows]

        total = payload["total"]
        if not isinstance(total, int):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="total is not an int"
            )

        return RuoYiPageResponse(
            code=payload["code"], msg=payload["msg"],
            rows=rows, total=total, raw=payload
        )

    async def request_ack(
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
    ) -> RuoYiAckResponse:
        """发起请求并解析为仅确认响应。"""
        payload = await self._request_json(
            method, path, resource=resource, operation=operation,
            params=params, json_body=json_body, headers=headers,
            retry_enabled=retry_enabled,
        )
        return RuoYiAckResponse(
            code=payload["code"], msg=payload["msg"], raw=payload,
        )

    # ------------------------------------------------------------------
    # 内部实现
    # ------------------------------------------------------------------

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
                    params=params, json=json_body, headers=request_headers
                )
            except httpx.TimeoutException as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=timeout",
                        resource, operation, path, attempt_index, attempts
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
                        request_id=request_id, task_id=task_id, reason="timeout"
                    )
                ) from exc
            except httpx.RequestError as exc:
                if attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s reason=network",
                        resource, operation, path, attempt_index, attempts
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
                        reason=exc.__class__.__name__
                    )
                ) from exc

            payload = self._parse_payload(response, resource=resource, operation=operation, endpoint=path)
            payload_code = coerce_status_code(payload.get("code"))
            effective_status = response.status_code if response.status_code >= 400 else (payload_code or 200)

            if effective_status != 200:
                if resolved_retry_enabled and self._should_retry_status(effective_status) and attempt_index < attempts:
                    logger.warning(
                        "RuoYi request retry resource=%s operation=%s endpoint=%s attempt=%s/%s status=%s upstream_code=%s",
                        resource, operation, path, attempt_index, attempts,
                        effective_status, payload_code
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue

                raise self._build_integration_error(
                    resource=resource, operation=operation, endpoint=path,
                    status_code=effective_status, upstream_code=payload_code,
                    payload=payload, attempts=attempt_index,
                    request_id=request_id, task_id=task_id
                )

            logger.info(
                "RuoYi request succeeded resource=%s operation=%s endpoint=%s attempts=%s",
                resource, operation, path, attempt_index
            )
            return payload

        raise self._build_integration_error(
            resource=resource, operation=operation, endpoint=path,
            status_code=502, upstream_code=None, payload={},
            attempts=attempts, request_id=request_id, task_id=task_id,
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
        """解析并校验 HTTP 响应体。"""
        try:
            payload = response.json()
        except ValueError as exc:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload={},
                reason="response body is not valid JSON"
            ) from exc

        if not isinstance(payload, dict):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload={},
                reason="response payload is not an object"
            )

        if "code" not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
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
        """要求 payload 中包含指定的 Mapping 类型字段。"""
        if field_name not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
                reason=f"missing {field_name} field"
            )

        value = payload[field_name]
        if not isinstance(value, Mapping):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=endpoint, payload=payload,
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
        """根据上游状态码构建统一 ``IntegrationError``。"""
        error_code, error_status, retryable = self._map_error_status(status_code)
        upstream_message = payload.get("msg")
        message = str(upstream_message) if upstream_message is not None else "RuoYi 请求失败"

        logger.error(
            "RuoYi request failed resource=%s operation=%s endpoint=%s status=%s upstream_code=%s attempts=%s reason=%s",
            resource, operation, endpoint, status_code,
            upstream_code, attempts, reason or "upstream-error"
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
                reason=reason
            )
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

    @staticmethod
    def _should_retry_status(status_code: int) -> bool:
        """判断给定状态码是否值得重试。"""
        return status_code == 429 or status_code >= 500

    @staticmethod
    def _is_retry_enabled(method: str, retry_enabled: bool | None) -> bool:
        """根据方法和显式开关决定是否启用重试。"""
        if retry_enabled is not None:
            return retry_enabled
        return method.upper() in _SAFE_RETRY_METHODS


# ---------------------------------------------------------------------------
# Client factory 类型与构造器
# ---------------------------------------------------------------------------

RuoYiClientFactory = Callable[[], "RuoYiClient"]
"""无参调用返回 ``RuoYiClient``（可用作 async context manager）的工厂类型。"""


def build_client_factory(access_context: "AccessContext | None" = None) -> RuoYiClientFactory:
    """根据是否有用户上下文构造 client_factory。

    有 ``access_context`` 时使用用户 token 创建客户端，否则回退到
    ``RuoYiClient.from_settings``。

    Args:
        access_context: 可选的已认证用户安全上下文。

    Returns:
        可直接调用以获取 ``RuoYiClient`` 实例的工厂函数。
    """
    if access_context is not None:
        return lambda: RuoYiClient.from_access_context(access_context)
    return RuoYiClient.from_settings
