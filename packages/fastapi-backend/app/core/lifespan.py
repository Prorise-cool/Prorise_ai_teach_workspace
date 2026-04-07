"""FastAPI 应用生命周期管理模块，负责启动初始化与关停资源回收。"""

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging import configure_logging, get_logger
from app.infra.sse_broker import InMemorySseBroker
from app.worker import get_broker, get_runtime_store, create_web_task_scheduler


def create_lifespan() -> Callable[[FastAPI], AsyncIterator[None]]:
    """创建 FastAPI lifespan 上下文管理器工厂。

    返回一个 async context manager，用于在应用启动时初始化日志、运行态存储、
    SSE broker、Dramatiq broker 和任务调度器，在关停时释放运行态资源。
    """
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        """应用生命周期上下文管理器，管理启动初始化与关停清理。"""
        configure_logging()
        logger = get_logger("app.lifecycle")
        app.state.logger = logger
        app.state.runtime_store = get_runtime_store()
        app.state.sse_broker = InMemorySseBroker()
        app.state.dramatiq_broker = get_broker()
        app.state.task_scheduler = create_web_task_scheduler()
        logger.info("FastAPI scaffold started")
        try:
            yield
        finally:
            logger.info("FastAPI scaffold shutting down — cleaning up resources")
            runtime_store = getattr(app.state, "runtime_store", None)
            if runtime_store is not None:
                try:
                    runtime_store.close()
                    logger.info("RuntimeStore closed")
                except Exception:
                    logger.exception("RuntimeStore close failed")
            logger.info("FastAPI scaffold stopped")

    return lifespan
