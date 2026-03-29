from fastapi import APIRouter

from app.features.knowledge.service import KnowledgeService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
service = KnowledgeService()


@router.get(
    "/bootstrap",
    responses={
        200: {
            "description": "knowledge 功能骨架状态",
            "content": {"application/json": {"example": build_feature_bootstrap_example("knowledge")}}
        }
    }
)
async def knowledge_bootstrap() -> dict[str, object]:
    return build_success_envelope(await service.bootstrap_status())
