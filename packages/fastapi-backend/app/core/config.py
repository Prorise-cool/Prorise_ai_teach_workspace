"""应用配置模块。

基于 ``pydantic-settings`` 实现类型安全配置管理，按正式环境分层加载
package 内 dotenv 文件，并显式区分本地、预发、生产与测试运行配置。

使用方式::

    from app.core.config import get_settings
    settings = get_settings()  # 单例，首次调用后缓存
"""

from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import (
    BaseSettings,
    DotEnvSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class RuntimeEnvironment(str, Enum):
    """FastAPI 运行环境枚举。"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class ProviderRuntimeSource(str, Enum):
    """Provider 运行时配置来源。"""

    SETTINGS = "settings"
    RUOYI = "ruoyi"


def _normalize_runtime_environment(
    raw_value: str | RuntimeEnvironment | None,
) -> RuntimeEnvironment:
    """归一化 ``FASTAPI_ENV``，只接受正式环境枚举值。"""

    if isinstance(raw_value, RuntimeEnvironment):
        return raw_value
    normalized = (raw_value or "").strip().lower()
    if not normalized:
        return RuntimeEnvironment.DEVELOPMENT
    return RuntimeEnvironment(normalized)


def _resolve_runtime_environment() -> RuntimeEnvironment:
    """解析当前运行环境。

    非本地部署必须通过进程环境变量显式声明 ``FASTAPI_ENV``；
    未声明时仅默认回落到本地开发环境。
    """

    return _normalize_runtime_environment(os.getenv("FASTAPI_ENV"))


def _default_dramatiq_pid_file() -> str:
    """返回本地 worker 默认 pid 文件路径。"""

    return str(PROJECT_ROOT / ".runtime" / "dramatiq-worker.pid")


def _build_env_file_candidates() -> tuple[Path, ...]:
    """按基础 -> 环境 -> 本地覆盖顺序构建 env 文件候选列表。"""

    environment = _resolve_runtime_environment()

    candidates = [
        PROJECT_ROOT / ".env.defaults",
        PROJECT_ROOT / f".env.{environment.value}",
    ]
    if environment in {RuntimeEnvironment.DEVELOPMENT, RuntimeEnvironment.TEST}:
        candidates.extend(
            (
                PROJECT_ROOT / f".env.{environment.value}.local",
                PROJECT_ROOT / ".env.local",
            )
        )
    seen: set[Path] = set()
    ordered: list[Path] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        ordered.append(candidate)
    return tuple(ordered)


class Settings(BaseSettings):
    """FastAPI 骨架配置模型。"""

    app_name: str = Field(
        default="Prorise AI Teach FastAPI Backend", alias="FASTAPI_APP_NAME"
    )
    environment: RuntimeEnvironment = Field(
        default=RuntimeEnvironment.DEVELOPMENT,
        alias="FASTAPI_ENV",
    )
    log_level: str = Field(default="INFO", alias="FASTAPI_LOG_LEVEL")
    host: str = Field(default="0.0.0.0", alias="FASTAPI_HOST")
    port: int = Field(default=8090, alias="FASTAPI_PORT")
    reload: bool = Field(default=True, alias="FASTAPI_RELOAD")
    api_v1_prefix: str = Field(default="/api/v1", alias="FASTAPI_API_V1_PREFIX")
    redis_url: str = Field(
        default="redis://localhost:6379/0", alias="FASTAPI_REDIS_URL"
    )
    dramatiq_broker_backend: str = Field(
        default="redis", alias="FASTAPI_DRAMATIQ_BROKER_BACKEND"
    )
    dramatiq_queue_name: str = Field(
        default="task-runtime", alias="FASTAPI_DRAMATIQ_QUEUE_NAME"
    )
    dramatiq_worker_threads: int = Field(
        default=2, alias="FASTAPI_DRAMATIQ_WORKER_THREADS"
    )
    dramatiq_worker_processes: int = Field(
        default=1, alias="FASTAPI_DRAMATIQ_WORKER_PROCESSES"
    )
    dramatiq_task_time_limit_ms: int = Field(
        default=36_000_000, alias="FASTAPI_DRAMATIQ_TASK_TIME_LIMIT_MS"
    )
    dramatiq_prometheus_enabled: bool | None = Field(
        default=None, alias="FASTAPI_DRAMATIQ_PROMETHEUS_ENABLED"
    )
    dramatiq_prometheus_host: str = Field(
        default="0.0.0.0", alias="FASTAPI_DRAMATIQ_PROMETHEUS_HOST"
    )
    dramatiq_prometheus_port: int = Field(
        default=9191, alias="FASTAPI_DRAMATIQ_PROMETHEUS_PORT"
    )
    dramatiq_pid_file: str = Field(
        default_factory=_default_dramatiq_pid_file,
        alias="FASTAPI_DRAMATIQ_PID_FILE",
    )
    ruoyi_base_url: str = Field(
        default="http://localhost:8080", alias="FASTAPI_RUOYI_BASE_URL"
    )
    ruoyi_timeout_seconds: float = Field(
        default=10.0, alias="FASTAPI_RUOYI_TIMEOUT_SECONDS"
    )
    ruoyi_retry_attempts: int = Field(default=2, alias="FASTAPI_RUOYI_RETRY_ATTEMPTS")
    ruoyi_retry_delay_seconds: float = Field(
        default=0.1, alias="FASTAPI_RUOYI_RETRY_DELAY_SECONDS"
    )
    ruoyi_encrypt_enabled: bool = Field(
        default=True, alias="FASTAPI_RUOYI_ENCRYPT_ENABLED"
    )
    ruoyi_encrypt_header_flag: str = Field(
        default="encrypt-key", alias="FASTAPI_RUOYI_ENCRYPT_HEADER_FLAG"
    )
    ruoyi_encrypt_public_key: str = Field(
        default="", alias="FASTAPI_RUOYI_ENCRYPT_PUBLIC_KEY"
    )
    ruoyi_encrypt_private_key: str = Field(
        default="", alias="FASTAPI_RUOYI_ENCRYPT_PRIVATE_KEY"
    )
    provider_runtime_source: ProviderRuntimeSource = Field(
        default=ProviderRuntimeSource.SETTINGS,
        alias="FASTAPI_PROVIDER_RUNTIME_SOURCE",
    )
    cos_base_url: str = Field(
        default="https://cos.example.local", alias="FASTAPI_COS_BASE_URL"
    )
    iconfinder_api_base_url: str = Field(
        default="https://api.iconfinder.com/v4",
        alias="FASTAPI_ICONFINDER_API_BASE_URL",
    )
    iconify_api_base_url: str = Field(
        default="https://api.iconify.design",
        alias="FASTAPI_ICONIFY_API_BASE_URL",
    )
    default_llm_provider: str = Field(
        default="stub-llm", alias="FASTAPI_DEFAULT_LLM_PROVIDER"
    )
    default_tts_provider: str = Field(
        default="stub-tts", alias="FASTAPI_DEFAULT_TTS_PROVIDER"
    )
    video_asset_root: str = Field(
        default=str(PROJECT_ROOT / ".runtime" / "video-assets"),
        alias="FASTAPI_VIDEO_ASSET_ROOT",
    )
    video_render_quality: str = Field(default="l", alias="FASTAPI_VIDEO_RENDER_QUALITY")
    video_fix_max_attempts: int = Field(
        default=2, alias="FASTAPI_VIDEO_FIX_MAX_ATTEMPTS"
    )
    video_upload_retry_attempts: int = Field(
        default=2, alias="FASTAPI_VIDEO_UPLOAD_RETRY_ATTEMPTS"
    )
    video_sandbox_cpu_count: float = Field(
        default=1.0, alias="FASTAPI_VIDEO_SANDBOX_CPU_COUNT"
    )
    video_sandbox_memory_mb: int = Field(
        default=2048, alias="FASTAPI_VIDEO_SANDBOX_MEMORY_MB"
    )
    video_sandbox_timeout_seconds: int = Field(
        default=120, alias="FASTAPI_VIDEO_SANDBOX_TIMEOUT_SECONDS"
    )
    video_sandbox_tmp_size_mb: int = Field(
        default=1024, alias="FASTAPI_VIDEO_SANDBOX_TMP_SIZE_MB"
    )
    video_sandbox_allow_local_fallback: bool = Field(
        default=False,
        alias="FASTAPI_VIDEO_SANDBOX_ALLOW_LOCAL_FALLBACK",
    )

    # ManimCat optimization settings
    video_designer_temperature: float = Field(
        default=0.8,
        alias="FASTAPI_VIDEO_DESIGNER_TEMPERATURE",
    )
    video_coder_temperature: float = Field(
        default=0.7,
        alias="FASTAPI_VIDEO_CODER_TEMPERATURE",
    )
    video_static_guard_max_passes: int = Field(
        default=3,
        alias="FASTAPI_VIDEO_STATIC_GUARD_MAX_PASSES",
    )
    video_patch_retry_max_retries: int = Field(
        default=1,
        alias="FASTAPI_VIDEO_PATCH_RETRY_MAX_RETRIES",
    )
    video_designer_max_tokens: int = Field(
        default=12000,
        alias="FASTAPI_VIDEO_DESIGNER_MAX_TOKENS",
    )
    video_llm_stream_max_input_chars: int = Field(
        default=12000,
        alias="FASTAPI_VIDEO_LLM_STREAM_MAX_INPUT_CHARS",
    )
    video_default_duration_minutes: int = Field(
        default=5,
        alias="FASTAPI_VIDEO_DEFAULT_DURATION_MINUTES",
    )
    video_section_max_count: int = Field(
        default=6,
        alias="FASTAPI_VIDEO_SECTION_MAX_COUNT",
    )
    video_section_codegen_concurrency: int = Field(
        default=1,
        alias="FASTAPI_VIDEO_SECTION_CODEGEN_CONCURRENCY",
    )
    video_section_codegen_max_tokens: int = Field(
        default=4000,
        alias="FASTAPI_VIDEO_SECTION_CODEGEN_MAX_TOKENS",
    )
    video_section_codegen_max_completion_tokens: int = Field(
        default=8000,
        alias="FASTAPI_VIDEO_SECTION_CODEGEN_MAX_COMPLETION_TOKENS",
    )
    video_default_layout_hint: str = Field(
        default="center_stage",
        alias="FASTAPI_VIDEO_DEFAULT_LAYOUT_HINT",
    )

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """按环境分层加载 dotenv 配置。"""

        explicit_env_file = getattr(dotenv_settings, "env_file", None)
        layered_dotenv_settings = DotEnvSettingsSource(
            settings_cls,
            env_file=_build_env_file_candidates()
            if explicit_env_file is None
            else explicit_env_file,
            env_file_encoding="utf-8",
        )
        return (
            init_settings,
            env_settings,
            layered_dotenv_settings,
            file_secret_settings,
        )

    @field_validator("environment", mode="before")
    @classmethod
    def validate_environment(cls, value: object) -> RuntimeEnvironment:
        """归一化 ``FASTAPI_ENV``，只接受正式环境值。"""

        if isinstance(value, (str, RuntimeEnvironment)) or value is None:
            return _normalize_runtime_environment(value)
        return RuntimeEnvironment.DEVELOPMENT

    @model_validator(mode="after")
    def apply_runtime_defaults(self) -> Settings:
        """根据运行环境补齐依赖环境的默认值。"""

        if self.dramatiq_prometheus_enabled is None:
            self.dramatiq_prometheus_enabled = self.environment not in {
                RuntimeEnvironment.DEVELOPMENT,
                RuntimeEnvironment.TEST,
            }
        return self


@lru_cache
def get_settings() -> Settings:
    """获取全局配置单例（``lru_cache`` 缓存，进程内只初始化一次）。"""
    return Settings()
