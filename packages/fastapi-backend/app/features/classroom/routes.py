from fastapi import APIRouter

from app.features.classroom.service import ClassroomService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/classroom", tags=["classroom"])
service = ClassroomService()


@router.get(
    "/bootstrap",
    responses={
        200: {
            "description": "classroom 功能骨架状态",
            "content": {"application/json": {"example": build_feature_bootstrap_example("classroom")}}
        }
    }
)
async def classroom_bootstrap() -> dict[str, object]:
    return build_success_envelope(await service.bootstrap_status())
