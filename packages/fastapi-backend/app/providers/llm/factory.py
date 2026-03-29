from app.providers.llm.stub_provider import StubLLMProvider


def get_llm_provider(_: str) -> StubLLMProvider:
    return StubLLMProvider()
