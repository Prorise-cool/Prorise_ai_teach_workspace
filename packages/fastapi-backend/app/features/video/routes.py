from fastapi import APIRouter

from app.features.video.service import VideoService

router = APIRouter(prefix="/video", tags=["video"])
service = VideoService()


@router.get("/bootstrap")
async def video_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()
