from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from inspect import isawaitable
from types import MappingProxyType
from typing import Any, Awaitable, Callable, Generic, Mapping, Sequence, TypeVar

from app.core.sse import TaskProgressEvent
from app.providers.health import ProviderHealthStore
from app.providers.protocols import (
    LLMProvider,
    ProviderError,
    ProviderResult,
    TTSProvider,
)
from app.shared.task_framework.status import TaskErrorCode

ProviderT = TypeVar("ProviderT", LLMProvider, TTSProvider)
ProviderCall = Callable[[ProviderT], Awaitable[ProviderResult]]
SwitchObserver = Callable[["ProviderSwitch"], Any]

RETRYABLE_ERROR_CODES = {
    TaskErrorCode.PROVIDER_TIMEOUT,
    TaskErrorCode.PROVIDER_UNAVAILABLE,
}


@dataclass(slots=True, frozen=True)
class ProviderAttemptFailure:
    provider_id: str
    error_code: TaskErrorCode
    reason: str


@dataclass(slots=True, frozen=True)
class ProviderSwitch:
    from_provider: str
    to_provider: str
    reason: str
    error_code: TaskErrorCode
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "metadata", MappingProxyType(dict(self.metadata)))

    def to_sse_event(
        self,
        *,
        task_id: str,
        task_type: str,
        status: str,
        progress: int,
        message: str,
        request_id: str | None,
    ) -> TaskProgressEvent:
        return TaskProgressEvent(
            event="provider_switch",
            task_id=task_id,
            task_type=task_type,
            status=status,
            progress=progress,
            message=message,
            request_id=request_id,
            error_code=self.error_code,
            from_=self.from_provider,
            to=self.to_provider,
            reason=self.reason,
            context=dict(self.metadata),
        )


class ProviderAllFailedError(ProviderError):
    def __init__(self, failures: Sequence[ProviderAttemptFailure]) -> None:
        self.failures = tuple(failures)
        message = "全部 Provider 均不可用"
        if self.failures:
            message = f"{message}：{self.failures[-1].reason}"
        super().__init__(message)

    @property
    def error_code(self) -> TaskErrorCode:
        return TaskErrorCode.PROVIDER_ALL_FAILED


class ProviderFailoverService:
    def __init__(self, health_store: ProviderHealthStore) -> None:
        self._health_store = health_store

    async def generate(
        self,
        providers: Sequence[LLMProvider],
        prompt: str,
        *,
        emit_switch: SwitchObserver | None = None,
    ) -> ProviderResult:
        return await self._run(
            providers,
            lambda provider: provider.generate(prompt),
            emit_switch=emit_switch,
        )

    async def synthesize(
        self,
        providers: Sequence[TTSProvider],
        text: str,
        *,
        emit_switch: SwitchObserver | None = None,
    ) -> ProviderResult:
        return await self._run(
            providers,
            lambda provider: provider.synthesize(text),
            emit_switch=emit_switch,
        )

    async def _run(
        self,
        providers: Sequence[ProviderT],
        operation: ProviderCall[ProviderT],
        *,
        emit_switch: SwitchObserver | None,
    ) -> ProviderResult:
        provider_chain = tuple(providers)
        if not provider_chain:
            raise ProviderAllFailedError(())

        failures: list[ProviderAttemptFailure] = []
        for index, provider in enumerate(provider_chain):
            cached = self._health_store.get(provider.provider_id)
            if cached is not None and not cached.is_healthy and index < len(provider_chain) - 1:
                switch = ProviderSwitch(
                    from_provider=provider.provider_id,
                    to_provider=provider_chain[index + 1].provider_id,
                    reason=cached.reason or "cached-unhealthy",
                    error_code=TaskErrorCode(cached.error_code or TaskErrorCode.PROVIDER_UNAVAILABLE),
                    metadata={"source": "health-cache"},
                )
                failures.append(
                    ProviderAttemptFailure(
                        provider_id=provider.provider_id,
                        error_code=switch.error_code,
                        reason=switch.reason,
                    )
                )
                await self._emit_switch(emit_switch, switch)
                continue

            attempts = max(provider.config.retry_attempts + 1, 1)
            for attempt_index in range(attempts):
                try:
                    result = await asyncio.wait_for(
                        operation(provider),
                        timeout=provider.config.timeout_seconds,
                    )
                except Exception as exc:  # pragma: no cover - covered by tests through classify
                    error_code, reason = classify_provider_error(exc)
                    self._health_store.mark_failure(
                        provider.provider_id,
                        reason=reason,
                        error_code=error_code,
                        source="provider-call",
                    )
                    retryable = error_code in RETRYABLE_ERROR_CODES
                    failures.append(
                        ProviderAttemptFailure(
                            provider_id=provider.provider_id,
                            error_code=error_code,
                            reason=reason,
                        )
                    )
                    if retryable and attempt_index < attempts - 1:
                        continue
                    if retryable and index < len(provider_chain) - 1:
                        switch = ProviderSwitch(
                            from_provider=provider.provider_id,
                            to_provider=provider_chain[index + 1].provider_id,
                            reason=reason,
                            error_code=error_code,
                            metadata={"attempt": attempt_index + 1},
                        )
                        await self._emit_switch(emit_switch, switch)
                    break
                else:
                    self._health_store.mark_success(
                        provider.provider_id,
                        source="provider-call",
                    )
                    return result

        raise ProviderAllFailedError(failures)

    @staticmethod
    async def _emit_switch(
        emit_switch: SwitchObserver | None,
        switch: ProviderSwitch,
    ) -> None:
        if emit_switch is None:
            return
        maybe_result = emit_switch(switch)
        if isawaitable(maybe_result):
            await maybe_result


def classify_provider_error(exc: Exception) -> tuple[TaskErrorCode, str]:
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()
    if isinstance(exc, TimeoutError):
        return TaskErrorCode.PROVIDER_TIMEOUT, message
    if isinstance(exc, ConnectionError):
        return TaskErrorCode.PROVIDER_UNAVAILABLE, message
    if "rate limit" in lowered or "429" in lowered:
        return TaskErrorCode.PROVIDER_UNAVAILABLE, message
    if isinstance(exc, ProviderAllFailedError):
        return TaskErrorCode.PROVIDER_ALL_FAILED, message
    if isinstance(exc, ProviderError):
        return TaskErrorCode.PROVIDER_UNAVAILABLE, message
    return TaskErrorCode.PROVIDER_UNAVAILABLE, message
