from app.providers.tts.stub_provider import StubTTSProvider


def get_tts_provider(_: str) -> StubTTSProvider:
    return StubTTSProvider()
