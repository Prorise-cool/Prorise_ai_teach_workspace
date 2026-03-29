from app.features.learning.schemas import LearningBootstrapResponse


class LearningService:
    async def bootstrap_status(self) -> LearningBootstrapResponse:
        return LearningBootstrapResponse()
