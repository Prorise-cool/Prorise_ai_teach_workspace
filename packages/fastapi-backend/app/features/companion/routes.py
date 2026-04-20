"""伴学功能域路由模块。"""

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AccessContext, get_access_context
from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.companion.schemas import AskRequest, AskResponse
from app.features.companion.service import CompanionAskService, CompanionService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example
from app.shared.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
)

router = APIRouter(prefix="/companion", tags=["companion"])


@lru_cache
def get_companion_service() -> CompanionService:
    """获取缓存的伴学服务单例。"""
    return CompanionService()


def _build_ask_service() -> CompanionAskService:
    """构建注入真实依赖的 Ask 服务。"""
    from app.features.companion.context_adapter.video_adapter import VideoContextAdapter
    from app.features.companion.context_window import ContextWindow
    from app.features.video.pipeline.orchestration.assets import LocalAssetStore
    from app.infra.redis_client import create_runtime_store
    from app.providers.factory import get_provider_factory
    from app.worker import get_runtime_store

    runtime_store = get_runtime_store()
    asset_store = LocalAssetStore.from_settings()
    context_window = ContextWindow(runtime_store)
    context_adapter_factory = lambda: VideoContextAdapter(
        runtime_store=runtime_store,
        asset_store=asset_store,
    )
    return CompanionAskService(
        context_adapter_factory=context_adapter_factory,
        context_window=context_window,
        provider_factory=get_provider_factory(),
        companion_service_factory=CompanionService,
    )


@lru_cache
def get_ask_service() -> CompanionAskService:
    """获取缓存的 Ask 服务单例。"""
    return _build_ask_service()


@router.get(
    "/bootstrap",
)
async def companion_bootstrap(
    task_id: str = "",
    service: CompanionService = Depends(get_companion_service),
) -> dict[str, object]:
    """返回伴学功能域 bootstrap 基线。"""
    payload = await service.bootstrap_status(task_id=task_id)
    return build_success_envelope(payload)


@router.post("/ask")
async def ask_companion(
    request: AskRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: CompanionAskService = Depends(get_ask_service),
) -> dict[str, object]:
    """围绕当前视频时间点提问并获得上下文相关的回答。"""
    response = await service.ask(request, access_context=access_context)
    return build_success_envelope(response)


@router.post("/turns", response_model=CompanionTurnSnapshot)
async def create_companion_turn(
    payload: CompanionTurnCreateRequest,
    access_context: AccessContext = Depends(get_access_context),
    service: CompanionService = Depends(get_companion_service),
) -> CompanionTurnSnapshot:
    """创建伴学对话轮次记录。"""
    return await service.persist_turn(payload, access_context=access_context)


@router.get("/turns/{turn_id}", response_model=CompanionTurnSnapshot)
async def get_companion_turn(
    turn_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: CompanionService = Depends(get_companion_service),
) -> CompanionTurnSnapshot:
    """按 ID 查询单条伴学轮次。"""
    snapshot = await service.get_turn(turn_id, access_context=access_context)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Companion turn not found")
    return snapshot


@router.get("/sessions/{session_id}/replay", response_model=SessionReplaySnapshot)
async def replay_companion_session(
    session_id: str,
    access_context: AccessContext = Depends(get_access_context),
    service: CompanionService = Depends(get_companion_service),
) -> SessionReplaySnapshot:
    """回放指定会话的伴学对话。"""
    return await service.replay_session(session_id, access_context=access_context)
