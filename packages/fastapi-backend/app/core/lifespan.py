from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging import configure_logging, get_logger
from app.infra.redis_client import create_runtime_store
from app.infra.sse_broker import InMemorySseBroker


def create_lifespan() -> Callable[[FastAPI], AsyncIterator[None]]:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging()
        app.state.logger = get_logger("app.lifecycle")
        app.state.runtime_store = create_runtime_store()
        app.state.sse_broker = InMemorySseBroker()
        app.state.logger.info("FastAPI scaffold started")
        yield
        app.state.logger.info("FastAPI scaffold stopped")

    return lifespan
