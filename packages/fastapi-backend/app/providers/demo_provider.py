"""演示用 LLM/TTS Provider 实现。"""
from __future__ import annotations


from app.providers.protocols import ProviderResult, ProviderRuntimeConfig


class DemoLLMProvider:
    """最小演示用 LLM Provider。"""

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        """初始化演示 Provider。"""
        self.config = config
        self.provider_id = config.provider_id

    async def generate(self, prompt: str) -> ProviderResult:
        """返回包含 prompt 的演示内容。"""
        content = f"[demo-llm:{self.provider_id}] {prompt}"
        return ProviderResult(
            provider=self.provider_id,
            content=content,
            metadata={
                "priority": self.config.priority,
                "timeoutSeconds": self.config.timeout_seconds,
                "retryAttempts": self.config.retry_attempts,
                "healthSource": self.config.health_source
            }
        )


class DemoTTSProvider:
    """最小演示用 TTS Provider。"""

    def __init__(self, config: ProviderRuntimeConfig) -> None:
        """初始化演示 Provider。"""
        self.config = config
        self.provider_id = config.provider_id

    async def synthesize(self, text: str, voice_config: object | None = None) -> ProviderResult:
        """返回包含文本的演示合成结果。"""
        voice_id = getattr(voice_config, "voice_id", None)
        content = f"[demo-tts:{self.provider_id}] {text}"
        metadata = {
            "priority": self.config.priority,
            "timeoutSeconds": self.config.timeout_seconds,
            "retryAttempts": self.config.retry_attempts,
            "healthSource": self.config.health_source
        }
        if isinstance(voice_id, str) and voice_id.strip():
            metadata["voiceId"] = voice_id.strip()
        return ProviderResult(
            provider=self.provider_id,
            content=content,
            metadata=metadata
        )
