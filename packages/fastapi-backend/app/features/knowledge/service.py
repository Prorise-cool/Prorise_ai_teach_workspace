from app.features.companion.long_term_records import (
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    knowledge_chat_from_ruoyi_data,
    knowledge_chat_to_ruoyi_payload,
)
from app.features.knowledge.schemas import KnowledgeBootstrapResponse
from app.core.errors import IntegrationError
from app.shared.ruoyi_client import RuoYiClient


class KnowledgeService:
    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> KnowledgeBootstrapResponse:
        return KnowledgeBootstrapResponse()

    async def persist_chat_log(self, request: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
        async with self._client_factory() as client:
            result = await client.post_single(
                "/internal/xiaomai/knowledge/chat-logs",
                resource="knowledge-chat",
                operation="persist",
                json_body=knowledge_chat_to_ruoyi_payload(request)
            )
        return knowledge_chat_from_ruoyi_data(result.data)

    async def get_chat_log(self, chat_log_id: str) -> KnowledgeChatSnapshot | None:
        try:
            async with self._client_factory() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/knowledge/chat-logs/{chat_log_id}",
                    resource="knowledge-chat",
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return knowledge_chat_from_ruoyi_data(result.data)
