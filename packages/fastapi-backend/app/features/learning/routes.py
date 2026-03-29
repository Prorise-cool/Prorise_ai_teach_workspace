from fastapi import APIRouter

from app.features.learning.service import LearningService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/learning", tags=["learning"])
service = LearningService()


@router.get(
    "/bootstrap",
    responses={
        200: {
            "description": "learning 功能骨架状态",
            "content": {"application/json": {"example": build_feature_bootstrap_example("learning")}}
        }
    }
)
async def learning_bootstrap() -> dict[str, object]:
    return build_success_envelope(await service.bootstrap_status())
