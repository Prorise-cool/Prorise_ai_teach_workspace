from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


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
    dramatiq_broker_backend: str = Field(default="redis", alias="FASTAPI_DRAMATIQ_BROKER_BACKEND")
    dramatiq_queue_name: str = Field(default="task-runtime", alias="FASTAPI_DRAMATIQ_QUEUE_NAME")
    dramatiq_worker_threads: int = Field(default=2, alias="FASTAPI_DRAMATIQ_WORKER_THREADS")
    dramatiq_worker_processes: int = Field(default=1, alias="FASTAPI_DRAMATIQ_WORKER_PROCESSES")
    ruoyi_base_url: str = Field(default="http://localhost:8080", alias="FASTAPI_RUOYI_BASE_URL")
    ruoyi_access_token: str | None = Field(default=None, alias="FASTAPI_RUOYI_ACCESS_TOKEN")
    ruoyi_client_id: str | None = Field(default=None, alias="FASTAPI_RUOYI_CLIENT_ID")
    ruoyi_timeout_seconds: float = Field(default=10.0, alias="FASTAPI_RUOYI_TIMEOUT_SECONDS")
    ruoyi_retry_attempts: int = Field(default=2, alias="FASTAPI_RUOYI_RETRY_ATTEMPTS")
    ruoyi_retry_delay_seconds: float = Field(default=0.1, alias="FASTAPI_RUOYI_RETRY_DELAY_SECONDS")
    provider_runtime_source: str = Field(default="settings", alias="FASTAPI_PROVIDER_RUNTIME_SOURCE")
    cos_base_url: str = Field(default="https://cos.example.local", alias="FASTAPI_COS_BASE_URL")
    default_llm_provider: str = Field(default="stub-llm", alias="FASTAPI_DEFAULT_LLM_PROVIDER")
    default_tts_provider: str = Field(default="stub-tts", alias="FASTAPI_DEFAULT_TTS_PROVIDER")
    video_asset_root: str = Field(
        default=str(PROJECT_ROOT / ".runtime" / "video-assets"),
        alias="FASTAPI_VIDEO_ASSET_ROOT",
    )
    video_target_duration_seconds: int = Field(default=120, alias="FASTAPI_VIDEO_TARGET_DURATION_SECONDS")
    video_min_duration_seconds: int = Field(default=90, alias="FASTAPI_VIDEO_MIN_DURATION_SECONDS")
    video_max_duration_seconds: int = Field(default=180, alias="FASTAPI_VIDEO_MAX_DURATION_SECONDS")
    video_fix_max_attempts: int = Field(default=2, alias="FASTAPI_VIDEO_FIX_MAX_ATTEMPTS")
    video_ffmpeg_timeout_seconds: int = Field(default=60, alias="FASTAPI_VIDEO_FFMPEG_TIMEOUT_SECONDS")
    video_upload_retry_attempts: int = Field(default=2, alias="FASTAPI_VIDEO_UPLOAD_RETRY_ATTEMPTS")
    video_publish_cache_ttl_seconds: int = Field(default=600, alias="FASTAPI_VIDEO_PUBLISH_CACHE_TTL_SECONDS")
    video_output_audio_format: str = Field(default="mp3", alias="FASTAPI_VIDEO_OUTPUT_AUDIO_FORMAT")
    video_output_audio_sample_rate: int = Field(default=44100, alias="FASTAPI_VIDEO_OUTPUT_AUDIO_SAMPLE_RATE")
    video_output_audio_bitrate: str = Field(default="192k", alias="FASTAPI_VIDEO_OUTPUT_AUDIO_BITRATE")
    video_sandbox_cpu_count: float = Field(default=1.0, alias="FASTAPI_VIDEO_SANDBOX_CPU_COUNT")
    video_sandbox_memory_mb: int = Field(default=2048, alias="FASTAPI_VIDEO_SANDBOX_MEMORY_MB")
    video_sandbox_timeout_seconds: int = Field(default=120, alias="FASTAPI_VIDEO_SANDBOX_TIMEOUT_SECONDS")
    video_sandbox_tmp_size_mb: int = Field(default=1024, alias="FASTAPI_VIDEO_SANDBOX_TMP_SIZE_MB")

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
