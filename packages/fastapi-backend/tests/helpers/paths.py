"""测试目录共享路径 helper。"""

from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    """返回仓库根目录。"""

    return Path(__file__).resolve().parents[4]
