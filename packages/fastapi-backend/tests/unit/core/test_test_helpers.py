"""测试共享测试 helper 的最小契约。"""

from __future__ import annotations

import pytest


pytestmark = pytest.mark.unit


def test_repo_root_points_to_workspace_root() -> None:
    from tests.helpers.paths import repo_root

    assert (repo_root() / "packages/fastapi-backend").exists()


def test_create_authed_app_sets_default_access_context() -> None:
    from tests.helpers.app import create_authed_app

    app = create_authed_app()

    assert app.dependency_overrides
