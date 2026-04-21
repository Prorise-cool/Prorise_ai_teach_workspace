"""Learning coach 生成类端点的 per-user 节流。

设计目标：
- 每个用户对每个生成端点按分钟桶计数，超过阈值直接返回 429。
- 不引入新依赖，复用项目里已有的 redis client（dramatiq[redis]）。
- 在 `dramatiq_broker_backend == "stub"` 的测试/本地环境自动放过，避免单测需要 redis。
"""
from __future__ import annotations

import logging
import time
from threading import Lock
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import AccessContext, get_access_context

logger = logging.getLogger(__name__)

_RATE_LIMIT_WINDOW_SECONDS = 60
_RATE_LIMIT_TTL_SECONDS = 70  # 略大于窗口，避免 bucket 边界 race


_client_lock = Lock()
_redis_client: object | None = None
_redis_unavailable = False


def _get_redis_client() -> object | None:
    """懒加载 redis client；stub broker 模式或初始化失败时返回 None。"""
    global _redis_client, _redis_unavailable
    if _redis_unavailable:
        return None
    if _redis_client is not None:
        return _redis_client

    with _client_lock:
        if _redis_client is not None:
            return _redis_client
        settings = get_settings()
        if settings.dramatiq_broker_backend == "stub":
            _redis_unavailable = True
            return None
        try:
            from redis import Redis  # type: ignore[import-not-found]

            _redis_client = Redis.from_url(
                settings.redis_url, decode_responses=True
            )
        except Exception as error:  # pragma: no cover - 启动期异常
            logger.warning(
                "learning_coach.rate_limit.redis_unavailable",
                extra={"error": str(error)},
            )
            _redis_unavailable = True
            return None
    return _redis_client


def enforce_rate_limit(endpoint: str, max_per_minute: int) -> Callable[..., None]:
    """构造 FastAPI dependency，强制 per-user per-endpoint 每分钟不超过 N 次。

    超限返回 HTTP 429 + 清晰错误体；redis 不可用（如测试环境）则直接放过。
    """
    if max_per_minute <= 0:
        raise ValueError("max_per_minute 必须为正数")

    def dependency(
        access_context: AccessContext = Depends(get_access_context),
    ) -> None:
        redis_client = _get_redis_client()
        if redis_client is None:
            return

        minute_bucket = int(time.time() // _RATE_LIMIT_WINDOW_SECONDS)
        cache_key = (
            f"xm_learning_coach:ratelimit:{access_context.user_id}"
            f":{endpoint}:{minute_bucket}"
        )
        try:
            current = redis_client.incr(cache_key)
            if current == 1:
                redis_client.expire(cache_key, _RATE_LIMIT_TTL_SECONDS)
        except Exception as error:  # pragma: no cover - redis 故障时降级放行
            logger.warning(
                "learning_coach.rate_limit.incr_failed",
                extra={
                    "endpoint": endpoint,
                    "user_id": access_context.user_id,
                    "error": str(error),
                },
            )
            return

        if int(current) > max_per_minute:
            logger.info(
                "learning_coach.rate_limit.blocked",
                extra={
                    "endpoint": endpoint,
                    "user_id": access_context.user_id,
                    "observed": int(current),
                    "limit": max_per_minute,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "LEARNING_COACH_RATE_LIMITED",
                    "message": (
                        f"生成请求过于频繁，每分钟上限 {max_per_minute} 次，请稍后重试。"
                    ),
                    "endpoint": endpoint,
                    "maxPerMinute": max_per_minute,
                    "retryAfterSeconds": _RATE_LIMIT_WINDOW_SECONDS,
                },
                headers={"Retry-After": str(_RATE_LIMIT_WINDOW_SECONDS)},
            )

    return dependency


def reset_rate_limit_state_for_test() -> None:
    """测试辅助：清空懒加载的 redis client，方便各用例隔离。"""
    global _redis_client, _redis_unavailable
    with _client_lock:
        _redis_client = None
        _redis_unavailable = False
