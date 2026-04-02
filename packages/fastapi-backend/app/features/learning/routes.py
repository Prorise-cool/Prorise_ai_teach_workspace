from fastapi import APIRouter

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningPersistenceResponse
)
from app.features.learning.service import LearningService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/learning", tags=["learning"])
service = LearningService()


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "学习功能域 bootstrap 基线",
            "content": {"application/json": {"example": build_feature_bootstrap_example("learning")}}
        }
    }
)
async def learning_bootstrap() -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


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
