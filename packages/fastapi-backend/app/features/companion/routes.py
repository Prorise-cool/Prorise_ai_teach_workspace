from fastapi import APIRouter

from app.features.companion.service import CompanionService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/companion", tags=["companion"])
service = CompanionService()


@router.get(
    "/bootstrap",
    responses={
        200: {
            "description": "companion 功能骨架状态",
            "content": {"application/json": {"example": build_feature_bootstrap_example("companion")}}
        }
    }
)
async def companion_bootstrap() -> dict[str, object]:
    return build_success_envelope(await service.bootstrap_status())
