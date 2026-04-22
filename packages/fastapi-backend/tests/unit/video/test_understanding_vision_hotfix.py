"""Verify understanding vision hotfix - image base64 read + generate_vision call."""
import pytest

from app.features.video.pipeline.services import _read_image_as_base64


def test_read_image_as_base64_returns_none_for_missing():
    assert _read_image_as_base64("") is None
    assert _read_image_as_base64("invalid") is None
    assert _read_image_as_base64("local://nonexistent.jpg") is None


def test_read_image_as_base64_reads_jpeg(tmp_path, monkeypatch):
    from app.core.config import get_settings

    class MockSettings:
        video_image_storage_root = str(tmp_path)

    monkeypatch.setattr("app.features.video.pipeline.services.get_settings", lambda: MockSettings())

    img = tmp_path / "test.jpg"
    img.write_bytes(b"\xff\xd8\xff\xe0\x00\x10JFIF")  # JPEG header

    result = _read_image_as_base64(f"local://{img.name}")
    assert result is not None
    b64, mime = result
    assert mime == "image/jpeg"
    assert len(b64) > 0


def test_read_image_as_base64_reads_png(tmp_path, monkeypatch):
    from app.features.video.pipeline.services import get_settings

    class MockSettings:
        video_image_storage_root = str(tmp_path)

    monkeypatch.setattr("app.features.video.pipeline.services.get_settings", lambda: MockSettings())

    img = tmp_path / "diagram.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\n")  # PNG header

    result = _read_image_as_base64(f"local://{img.name}")
    assert result is not None
    b64, mime = result
    assert mime == "image/png"