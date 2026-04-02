from fastapi import APIRouter, HTTPException

from app.features.common import FeatureBootstrapResponseEnvelope
from app.features.companion.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot
)
from app.features.companion.service import CompanionService
from app.schemas.common import build_success_envelope
from app.schemas.examples import build_feature_bootstrap_example

router = APIRouter(prefix="/companion", tags=["companion"])
service = CompanionService()


@router.get(
    "/bootstrap",
    response_model=FeatureBootstrapResponseEnvelope,
    responses={
        200: {
            "description": "伴学功能域 bootstrap 基线",
            "content": {"application/json": {"example": build_feature_bootstrap_example("companion")}}
        }
    }
)
async def companion_bootstrap() -> dict[str, object]:
    payload = await service.bootstrap_status()
    return build_success_envelope(payload)


@router.post("/turns", response_model=CompanionTurnSnapshot)
async def create_companion_turn(payload: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
    return await service.persist_turn(payload)


@router.get("/turns/{turn_id}", response_model=CompanionTurnSnapshot)
async def get_companion_turn(turn_id: str) -> CompanionTurnSnapshot:
    snapshot = await service.get_turn(turn_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Companion turn not found")
    return snapshot


@router.get("/sessions/{session_id}/replay", response_model=SessionReplaySnapshot)
async def replay_companion_session(session_id: str) -> SessionReplaySnapshot:
    return await service.replay_session(session_id)
