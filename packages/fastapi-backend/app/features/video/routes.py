from fastapi import APIRouter

from app.features.video.service import VideoService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/video", tags=["video"])
service = VideoService()


@router.get(
    "/bootstrap",
    responses={
        200: {
            "description": "video 功能骨架状态",
            "content": {"application/json": {"example": build_feature_bootstrap_example("video")}}
        }
    }
)
async def video_bootstrap() -> dict[str, object]:
    return build_success_envelope(await service.bootstrap_status())
