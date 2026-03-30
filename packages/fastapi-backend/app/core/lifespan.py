from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging import configure_logging, get_logger
from app.infra.sse_broker import InMemorySseBroker
from app.worker import broker as task_broker
from app.worker import create_web_task_scheduler, runtime_store as task_runtime_store


def create_lifespan() -> Callable[[FastAPI], AsyncIterator[None]]:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging()
        app.state.logger = get_logger("app.lifecycle")
        app.state.runtime_store = task_runtime_store
        app.state.sse_broker = InMemorySseBroker()
        app.state.dramatiq_broker = task_broker
        app.state.task_scheduler = create_web_task_scheduler()
        app.state.logger.info("FastAPI scaffold started")
        yield
        app.state.logger.info("FastAPI scaffold stopped")

    return lifespan
