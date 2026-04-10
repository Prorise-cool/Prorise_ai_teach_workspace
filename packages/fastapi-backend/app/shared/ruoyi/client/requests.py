"""RuoYi 核心请求方法混入。"""

from __future__ import annotations

from typing import Any, Mapping

from app.shared.ruoyi.mapper import RuoYiMapper
from app.shared.ruoyi.models import RuoYiAckResponse, RuoYiPageResponse, RuoYiSingleResponse


class RequestsMixin:
    """核心请求方法：request_single, request_page, request_ack。"""

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
        retry_enabled: bool | None = None,
    ) -> RuoYiSingleResponse[Any]:
        """发起请求并解析为单条记录响应。"""
        payload = await self._request_json(
            method, path, resource=resource, operation=operation,
            params=params, json_body=json_body, headers=headers,
            retry_enabled=retry_enabled,
        )

        data = self._require_mapping_field(
            payload, field_name="data",
            resource=resource, operation=operation, endpoint=path,
        )
        if mapper is not None and isinstance(data, Mapping):
            data = mapper.from_ruoyi(data)

        return RuoYiSingleResponse(
            code=payload["code"], msg=payload["msg"], data=data, raw=payload,
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
        retry_enabled: bool | None = None,
    ) -> RuoYiPageResponse[Any]:
        """发起请求并解析为分页列表响应。"""
        payload = await self._request_json(
            method, path, resource=resource, operation=operation,
            params=params, json_body=json_body, headers=headers,
            retry_enabled=retry_enabled,
        )

        if "rows" not in payload or "total" not in payload:
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="missing rows or total field",
            )

        rows = payload["rows"]
        if not isinstance(rows, list):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="rows is not a list",
            )

        if mapper is not None:
            rows = [mapper.from_ruoyi(row) if isinstance(row, Mapping) else row for row in rows]

        total = payload["total"]
        if not isinstance(total, int):
            raise self._invalid_response_error(
                resource=resource, operation=operation,
                endpoint=path, payload=payload,
                reason="total is not an int",
            )

        return RuoYiPageResponse(
            code=payload["code"], msg=payload["msg"],
            rows=rows, total=total, raw=payload,
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
