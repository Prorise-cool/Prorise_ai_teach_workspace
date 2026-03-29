from app.features.companion.schemas import CompanionBootstrapResponse


class CompanionService:
    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        return CompanionBootstrapResponse()
