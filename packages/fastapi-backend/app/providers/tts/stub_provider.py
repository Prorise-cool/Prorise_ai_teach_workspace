from app.providers.protocols import ProviderResult


class StubTTSProvider:
    name = "stub-tts"

    async def synthesize(self, text: str) -> ProviderResult:
        return ProviderResult(provider=self.name, content=f"audio:{text}")
