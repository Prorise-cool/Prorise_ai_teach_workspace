from fastapi import APIRouter

from app.features.knowledge.service import KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
service = KnowledgeService()


@router.get("/bootstrap")
async def knowledge_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()
