from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.features.video.routes import router as video_router


def _build_app() -> FastAPI:
    app = FastAPI()
    settings = get_settings()
    app.include_router(video_router, prefix=settings.api_v1_prefix)
    return app


def test_video_assets_route_serves_local_file_in_development(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("FASTAPI_ENV", "development")
    monkeypatch.setenv("FASTAPI_VIDEO_ASSET_ROOT", str(tmp_path))
    monkeypatch.setenv("FASTAPI_COS_BASE_URL", "https://cos.example.local")
    get_settings.cache_clear()

    try:
        asset_key = "video/video_assets_case/output.mp4"
        file_path = tmp_path / "video" / "video_assets_case" / "output.mp4"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(b"video-bytes")

        app = _build_app()
        with TestClient(app) as client:
            response = client.get(f"/api/v1/video/assets/{asset_key}")

        assert response.status_code == 200
        assert response.content == b"video-bytes"
    finally:
        get_settings.cache_clear()


def test_video_assets_route_rejects_path_traversal(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("FASTAPI_ENV", "development")
    monkeypatch.setenv("FASTAPI_VIDEO_ASSET_ROOT", str(tmp_path))
    monkeypatch.setenv("FASTAPI_COS_BASE_URL", "https://cos.example.local")
    get_settings.cache_clear()

    try:
        app = _build_app()
        with TestClient(app) as client:
            response = client.get("/api/v1/video/assets/%2e%2e/secret.txt")

        assert response.status_code == 404
    finally:
        get_settings.cache_clear()
