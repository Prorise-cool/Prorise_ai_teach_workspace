from __future__ import annotations

from app.core.config import Settings
from app.infra.redis_client import (
    DRAMATIQ_PROMETHEUS_AVAILABLE,
    create_dramatiq_broker,
)


def test_create_dramatiq_broker_excludes_prometheus_when_disabled() -> None:
    settings = Settings(
        _env_file=(),
        dramatiq_broker_backend="stub",
        dramatiq_prometheus_enabled=False,
    )

    broker = create_dramatiq_broker(settings)
    middleware_names = [type(middleware).__name__ for middleware in broker.middleware]

    assert "Prometheus" not in middleware_names


def test_create_dramatiq_broker_handles_prometheus_when_enabled() -> None:
    settings = Settings(
        _env_file=(),
        dramatiq_broker_backend="stub",
        dramatiq_prometheus_enabled=True,
    )

    broker = create_dramatiq_broker(settings)
    middleware_names = [type(middleware).__name__ for middleware in broker.middleware]

    if DRAMATIQ_PROMETHEUS_AVAILABLE:
        assert "Prometheus" in middleware_names
    else:
        assert "Prometheus" not in middleware_names
