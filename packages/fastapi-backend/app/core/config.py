from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """FastAPI 骨架配置模型。"""

    app_name: str = Field(
        default="Prorise AI Teach FastAPI Backend",
        alias="FASTAPI_APP_NAME"
    )
    environment: str = Field(default="development", alias="FASTAPI_ENV")
    host: str = Field(default="0.0.0.0", alias="FASTAPI_HOST")
    port: int = Field(default=8090, alias="FASTAPI_PORT")
    reload: bool = Field(default=True, alias="FASTAPI_RELOAD")
    api_v1_prefix: str = Field(default="/api/v1", alias="FASTAPI_API_V1_PREFIX")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="FASTAPI_REDIS_URL")
    ruoyi_base_url: str = Field(default="http://localhost:8080", alias="FASTAPI_RUOYI_BASE_URL")
    cos_base_url: str = Field(default="https://cos.example.local", alias="FASTAPI_COS_BASE_URL")
    default_llm_provider: str = Field(default="stub-llm", alias="FASTAPI_DEFAULT_LLM_PROVIDER")
    default_tts_provider: str = Field(default="stub-tts", alias="FASTAPI_DEFAULT_TTS_PROVIDER")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
