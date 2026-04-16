"""应用入口模块，创建 FastAPI 实例。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import RuntimeEnvironment, get_settings
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
            {"name": "auth", "description": "FastAPI 统一认证代理，负责登录、登出与当前用户会话。"},
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
    if settings.environment in {
        RuntimeEnvironment.DEVELOPMENT,
        RuntimeEnvironment.TEST,
    }:
        # Local E2E pages call FastAPI from file:// or a different dev origin
        # and always trigger browser preflight for Authorization + JSON headers.
        application.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"],
        )
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
        """返回系统启动基线信息。"""
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
