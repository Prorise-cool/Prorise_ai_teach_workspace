from pydantic import ValidationError

from app.core.errors import IntegrationError
from app.features.companion.long_term_records import (
    CompanionTurnCreateRequest,
    CompanionTurnSnapshot,
    SessionReplaySnapshot,
    companion_turn_from_ruoyi_data,
    companion_turn_to_ruoyi_payload,
    session_replay_from_ruoyi_data,
)
from app.features.companion.schemas import CompanionBootstrapResponse
from app.shared.ruoyi_client import RuoYiClient


class CompanionService:
    _RESOURCE = "companion-turn"

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> CompanionBootstrapResponse:
        return CompanionBootstrapResponse()

    async def persist_turn(self, request: CompanionTurnCreateRequest) -> CompanionTurnSnapshot:
        async with self._client_factory() as client:
            result = await client.post_single(
                "/internal/xiaomai/companion/turns",
                resource=self._RESOURCE,
                operation="persist",
                json_body=companion_turn_to_ruoyi_payload(request)
            )
        return self._parse_companion_turn(result.data, operation="persist", endpoint="/internal/xiaomai/companion/turns")

    async def get_turn(self, turn_id: str) -> CompanionTurnSnapshot | None:
        try:
            async with self._client_factory() as client:
                result = await client.get_single(
                    f"/internal/xiaomai/companion/turns/{turn_id}",
                    resource=self._RESOURCE,
                    operation="get"
                )
        except IntegrationError as exc:
            if exc.code == "RUOYI_NOT_FOUND":
                return None
            raise
        return self._parse_companion_turn(
            result.data,
            operation="get",
            endpoint=f"/internal/xiaomai/companion/turns/{turn_id}"
        )

    async def replay_session(self, session_id: str) -> SessionReplaySnapshot:
        async with self._client_factory() as client:
            result = await client.get_single(
                f"/internal/xiaomai/companion/sessions/{session_id}/replay",
                resource=self._RESOURCE,
                operation="replay"
            )
        return self._parse_session_replay(
            result.data,
            operation="replay",
            endpoint=f"/internal/xiaomai/companion/sessions/{session_id}/replay"
        )

    def _parse_companion_turn(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> CompanionTurnSnapshot:
        try:
            return companion_turn_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    def _parse_session_replay(
        self,
        payload: dict[str, object],
        *,
        operation: str,
        endpoint: str
    ) -> SessionReplaySnapshot:
        try:
            return session_replay_from_ruoyi_data(payload)
        except (KeyError, TypeError, ValueError, ValidationError) as exc:
            raise self._invalid_response_error(operation=operation, endpoint=endpoint, reason=str(exc)) from exc

    def _invalid_response_error(self, *, operation: str, endpoint: str, reason: str) -> IntegrationError:
        return IntegrationError(
            service="ruoyi",
            resource=self._RESOURCE,
            operation=operation,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details={"endpoint": endpoint, "reason": reason}
        )
