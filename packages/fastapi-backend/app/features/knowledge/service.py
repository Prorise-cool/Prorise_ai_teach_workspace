from app.core.errors import IntegrationError
from app.features.knowledge.schemas import KnowledgeBootstrapResponse
from pydantic import ValidationError

from app.shared.long_term_records import (
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    knowledge_chat_from_ruoyi_data,
    knowledge_chat_to_ruoyi_payload,
)
from app.shared.ruoyi_client import RuoYiClient


class KnowledgeService:
    _RESOURCE = "knowledge-chat"

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> KnowledgeBootstrapResponse:
        return KnowledgeBootstrapResponse()

    async def persist_chat_log(self, request: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
        async with self._client_factory() as client:
            result = await client.post_single(
                "/internal/xiaomai/knowledge/chat-logs",
                resource=self._RESOURCE,
                operation="persist",
                json_body=knowledge_chat_to_ruoyi_payload(request)
            )
        return self._parse_chat_log(result.data, operation="persist", endpoint="/internal/xiaomai/knowledge/chat-logs")

    async def get_chat_log(self, chat_log_id: str) -> KnowledgeChatSnapshot | None:
        try:
            async with self._client_factory() as client:
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

    def _invalid_response_error(self, *, operation: str, endpoint: str, reason: str) -> IntegrationError:
        return IntegrationError(
            service="ruoyi",
            resource=self._RESOURCE,
            operation=operation,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details={"endpoint": endpoint, "reason": reason}
        )
