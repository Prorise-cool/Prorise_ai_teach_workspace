from app.features.companion.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
    LongTermConversationRepository,
    shared_long_term_repository
)
from app.features.companion.schemas import CompanionBootstrapResponse


class CompanionService:
    def __init__(self, repository: LongTermConversationRepository | None = None) -> None:
        self._repository = repository or shared_long_term_repository

    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        return CompanionBootstrapResponse()

    def persist_turn(self, request: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
        return self._repository.save_companion_turn(request)

    def get_turn(self, turn_id: str) -> CompanionTurnSnapshot | None:
        return self._repository.get_companion_turn(turn_id)

    def replay_session(self, session_id: str) -> SessionReplaySnapshot:
        return self._repository.replay_session(session_id)
