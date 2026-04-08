"""伴学会话业务服务。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.companion.schemas import CompanionBootstrapResponse
from app.shared.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
    companion_turn_from_ruoyi_data,
    companion_turn_to_ruoyi_payload,
    session_replay_from_ruoyi_data,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin

if TYPE_CHECKING:
    from app.core.security import AccessContext


class CompanionService(RuoYiServiceMixin):
    """伴学会话业务服务，与 RuoYi 持久化交互。"""
    _RESOURCE = "companion-turn"

    def __init__(self, client_factory=None) -> None:
        """初始化伴学服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        """返回伴学功能域 bootstrap 状态。"""
        return CompanionBootstrapResponse()

    async def persist_turn(
        self,
        request: CompanionTurnCreateRequest,
        *,
        access_context: "AccessContext | None" = None,
    ) -> CompanionTurnSnapshot:
        """持久化伴学对话轮次到 RuoYi。

        Args:
            request: 对话轮次创建请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        async with self._resolve_factory(access_context)() as client:
            result = await client.post_single(
                "/internal/xiaomai/companion/turns",
                resource=self._RESOURCE,
                operation="persist",
                json_body=companion_turn_to_ruoyi_payload(request)
            )
        return self._parse_companion_turn(result.data, operation="persist", endpoint="/internal/xiaomai/companion/turns")

    async def get_turn(
        self,
        turn_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> CompanionTurnSnapshot | None:
        """按 ID 查询伴学对话轮次。

        Args:
            turn_id: 轮次唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        try:
            async with self._resolve_factory(access_context)() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/companion/turns/{turn_id}",
                    resource=self._RESOURCE,
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return self._parse_companion_turn(
            result.data,
            operation="get",
            endpoint=f"/internal/xiaomai/companion/turns/{turn_id}"
        )

    async def replay_session(
        self,
        session_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> SessionReplaySnapshot:
        """回放指定会话的伴学对话记录。

        Args:
            session_id: 会话唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        async with self._resolve_factory(access_context)() as client:
            result = await client.get_single(
                f"/internal/xiaomai/companion/sessions/{session_id}/replay",
                resource=self._RESOURCE,
                operation="replay"
            )
        return self._parse_session_replay(
            result.data,
            operation="replay",
            endpoint=f"/internal/xiaomai/companion/sessions/{session_id}/replay"
        )

    def _parse_companion_turn(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> CompanionTurnSnapshot:
        try:
            return companion_turn_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    def _parse_session_replay(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> SessionReplaySnapshot:
        try:
            return session_replay_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

