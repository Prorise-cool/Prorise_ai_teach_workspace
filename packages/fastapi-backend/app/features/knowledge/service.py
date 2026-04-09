"""知识检索业务服务。"""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.knowledge.schemas import KnowledgeBootstrapResponse
from app.shared.long_term_records import (
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    knowledge_chat_from_ruoyi_data,
    knowledge_chat_to_ruoyi_payload,
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin

if TYPE_CHECKING:
    from app.core.security import AccessContext


class KnowledgeService(RuoYiServiceMixin):
    """知识检索业务服务，与 RuoYi 持久化交互。"""
    _RESOURCE = "knowledge-chat"

    def __init__(self, client_factory=None) -> None:
        """初始化知识检索服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> KnowledgeBootstrapResponse:
        """返回知识检索功能域 bootstrap 状态。"""
        return KnowledgeBootstrapResponse()

    async def persist_chat_log(
        self,
        request: KnowledgeChatCreateRequest,
        *,
        access_context: "AccessContext | None" = None,
    ) -> KnowledgeChatSnapshot:
        """持久化对话记录到 RuoYi。

        Args:
            request: 对话记录创建请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        async with self._resolve_authenticated_factory(access_context)() as client:
            result = await client.post_single(
                "/internal/xiaomai/knowledge/chat-logs",
                resource=self._RESOURCE,
                operation="persist",
                json_body=knowledge_chat_to_ruoyi_payload(request)
            )
        return self._parse_chat_log(result.data, operation="persist", endpoint="/internal/xiaomai/knowledge/chat-logs")

    async def get_chat_log(
        self,
        chat_log_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> KnowledgeChatSnapshot | None:
        """按 ID 查询对话记录。

        Args:
            chat_log_id: 对话记录唯一标识。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        try:
            async with self._resolve_authenticated_factory(access_context)() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/knowledge/chat-logs/{chat_log_id}",
                    resource=self._RESOURCE,
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return self._parse_chat_log(
            result.data,
            operation="get",
            endpoint=f"/internal/xiaomai/knowledge/chat-logs/{chat_log_id}"
        )

    def _parse_chat_log(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> KnowledgeChatSnapshot:
        try:
            return knowledge_chat_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc
