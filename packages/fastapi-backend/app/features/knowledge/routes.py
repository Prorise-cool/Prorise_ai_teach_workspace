from fastapi import APIRouter, HTTPException

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.companion.long_term_records import KnowledgeChatCreateRequest, KnowledgeChatSnapshot
from app.features.knowledge.service import KnowledgeService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
service = KnowledgeService()


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
async def knowledge_bootstrap() -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/chat-logs", response_model=KnowledgeChatSnapshot)
async def create_knowledge_chat_log(payload: KnowledgeChatCreateRequest) -> KnowledgeChatSnapshot:
    return await service.persist_chat_log(payload)


@router.get("/chat-logs/{chat_log_id}", response_model=KnowledgeChatSnapshot)
async def get_knowledge_chat_log(chat_log_id: str) -> KnowledgeChatSnapshot:
    snapshot = await service.get_chat_log(chat_log_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Knowledge chat log not found")
    return snapshot
