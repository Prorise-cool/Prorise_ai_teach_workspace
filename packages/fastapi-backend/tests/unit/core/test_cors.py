from __future__ import annotations

from fastapi.testclient import TestClient

import app.core.config as config_module
from app.main import create_app


def test_dev_environment_handles_cors_preflight_for_video_tasks(monkeypatch) -> None:
    monkeypatch.delenv("FASTAPI_ENV", raising=False)
    config_module.get_settings.cache_clear()

    try:
        with TestClient(create_app()) as client:
            response = client.options(
                "/api/v1/video/tasks",
                headers={
                    "Origin": "null",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
            )
    finally:
        config_module.get_settings.cache_clear()

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    allow_methods = response.headers["access-control-allow-methods"]
    assert "POST" in allow_methods
