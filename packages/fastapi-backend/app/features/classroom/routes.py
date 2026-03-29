from fastapi import APIRouter

from app.features.classroom.service import ClassroomService

router = APIRouter(prefix="/classroom", tags=["classroom"])
service = ClassroomService()


@router.get("/bootstrap")
async def classroom_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()
