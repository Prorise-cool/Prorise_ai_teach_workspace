from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.lifespan import create_lifespan


def create_app() -> FastAPI:
    """创建对齐架构分层的 FastAPI 应用实例。"""
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=create_lifespan(),
        docs_url="/docs",
        redoc_url="/redoc"
    )
    application.include_router(api_router)
    register_exception_handlers(application)

    @application.get("/", tags=["system"])
    async def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "environment": settings.environment,
            "status": "bootstrapped",
            "api_prefix": settings.api_v1_prefix,
            "runtime_store": "redis-or-fallback",
            "architecture": "core-infra-providers-features-shared"
        }

    return application


app = create_app()
