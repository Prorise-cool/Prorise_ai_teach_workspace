from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

import app.core.config as config_module
from app.core.config import RuoYiServiceAuthMode, RuntimeEnvironment, Settings


def test_build_env_file_candidates_defaults_to_development(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("FASTAPI_ENV", raising=False)
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)

    assert config_module._resolve_runtime_environment() is RuntimeEnvironment.DEVELOPMENT
    assert config_module._build_env_file_candidates() == (
        tmp_path / ".env.defaults",
        tmp_path / ".env.development",
        tmp_path / ".env.development.local",
        tmp_path / ".env.local",
    )


def test_build_env_file_candidates_excludes_local_overrides_for_staging(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("FASTAPI_ENV", RuntimeEnvironment.STAGING.value)
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)

    assert config_module._build_env_file_candidates() == (
        tmp_path / ".env.defaults",
        tmp_path / ".env.staging",
    )


def test_resolve_runtime_environment_rejects_unknown_alias(monkeypatch) -> None:
    monkeypatch.setenv("FASTAPI_ENV", "dev")

    with pytest.raises(ValueError, match="dev"):
        config_module._resolve_runtime_environment()


def test_settings_require_token_file_when_service_auth_uses_token_file(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)

    with pytest.raises(ValidationError, match="FASTAPI_RUOYI_SERVICE_TOKEN_FILE"):
        Settings(
            _env_file=(),
            ruoyi_service_auth_mode=RuoYiServiceAuthMode.TOKEN_FILE,
        )


def test_settings_resolve_token_file_relative_to_project_root(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)
    settings = Settings(
        _env_file=(),
        ruoyi_service_token_file=".secrets/ruoyi.token",
    )

    assert settings.resolve_ruoyi_service_token_file() == tmp_path / ".secrets" / "ruoyi.token"
