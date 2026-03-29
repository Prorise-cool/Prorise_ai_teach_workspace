from app.providers.protocols import ProviderResult


class StubLLMProvider:
    name = "stub-llm"

    async def generate(self, prompt: str) -> ProviderResult:
        return ProviderResult(provider=self.name, content=f"stub:{prompt}")
