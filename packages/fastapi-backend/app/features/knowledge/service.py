from app.features.companion.long_term_records import (
    KnowledgeChatCreateRequest,
    KnowledgeChatSnapshot,
    LongTermConversationRepository,
    shared_long_term_repository
)
from app.features.knowledge.schemas import KnowledgeBootstrapResponse


class KnowledgeService:
    def __init__(self, repository: LongTermConversationRepository | None = None) -> None:
        self._repository = repository or shared_long_term_repository

    async def bootstrap_status(self) -> KnowledgeBootstrapResponse:
        return KnowledgeBootstrapResponse()

    def persist_chat_log(self, request: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
        return self._repository.save_knowledge_chat(request)

    def get_chat_log(self, chat_log_id: str) -> KnowledgeChatSnapshot | None:
        return self._repository.get_knowledge_chat(chat_log_id)
