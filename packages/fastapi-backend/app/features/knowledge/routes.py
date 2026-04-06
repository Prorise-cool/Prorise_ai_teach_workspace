from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.knowledge.service import KnowledgeService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.long_term_records import KnowledgeChatCreateRequest, KnowledgeChatSnapshot

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@lru_cache
def get_knowledge_service() -> KnowledgeService:
    return KnowledgeService()


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "知识检索功能域 bootstrap 基线",
            "content": {"application/json": {"example": build_feature_bootstrap_example("knowledge")}}
        }
    }
)
async def knowledge_bootstrap(
    service: KnowledgeService = Depends(get_knowledge_service),
) -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/chat-logs", response_model=KnowledgeChatSnapshot)
async def create_knowledge_chat_log(
    payload: KnowledgeChatCreateRequest,
    service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeChatSnapshot:
    return await service.persist_chat_log(payload)


@router.get("/chat-logs/{chat_log_id}", response_model=KnowledgeChatSnapshot)
async def get_knowledge_chat_log(
    chat_log_id: str,
    service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeChatSnapshot:
    snapshot = await service.get_chat_log(chat_log_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Knowledge chat log not found")
    return snapshot
