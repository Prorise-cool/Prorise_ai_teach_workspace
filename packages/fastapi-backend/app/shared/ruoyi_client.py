"""Backward compatibility re-export. Import from app.shared.ruoyi.client instead."""
from app.shared.ruoyi.client import *  # noqa: F401,F403

# Re-export get_settings for monkeypatch targets in tests
from app.core.config import get_settings  # noqa: F401
