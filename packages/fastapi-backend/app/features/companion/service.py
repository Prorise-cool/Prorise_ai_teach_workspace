from app.features.companion.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
    companion_turn_from_ruoyi_data,
    companion_turn_to_ruoyi_payload,
    session_replay_from_ruoyi_data,
)
from app.features.companion.schemas import CompanionBootstrapResponse
from app.core.errors import IntegrationError
from app.shared.ruoyi_client import RuoYiClient


class CompanionService:
    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        return CompanionBootstrapResponse()

    async def persist_turn(self, request: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
        async with self._client_factory() as client:
            result = await client.post_single(
                "/internal/xiaomai/companion/turns",
                resource="companion-turn",
                operation="persist",
                json_body=companion_turn_to_ruoyi_payload(request)
            )
        return companion_turn_from_ruoyi_data(result.data)

    async def get_turn(self, turn_id: str) -> CompanionTurnSnapshot | None:
        try:
            async with self._client_factory() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/companion/turns/{turn_id}",
                    resource="companion-turn",
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return companion_turn_from_ruoyi_data(result.data)

    async def replay_session(self, session_id: str) -> SessionReplaySnapshot:
        async with self._client_factory() as client:
            result = await client.get_single(
                f"/internal/xiaomai/companion/sessions/{session_id}/replay",
                resource="companion-turn",
                operation="replay"
            )
        return session_replay_from_ruoyi_data(result.data or {})
