from __future__ import annotations

from pathlib import Path

import pytest

import app.core.config as config_module
from app.core.config import RuntimeEnvironment, Settings


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


def test_settings_accepts_clean_ruoyi_configuration_without_service_auth(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)

    settings = Settings(
        _env_file=(),
        ruoyi_base_url="http://127.0.0.1:8080",
    )

    assert settings.ruoyi_base_url == "http://127.0.0.1:8080"


def test_settings_accepts_ruoyi_crypto_configuration(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(config_module, "PROJECT_ROOT", tmp_path)

    settings = Settings(
        _env_file=(),
        ruoyi_encrypt_enabled=True,
        ruoyi_encrypt_header_flag="encrypt-key",
        ruoyi_encrypt_public_key="public-key",
        ruoyi_encrypt_private_key="private-key",
    )

    assert settings.ruoyi_encrypt_enabled is True
    assert settings.ruoyi_encrypt_header_flag == "encrypt-key"
    assert settings.ruoyi_encrypt_public_key == "public-key"
    assert settings.ruoyi_encrypt_private_key == "private-key"
