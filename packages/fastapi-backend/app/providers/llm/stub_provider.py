"""LLM Stub Provider（测试桩）。"""
from __future__ import annotations


from app.providers.protocols import ProviderResult, ProviderRuntimeConfig


class StubLLMProvider:
    """测试用 LLM Provider，直接回显 prompt。"""
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        """初始化 Stub LLM Provider。"""
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        """返回 stub 前缀拼接 prompt 的结果。"""
        return ProviderResult(
            provider=self.provider_id,
            content=f"stub:{prompt}",
            metadata={
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source,
            },
        )
