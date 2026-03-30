from __future__ import annotations

from app.providers.protocols import ProviderResult, ProviderRuntimeConfig


class StubTTSProvider:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config
        self.provider_id = config.provider_id

    async def synthesize(self, text: str) -> ProviderResult:
        return ProviderResult(
            provider=self.provider_id,
            content=f"audio:{text}",
            metadata={
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source
            }
        )
