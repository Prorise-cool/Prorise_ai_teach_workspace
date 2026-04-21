"""Learning coach 限流 dependency 单元测试（P1-6）。"""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.security import AccessContext
from app.features.learning_coach import rate_limit


def _fake_access_context(user_id: str = "user-001") -> AccessContext:
    # AccessContext 是 dataclass/SimpleNamespace；用 MagicMock 走 duck typing 最简单。
    ctx = MagicMock(spec=["user_id"])
    ctx.user_id = user_id
    return ctx


def test_enforce_rate_limit_rejects_non_positive_limit() -> None:
    with pytest.raises(ValueError):
        rate_limit.enforce_rate_limit("checkpoint_generate", 0)


def test_enforce_rate_limit_passes_when_redis_unavailable(monkeypatch) -> None:
    """stub broker 或 redis 获取失败时应直接放行，避免本地/测试环境被限流阻塞。"""
    rate_limit.reset_rate_limit_state_for_test()
    monkeypatch.setattr(rate_limit, "_get_redis_client", lambda: None)

    dependency = rate_limit.enforce_rate_limit("checkpoint_generate", 10)
    # 任意调用次数都不应抛异常
    for _ in range(25):
        dependency(access_context=_fake_access_context())


def test_enforce_rate_limit_counts_and_blocks(monkeypatch) -> None:
    """redis 可用时每次 incr 计数，超过阈值抛 429。"""
    rate_limit.reset_rate_limit_state_for_test()

    redis_stub = MagicMock()
    counters: dict[str, int] = {}

    def fake_incr(key: str) -> int:
        counters[key] = counters.get(key, 0) + 1
        return counters[key]

    redis_stub.incr.side_effect = fake_incr
    redis_stub.expire.return_value = True

    monkeypatch.setattr(rate_limit, "_get_redis_client", lambda: redis_stub)

    dependency = rate_limit.enforce_rate_limit("checkpoint_generate", 3)
    ctx = _fake_access_context()

    # 前 3 次放行
    for _ in range(3):
        dependency(access_context=ctx)

    # 第 4 次触发 429
    with pytest.raises(HTTPException) as excinfo:
        dependency(access_context=ctx)
    assert excinfo.value.status_code == 429
    assert excinfo.value.detail["code"] == "LEARNING_COACH_RATE_LIMITED"
    assert excinfo.value.detail["maxPerMinute"] == 3
    assert excinfo.value.detail["endpoint"] == "checkpoint_generate"
    assert excinfo.value.headers["Retry-After"] == "60"

    # 第一次 incr 应触发一次 expire（设置 TTL）
    redis_stub.expire.assert_called_once()


def test_enforce_rate_limit_recovers_when_redis_throws(monkeypatch) -> None:
    """redis 抛异常时降级放行（不让限流故障打垮业务链路）。"""
    rate_limit.reset_rate_limit_state_for_test()

    redis_stub = MagicMock()
    redis_stub.incr.side_effect = RuntimeError("redis down")
    monkeypatch.setattr(rate_limit, "_get_redis_client", lambda: redis_stub)

    dependency = rate_limit.enforce_rate_limit("checkpoint_generate", 3)
    # 不应抛异常
    for _ in range(5):
        dependency(access_context=_fake_access_context())
