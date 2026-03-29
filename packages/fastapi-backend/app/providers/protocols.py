from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class ProviderResult:
    provider: str
    content: str


class LLMProvider(Protocol):
    name: str

    async def generate(self, prompt: str) -> ProviderResult: ...


class TTSProvider(Protocol):
    name: str

    async def synthesize(self, text: str) -> ProviderResult: ...
