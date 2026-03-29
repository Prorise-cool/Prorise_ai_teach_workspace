from fastapi import APIRouter, HTTPException

from app.features.companion.long_term_records import KnowledgeChatCreateRequest, KnowledgeChatSnapshot
from app.features.knowledge.service import KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
service = KnowledgeService()


@router.get("/bootstrap")
async def knowledge_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()


@router.post("/chat-logs", response_model=KnowledgeChatSnapshot)
async def create_knowledge_chat_log(payload: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
    return service.persist_chat_log(payload)


@router.get("/chat-logs/{chat_log_id}", response_model=KnowledgeChatSnapshot)
async def get_knowledge_chat_log(chat_log_id: str) -> KnowledgeChatSnapshot:
    snapshot = service.get_chat_log(chat_log_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Knowledge chat log not found")
    return snapshot
