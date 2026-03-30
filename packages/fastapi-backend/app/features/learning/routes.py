from fastapi import APIRouter

from app.features.learning.schemas import LearningPersistenceRequest, LearningPersistenceResponse
from app.features.learning.service import LearningService

router = APIRouter(prefix="/learning", tags=["learning"])
service = LearningService()


@router.get("/bootstrap")
async def learning_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()


@router.post("/persistence-preview", response_model=LearningPersistenceResponse)
async def learning_persistence_preview(
    request: LearningPersistenceRequest
) -> LearningPersistenceResponse:
    return await service.prepare_persistence_preview(request)


@router.post("/persistence", response_model=LearningPersistenceResponse)
async def learning_persistence(
    request: LearningPersistenceRequest
) -> LearningPersistenceResponse:
    return await service.persist_results(request)
