from app.features.video.schemas import VideoBootstrapResponse


class VideoService:
    async def bootstrap_status(self) -> VideoBootstrapResponse:
        return VideoBootstrapResponse()
