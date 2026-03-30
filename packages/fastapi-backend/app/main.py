from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.lifespan import create_lifespan
from app.core.logging import configure_logging
from app.core.middleware.request_context import RequestContextMiddleware
from app.schemas.common import RootBootstrapPayload, RootBootstrapResponseEnvelope, build_success_envelope
from app.schemas.examples import ROOT_BOOTSTRAP_EXAMPLE


def create_app() -> FastAPI:
    """创建对齐架构分层的 FastAPI 应用实例。"""
    configure_logging()
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=create_lifespan(),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_tags=[
            {"name": "health", "description": "服务健康检查与最小运行态。"},
            {"name": "contracts", "description": "契约输出基线，包含共享响应、任务快照与分页示例。"},
            {"name": "tasks", "description": "统一任务恢复、状态查询与事件补发。"},
            {"name": "video", "description": "视频功能域骨架。"},
            {"name": "classroom", "description": "课堂功能域骨架。"},
            {"name": "companion", "description": "伴学功能域骨架。"},
            {"name": "knowledge", "description": "知识检索功能域骨架。"},
            {"name": "learning", "description": "学习教练功能域骨架。"}
        ]
    )
    application.add_middleware(RequestContextMiddleware)
    application.include_router(api_router)
    register_exception_handlers(application)

    @application.get(
        "/",
        tags=["system"],
        response_model=RootBootstrapResponseEnvelope,
        responses={
            200: {
                "description": "系统启动基线",
                "content": {"application/json": {"example": ROOT_BOOTSTRAP_EXAMPLE}}
            }
        }
    )
    async def root() -> dict[str, object]:
        payload = RootBootstrapPayload(
            service=settings.app_name,
            environment=settings.environment,
            status="bootstrapped",
            api_prefix=settings.api_v1_prefix,
            runtime_store="redis-or-fallback",
            architecture="core-infra-providers-features-shared",
            contract_version="1.0.0",
            docs_url="/docs",
            openapi_url="/openapi.json"
        )
        return build_success_envelope(payload)

    return application


app = create_app()
