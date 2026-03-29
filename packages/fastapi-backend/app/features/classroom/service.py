from app.features.classroom.schemas import ClassroomBootstrapResponse


class ClassroomService:
    async def bootstrap_status(self) -> ClassroomBootstrapResponse:
        return ClassroomBootstrapResponse()
