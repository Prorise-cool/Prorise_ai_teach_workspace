"""API 路由注册入口。"""

from fastapi import APIRouter

from app.api.routes.contracts import router as contracts_router
from app.api.routes.health import router as health_router
from app.api.routes.tasks import router as tasks_router
from app.core.config import get_settings
from app.features.classroom.routes import router as classroom_router
from app.features.companion.routes import router as companion_router
from app.features.knowledge.routes import router as knowledge_router
from app.features.learning.routes import router as learning_router
from app.features.video.routes import router as video_router

settings = get_settings()

api_router = APIRouter()
api_router.include_router(health_router)

v1_router = APIRouter(prefix=settings.api_v1_prefix)
v1_router.include_router(contracts_router)
v1_router.include_router(tasks_router)
v1_router.include_router(video_router)
v1_router.include_router(classroom_router)
v1_router.include_router(companion_router)
v1_router.include_router(knowledge_router)
v1_router.include_router(learning_router)

api_router.include_router(v1_router)
