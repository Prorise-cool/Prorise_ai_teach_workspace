"""知识检索功能域路由模块。"""

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AccessContext, get_access_context
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.knowledge.service import KnowledgeService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.long_term_records import KnowledgeChatCreateRequest, KnowledgeChatSnapshot

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@lru_cache
def get_knowledge_service() -> KnowledgeService:
    """获取缓存的知识检索服务单例。"""
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
    """返回知识检索功能域 bootstrap 基线。"""
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/chat-logs", response_model=KnowledgeChatSnapshot)
async def create_knowledge_chat_log(
    payload: KnowledgeChatCreateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeChatSnapshot:
    """创建知识检索对话记录。"""
    return await service.persist_chat_log(payload, access_context=access_context)


@router.get("/chat-logs/{chat_log_id}", response_model=KnowledgeChatSnapshot)
async def get_knowledge_chat_log(
    chat_log_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeChatSnapshot:
    """按 ID 查询知识检索对话记录。"""
    snapshot = await service.get_chat_log(chat_log_id, access_context=access_context)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Knowledge chat log not found")
    return snapshot
