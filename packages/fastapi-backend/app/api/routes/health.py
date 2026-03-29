from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    """提供 Story 0.1 的最小健康检查。"""
    return {"status": "ok"}
