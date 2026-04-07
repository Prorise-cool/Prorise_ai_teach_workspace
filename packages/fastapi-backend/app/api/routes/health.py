"""服务健康检查路由。"""

from fastapi import APIRouter

from app.schemas.common import ServiceHealthPayload, ServiceHealthResponseEnvelope, build_success_envelope
from app.schemas.examples import SERVICE_HEALTH_EXAMPLE

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=ServiceHealthResponseEnvelope,
    responses={
        200: {
            "description": "服务健康检查",
            "content": {"application/json": {"example": SERVICE_HEALTH_EXAMPLE}}
        }
    }
)
async def healthcheck() -> dict[str, object]:
    """提供 Story 0.1 的最小健康检查。"""
    return build_success_envelope(ServiceHealthPayload(), msg="ok")
