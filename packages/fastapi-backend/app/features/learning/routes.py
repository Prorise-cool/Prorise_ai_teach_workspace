"""学习功能域路由模块。"""

from functools import lru_cache

from fastapi import APIRouter, Depends

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningPersistenceResponse
)
from app.features.learning.service import LearningService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/learning", tags=["learning"])


@lru_cache
def get_learning_service() -> LearningService:
    """获取缓存的学习服务单例。"""
    return LearningService()


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
async def learning_bootstrap(
    service: LearningService = Depends(get_learning_service),
) -> dict[str, object]:
    """返回学习功能域 bootstrap 基线。"""
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/persistence-preview", response_model=LearningPersistenceResponse)
async def learning_persistence_preview(
    request: LearningPersistenceRequest,
    service: LearningService = Depends(get_learning_service),
) -> LearningPersistenceResponse:
    """预览学习结果的持久化映射。"""
    return await service.prepare_persistence_preview(request)


@router.post("/persistence", response_model=LearningPersistenceResponse)
async def learning_persistence(
    request: LearningPersistenceRequest,
    service: LearningService = Depends(get_learning_service),
) -> LearningPersistenceResponse:
    """提交学习结果并持久化到 RuoYi。"""
    return await service.persist_results(request)
