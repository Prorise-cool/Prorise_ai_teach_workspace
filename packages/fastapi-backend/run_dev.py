from pathlib import Path

import uvicorn

from app.core.config import get_settings

PROJECT_ROOT = Path(__file__).resolve().parent


def main() -> None:
    """使用 package 内分层 env 配置启动本地开发服务。"""
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        reload_dirs=[str(PROJECT_ROOT / "app")]
    )


if __name__ == "__main__":
    main()
