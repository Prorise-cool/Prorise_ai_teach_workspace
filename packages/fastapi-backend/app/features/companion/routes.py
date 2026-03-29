from fastapi import APIRouter

from app.features.companion.service import CompanionService

router = APIRouter(prefix="/companion", tags=["companion"])
service = CompanionService()


@router.get("/bootstrap")
async def companion_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()
