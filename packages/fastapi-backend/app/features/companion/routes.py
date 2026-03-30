from fastapi import APIRouter, HTTPException

from app.features.companion.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot
)
from app.features.companion.service import CompanionService

router = APIRouter(prefix="/companion", tags=["companion"])
service = CompanionService()


@router.get("/bootstrap")
async def companion_bootstrap() -> dict[str, str]:
    return (await service.bootstrap_status()).model_dump()


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
