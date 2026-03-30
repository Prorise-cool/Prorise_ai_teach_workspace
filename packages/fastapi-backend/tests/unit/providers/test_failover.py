import asyncio

import pytest

from app.infra.redis_client import RuntimeStore
from app.providers.failover import (
    ProviderAllFailedError,
    ProviderSwitch,
    ProviderTerminalError,
    classify_provider_error,
)
from app.providers.factory import ProviderFactory
from app.shared.task_framework.key_builder import (
    PROVIDER_HEALTH_TTL_SECONDS,
    build_provider_health_key,
)
from app.providers.protocols import (
    ProviderCapability,
    ProviderResult,
    ProviderRuntimeConfig,
    ProviderError,
)
from app.providers.registry import ProviderRegistry


class PrimaryLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        return ProviderResult(provider=self.provider_id, content=f"primary:{prompt}")


class TimeoutLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        raise TimeoutError(f"{self.provider_id} timed out while handling {prompt}")


class BackupLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        return ProviderResult(provider=self.provider_id, content=f"backup:{prompt}")


class BrokenLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        raise ConnectionError(f"{self.provider_id} unavailable for {prompt}")


class InvalidInputLLMProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        raise ValueError(f"invalid prompt payload: {prompt}")


class TimeController:
    def __init__(self) -> None:
        self.current = 5_000.0

    def now(self) -> float:
        return self.current

    def advance(self, seconds: float) -> None:
        self.current += seconds


def _build_factory() -> ProviderFactory:
    registry = ProviderRegistry()
    registry.register(ProviderCapability.LLM, "primary-chat", PrimaryLLMProvider, default_priority=1)
    registry.register(ProviderCapability.LLM, "timeout-chat", TimeoutLLMProvider, default_priority=1)
    registry.register(ProviderCapability.LLM, "backup-chat", BackupLLMProvider, default_priority=10)
    registry.register(ProviderCapability.LLM, "broken-chat", BrokenLLMProvider, default_priority=20)
    registry.register(ProviderCapability.LLM, "invalid-chat", InvalidInputLLMProvider, default_priority=5)
    return ProviderFactory(registry)


def test_failover_prefers_primary_when_provider_is_healthy() -> None:
    factory = _build_factory()
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")

    result = asyncio.run(
        factory.generate_with_failover(
            [{"provider": "primary-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
            "lesson",
            runtime_store=runtime_store,
        )
    )

    assert result.provider == "primary-chat"
    assert runtime_store.get_provider_health("primary-chat")["isHealthy"] is True
    assert runtime_store.get_provider_health("backup-chat") is None
    assert 0 < runtime_store.ttl(build_provider_health_key("primary-chat")) <= PROVIDER_HEALTH_TTL_SECONDS


def test_failover_switches_to_backup_and_emits_provider_switch_event() -> None:
    factory = _build_factory()
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    switches: list[ProviderSwitch] = []

    result = asyncio.run(
        factory.generate_with_failover(
            [{"provider": "timeout-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
            "lesson",
            runtime_store=runtime_store,
            emit_switch=switches.append,
        )
    )

    assert result.provider == "backup-chat"
    assert len(switches) == 1
    assert switches[0].from_provider == "timeout-chat"
    assert switches[0].to_provider == "backup-chat"
    assert switches[0].error_code.value == "TASK_PROVIDER_TIMEOUT"

    event = switches[0].to_sse_event(
        task_id="video_20260330190000_ab12cd34",
        task_type="video",
        status="processing",
        progress=70,
        message="主 Provider 不可用，已切换备用 Provider",
        request_id="req_provider_switch_001",
    )
    assert event.event == "provider_switch"
    assert event.from_ == "timeout-chat"
    assert event.to == "backup-chat"
    assert runtime_store.get_provider_health("timeout-chat")["metadata"]["errorCode"] == "TASK_PROVIDER_TIMEOUT"
    assert runtime_store.get_provider_health("backup-chat")["isHealthy"] is True


def test_failover_skips_cached_unhealthy_provider_until_ttl_expires() -> None:
    factory = _build_factory()
    clock = TimeController()
    original_now = RuntimeStore._now
    RuntimeStore._now = staticmethod(clock.now)
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    failover_service = factory.create_failover_service(runtime_store)
    failover_service._health_store.mark_failure(
        "primary-chat",
        reason="cached-unhealthy",
        error_code="TASK_PROVIDER_UNAVAILABLE",
        source="test",
    )
    switches: list[ProviderSwitch] = []

    try:
        first_result = asyncio.run(
            factory.generate_with_failover(
                [{"provider": "primary-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
                "lesson",
                runtime_store=runtime_store,
                emit_switch=switches.append,
            )
        )

        assert first_result.provider == "backup-chat"
        assert switches[0].reason == "cached-unhealthy"

        clock.advance(61)
        second_result = asyncio.run(
            factory.generate_with_failover(
                [{"provider": "primary-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
                "lesson",
                runtime_store=runtime_store,
            )
        )

        assert second_result.provider == "primary-chat"
    finally:
        RuntimeStore._now = staticmethod(original_now)


def test_failover_raises_provider_all_failed_when_chain_cannot_recover() -> None:
    factory = _build_factory()
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")

    with pytest.raises(ProviderAllFailedError) as exc_info:
        asyncio.run(
            factory.generate_with_failover(
                [{"provider": "timeout-chat", "priority": 1}, {"provider": "broken-chat", "priority": 2}],
                "lesson",
                runtime_store=runtime_store,
            )
        )

    assert exc_info.value.error_code.value == "TASK_PROVIDER_ALL_FAILED"
    assert [failure.provider_id for failure in exc_info.value.failures] == [
        "timeout-chat",
        "broken-chat",
    ]


def test_failover_stops_chain_for_non_retryable_invalid_input() -> None:
    class CountingBackupProvider:
        calls = 0

        def __init__(self, config: ProviderRuntimeConfig) -> None:
            self.config = config
            self.provider_id = config.provider_id

        async def generate(self, prompt: str) -> ProviderResult:
            CountingBackupProvider.calls += 1
            return ProviderResult(provider=self.provider_id, content=f"backup:{prompt}")

    registry = ProviderRegistry()
    registry.register(ProviderCapability.LLM, "invalid-chat", InvalidInputLLMProvider, default_priority=1)
    registry.register(ProviderCapability.LLM, "backup-chat", CountingBackupProvider, default_priority=2)
    factory = ProviderFactory(registry)
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    switches: list[ProviderSwitch] = []

    with pytest.raises(ProviderTerminalError) as exc_info:
        asyncio.run(
            factory.generate_with_failover(
                [{"provider": "invalid-chat", "priority": 1}, {"provider": "backup-chat", "priority": 2}],
                "lesson",
                runtime_store=runtime_store,
                emit_switch=switches.append,
            )
        )

    assert exc_info.value.error_code.value == "TASK_INVALID_INPUT"
    assert switches == []
    assert CountingBackupProvider.calls == 0
    assert runtime_store.get_provider_health("invalid-chat") is None
    assert runtime_store.get_provider_health("backup-chat") is None


def test_classify_provider_error_marks_authentication_failures_as_non_retryable() -> None:
    classification = classify_provider_error(ProviderError("unauthorized: invalid api key"))

    assert classification.error_code.value == "TASK_INVALID_INPUT"
    assert classification.retryable is False
    assert classification.mark_unhealthy is False


def test_failover_does_not_reprobe_last_cached_unhealthy_provider_until_ttl_expires() -> None:
    class CountingBrokenLLMProvider:
        calls = 0

        def __init__(self, config: ProviderRuntimeConfig) -> None:
            self.config = config
            self.provider_id = config.provider_id

        async def generate(self, prompt: str) -> ProviderResult:
            CountingBrokenLLMProvider.calls += 1
            raise ConnectionError(f"{self.provider_id} unavailable for {prompt}")

    registry = ProviderRegistry()
    registry.register(
        ProviderCapability.LLM,
        "counting-chat",
        CountingBrokenLLMProvider,
        default_priority=1,
    )
    factory = ProviderFactory(registry)
    clock = TimeController()
    original_now = RuntimeStore._now
    RuntimeStore._now = staticmethod(clock.now)
    runtime_store = RuntimeStore(backend="memory-runtime-store", redis_url="redis://memory")
    failover_service = factory.create_failover_service(runtime_store)
    failover_service._health_store.mark_failure(
        "counting-chat",
        reason="cached-unhealthy",
        error_code="TASK_PROVIDER_UNAVAILABLE",
        source="test",
    )

    try:
        with pytest.raises(ProviderAllFailedError) as first_error:
            asyncio.run(
                factory.generate_with_failover(
                    [{"provider": "counting-chat", "priority": 1}],
                    "lesson",
                    runtime_store=runtime_store,
                )
            )
        with pytest.raises(ProviderAllFailedError):
            asyncio.run(
                factory.generate_with_failover(
                    [{"provider": "counting-chat", "priority": 1}],
                    "lesson",
                    runtime_store=runtime_store,
                )
            )

        assert CountingBrokenLLMProvider.calls == 0
        assert first_error.value.failures[0].reason == "cached-unhealthy"

        clock.advance(61)

        with pytest.raises(ProviderAllFailedError):
            asyncio.run(
                factory.generate_with_failover(
                    [{"provider": "counting-chat", "priority": 1}],
                    "lesson",
                    runtime_store=runtime_store,
                )
            )

        assert CountingBrokenLLMProvider.calls == 1
    finally:
        RuntimeStore._now = staticmethod(original_now)
