"""Provider Failover 服务与错误分类。"""
from __future__ import annotations


import asyncio
from dataclasses import dataclass, field
from inspect import isawaitable
from types import MappingProxyType
from typing import Any, Awaitable, Callable, Mapping, Sequence, TypeVar

from app.core.sse import TaskProgressEvent
from app.providers.health import ProviderHealthStore
from app.providers.protocols import (
    LLMProvider,
    ProviderConfigurationError,
    ProviderError,
    ProviderNotFoundError,
    ProviderProtocolError,
    ProviderResult,
    TTSProvider,
)
from app.shared.task_framework.status import TaskErrorCode, coerce_task_error_code

ProviderT = TypeVar("ProviderT", LLMProvider, TTSProvider)
ProviderCall = Callable[[ProviderT], Awaitable[ProviderResult]]
SwitchObserver = Callable[["ProviderSwitch"], Any]

RETRYABLE_ERROR_CODES = {
    TaskErrorCode.PROVIDER_TIMEOUT,
    TaskErrorCode.PROVIDER_UNAVAILABLE,
}
AUTHENTICATION_ERROR_MARKERS = (
    "unauthorized",
    "forbidden",
    "authentication failed",
    "invalid api key",
    "invalid_api_key",
    "access denied",
)


@dataclass(slots=True, frozen=True)
class ProviderAttemptFailure:
    """单次 Provider 调用失败记录。"""
    provider_id: str
    error_code: TaskErrorCode
    reason: str


@dataclass(slots=True, frozen=True)
class ProviderErrorClassification:
    """Provider 错误分类结果。"""
    error_code: TaskErrorCode
    reason: str
    retryable: bool
    mark_unhealthy: bool


@dataclass(slots=True, frozen=True)
class ProviderSwitch:
    """Provider 切换事件数据。"""
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
        """将切换事件转为 SSE payload。"""
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
    """所有 Provider 均不可用异常。"""
    def __init__(self, failures: Sequence[ProviderAttemptFailure]) -> None:
        """初始化 Failover 相关对象。"""
        self.failures = tuple(failures)
        message = "全部 Provider 均不可用"
        if self.failures:
            message = f"{message}：{self.failures[-1].reason}"
        super().__init__(message)

    @property
    def error_code(self) -> TaskErrorCode:
        """最终聚合的错误码。"""
        return TaskErrorCode.PROVIDER_ALL_FAILED


class ProviderTerminalError(ProviderError):
    """不可重试的 Provider 终端异常。"""
    def __init__(self, message: str, *, error_code: TaskErrorCode) -> None:
        """初始化 Failover 相关对象。"""
        super().__init__(message)
        self._error_code = error_code

    @property
    def error_code(self) -> TaskErrorCode:
        """最终聚合的错误码。"""
        return self._error_code


class ProviderFailoverService:
    """Provider Failover 编排服务。"""
    def __init__(self, health_store: ProviderHealthStore) -> None:
        """初始化 Failover 相关对象。"""
        self._health_store = health_store

    async def generate(
        self,
        providers: Sequence[LLMProvider],
        prompt: str,
        *,
        emit_switch: SwitchObserver | None = None,
    ) -> ProviderResult:
        """带 Failover 的 LLM 文本生成调用。"""
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
        voice_config: Any | None = None,
        emit_switch: SwitchObserver | None = None,
    ) -> ProviderResult:
        """带 Failover 的 TTS 语音合成调用。"""
        return await self._run(
            providers,
            lambda provider: provider.synthesize(text, voice_config=voice_config),
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
            if cached is not None and not cached.is_healthy:
                error_code = coerce_task_error_code(
                    cached.error_code,
                    fallback=TaskErrorCode.PROVIDER_UNAVAILABLE
                )
                if error_code in RETRYABLE_ERROR_CODES:
                    reason = cached.reason or "cached-unhealthy"
                    failures.append(
                        ProviderAttemptFailure(
                            provider_id=provider.provider_id,
                            error_code=error_code,
                            reason=reason,
                        )
                    )

                    if index < len(provider_chain) - 1:
                        switch = ProviderSwitch(
                            from_provider=provider.provider_id,
                            to_provider=provider_chain[index + 1].provider_id,
                            reason=reason,
                            error_code=error_code,
                            metadata={"source": "health-cache"},
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
                    classification = classify_provider_error(exc)
                    if classification.mark_unhealthy:
                        self._health_store.mark_failure(
                            provider.provider_id,
                            reason=classification.reason,
                            error_code=classification.error_code,
                            source="provider-call",
                        )
                    failures.append(
                        ProviderAttemptFailure(
                            provider_id=provider.provider_id,
                            error_code=classification.error_code,
                            reason=classification.reason,
                        )
                    )
                    if classification.retryable and attempt_index < attempts - 1:
                        continue
                    if classification.retryable and index < len(provider_chain) - 1:
                        switch = ProviderSwitch(
                            from_provider=provider.provider_id,
                            to_provider=provider_chain[index + 1].provider_id,
                            reason=classification.reason,
                            error_code=classification.error_code,
                            metadata={"attempt": attempt_index + 1},
                        )
                        await self._emit_switch(emit_switch, switch)
                    if not classification.retryable:
                        raise ProviderTerminalError(
                            classification.reason,
                            error_code=classification.error_code,
                        ) from exc
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


def classify_provider_error(exc: Exception) -> ProviderErrorClassification:
    """将异常分类为标准化的 Provider 错误类型。"""
    message = str(exc).strip() or exc.__class__.__name__
    lowered = message.lower()
    if isinstance(exc, TimeoutError):
        return ProviderErrorClassification(
            error_code=TaskErrorCode.PROVIDER_TIMEOUT,
            reason=message,
            retryable=True,
            mark_unhealthy=True,
        )
    if isinstance(exc, ConnectionError):
        return ProviderErrorClassification(
            error_code=TaskErrorCode.PROVIDER_UNAVAILABLE,
            reason=message,
            retryable=True,
            mark_unhealthy=True,
        )
    if "rate limit" in lowered or "429" in lowered:
        return ProviderErrorClassification(
            error_code=TaskErrorCode.PROVIDER_UNAVAILABLE,
            reason=message,
            retryable=True,
            mark_unhealthy=True,
        )
    if isinstance(exc, ProviderAllFailedError):
        return ProviderErrorClassification(
            error_code=TaskErrorCode.PROVIDER_ALL_FAILED,
            reason=message,
            retryable=False,
            mark_unhealthy=False,
        )
    if isinstance(
        exc,
        (
            ProviderConfigurationError,
            ProviderNotFoundError,
            ProviderProtocolError,
            ValueError,
        ),
    ) or any(marker in lowered for marker in AUTHENTICATION_ERROR_MARKERS):
        return ProviderErrorClassification(
            error_code=TaskErrorCode.INVALID_INPUT,
            reason=message,
            retryable=False,
            mark_unhealthy=False,
        )
    if isinstance(exc, ProviderError):
        return ProviderErrorClassification(
            error_code=coerce_task_error_code(
                getattr(exc, "error_code", None),
                fallback=TaskErrorCode.UNHANDLED_EXCEPTION
            ),
            reason=message,
            retryable=False,
            mark_unhealthy=False,
        )
    return ProviderErrorClassification(
        error_code=TaskErrorCode.UNHANDLED_EXCEPTION,
        reason=message,
        retryable=False,
        mark_unhealthy=False,
    )
