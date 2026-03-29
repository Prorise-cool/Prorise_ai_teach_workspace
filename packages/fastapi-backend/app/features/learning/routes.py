from fastapi import APIRouter

from app.features.learning.service import LearningService

router = APIRouter(prefix="/learning", tags=["learning"])
service = LearningService()


@router.get("/bootstrap")
async def learning_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()
