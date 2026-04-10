"""RuoYi 快捷方法混入。"""

from __future__ import annotations

from typing import Any, Mapping

from app.shared.ruoyi.mapper import RuoYiMapper
from app.shared.ruoyi.models import RuoYiAckResponse, RuoYiPageResponse, RuoYiSingleResponse


class ShortcutsMixin:
    """HTTP 方法快捷入口：get_single, post_single, put_single 等。"""

    async def get_single(
        self,
        path: str,
        *,
        resource: str,
        operation: str,
        params: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        mapper: RuoYiMapper | None = None,
    ) -> RuoYiSingleResponse[Any]:
        """GET 单条记录。"""
        return await self.request_single(
            "GET", path, resource=resource, operation=operation,
            params=params, headers=headers, mapper=mapper,
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
        retry_enabled: bool | None = None,
    ) -> RuoYiSingleResponse[Any]:
        """POST 单条记录。"""
        return await self.request_single(
            "POST", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, mapper=mapper,
            retry_enabled=retry_enabled,
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
        retry_enabled: bool | None = None,
    ) -> RuoYiSingleResponse[Any]:
        """PUT 单条记录。"""
        return await self.request_single(
            "PUT", path, resource=resource, operation=operation,
            json_body=json_body, headers=headers, mapper=mapper,
            retry_enabled=retry_enabled,
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
        mapper: RuoYiMapper | None = None,
    ) -> RuoYiPageResponse[Any]:
        """GET 分页列表。"""
        return await self.request_page(
            "GET", path, resource=resource, operation=operation,
            params=params, headers=headers, mapper=mapper,
        )
