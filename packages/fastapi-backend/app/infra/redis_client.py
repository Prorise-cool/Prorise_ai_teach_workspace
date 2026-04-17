"""Redis 运行态访问层，负责任务状态、事件缓存与短期在线态读写。

``RuntimeStore`` 通过 mixin 组合了以下领域能力：
- ``OnlineTokenStoreMixin``：在线 token 读写（redis_token_store）
- ``TaskStoreMixin``：任务状态与事件缓存（redis_task_store）
- ``ProviderHealthStoreMixin``：Provider 健康探测结果（redis_provider_store）

核心的 get/set/delete/ttl/clear/close 以及内存态 TTL 淘汰逻辑保留在本模块。
"""

from __future__ import annotations

import json
import math
import time
from copy import deepcopy
from dataclasses import dataclass, field
from enum import StrEnum
from threading import Lock

from dramatiq.brokers.redis import RedisBroker
from dramatiq.brokers.stub import StubBroker
from dramatiq.middleware import default_middleware
from redis import Redis

from app.core.config import Settings, get_settings

try:
    from dramatiq.middleware import Prometheus
except ImportError:  # dramatiq>=2.0 移除了该导出，默认 middleware 中也不再包含它
    Prometheus = None

DRAMATIQ_PROMETHEUS_AVAILABLE = Prometheus is not None

# Re-export mixin 中的公共符号，保持 ``from app.infra.redis_client import X`` 兼容
from app.infra.redis_provider_store import ProviderHealthStoreMixin  # noqa: F401
from app.infra.redis_task_store import TaskStoreMixin  # noqa: F401
from app.infra.redis_token_store import (  # noqa: F401 – re-export
    ONLINE_TOKEN_KEY_PREFIX,
    OnlineTokenStoreMixin,
    build_online_token_key,
    build_online_token_key_candidates,
    normalize_online_token_payload,
)


class RuntimeStorageScope(StrEnum):
    """运行态存储作用域枚举。"""

    RUNTIME = "runtime"
    LONG_TERM = "long_term"


@dataclass(slots=True)
class RuntimeStore(
    OnlineTokenStoreMixin,
    TaskStoreMixin,
    ProviderHealthStoreMixin,
):
    """统一运行态存储抽象，禁止承担长期业务持久化。

    底层支持 Redis（生产）和纯内存（测试/stub）两种后端。
    所有写入必须显式设置正数 TTL，key 必须使用 ``xm_`` 命名空间前缀。
    领域扩展方法通过 mixin 混入，核心读写接口定义于此。
    """

    backend: str
    redis_url: str
    client: Redis | None = None
    storage: dict[str, object] = field(default_factory=dict)
    expirations: dict[str, float] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    def get_runtime_value(self, key: str) -> object | None:
        """读取运行态值。

        Args:
            key: Redis key。

        Returns:
            反序列化后的值，不存在时返回 ``None``。
        """
        if self.client is not None:
            raw_value = self.client.get(key)
            return json.loads(raw_value) if raw_value is not None else None

        with self._lock:
            self._purge_expired_locked(key)
            value = self.storage.get(key)
            return deepcopy(value) if value is not None else None

    def set_runtime_value(
        self,
        key: str,
        value: object,
        *,
        ttl_seconds: int,
        scope: RuntimeStorageScope = RuntimeStorageScope.RUNTIME
    ) -> None:
        """写入运行态值。

        Args:
            key: Redis key，必须以 ``xm_`` 开头。
            value: JSON 可序列化的值。
            ttl_seconds: 过期秒数，必须为正数。
            scope: 存储作用域，仅允许 ``RUNTIME``。

        Raises:
            ValueError: key 前缀不符、TTL 非正数或 scope 非 RUNTIME 时抛出。
        """
        if RuntimeStorageScope(scope) is not RuntimeStorageScope.RUNTIME:
            raise ValueError("RuntimeStore 不能承担长期业务数据持久化")
        if ttl_seconds <= 0:
            raise ValueError("RuntimeStore 写入必须显式设置正数 TTL")
        if not key.startswith("xm_"):
            raise ValueError("RuntimeStore key 必须使用 xm_ 运行态命名空间")

        if self.client is not None:
            self.client.set(key, json.dumps(value), ex=ttl_seconds)
            return

        with self._lock:
            self.storage[key] = json.loads(json.dumps(value))
            self.expirations[key] = self._now() + ttl_seconds

    def claim_runtime_value(
        self,
        key: str,
        value: object,
        *,
        ttl_seconds: int,
        scope: RuntimeStorageScope = RuntimeStorageScope.RUNTIME,
    ) -> bool:
        """以 CAS 方式抢占运行态值（SET NX）。

        仅在 key 不存在时写入成功，适用于分布式锁或幂等控制。

        Args:
            key: Redis key，必须以 ``xm_`` 开头。
            value: JSON 可序列化的值。
            ttl_seconds: 过期秒数，必须为正数。
            scope: 存储作用域，仅允许 ``RUNTIME``。

        Returns:
            ``True`` 表示抢占成功，``False`` 表示 key 已存在。

        Raises:
            ValueError: key 前缀不符、TTL 非正数或 scope 非 RUNTIME 时抛出。
        """
        if RuntimeStorageScope(scope) is not RuntimeStorageScope.RUNTIME:
            raise ValueError("RuntimeStore 不能承担长期业务数据持久化")
        if ttl_seconds <= 0:
            raise ValueError("RuntimeStore 写入必须显式设置正数 TTL")
        if not key.startswith("xm_"):
            raise ValueError("RuntimeStore key 必须使用 xm_ 运行态命名空间")

        if self.client is not None:
            result = self.client.set(key, json.dumps(value), ex=ttl_seconds, nx=True)
            return bool(result)

        with self._lock:
            self._purge_expired_locked(key)
            if key in self.storage:
                return False
            self.storage[key] = json.loads(json.dumps(value))
            self.expirations[key] = self._now() + ttl_seconds
            return True

    def delete_runtime_value(self, key: str) -> None:
        """删除运行态值。

        Args:
            key: Redis key。
        """
        if self.client is not None:
            self.client.delete(key)
            return

        with self._lock:
            self.storage.pop(key, None)
            self.expirations.pop(key, None)

    def ttl(self, key: str) -> int:
        """查询 key 的剩余 TTL。

        Args:
            key: Redis key。

        Returns:
            剩余秒数；key 不存在返回 ``-2``，无 TTL 返回 ``-1``。
        """
        if self.client is not None:
            return int(self.client.ttl(key))

        with self._lock:
            self._purge_expired_locked(key)
            if key not in self.storage:
                return -2
            expires_at = self.expirations.get(key)
            if expires_at is None:
                return -1
            return max(0, math.ceil(expires_at - self._now()))

    def clear(self) -> None:
        """清空全部运行态数据。"""
        if self.client is not None:
            self.client.flushdb()
            return

        with self._lock:
            self.storage.clear()
            self.expirations.clear()

    def close(self) -> None:
        """关闭底层 Redis 连接，释放运行态资源。

        仅关闭网络连接，不清空内存缓存数据，
        避免影响 shutdown 后仍需读取运行态的测试场景。
        如需同时清空数据请调用 ``clear()``。
        """
        if self.client is not None:
            self.client.close()
            self.client = None

    def _purge_expired_locked(self, key: str) -> None:
        """在持有锁的情况下淘汰过期 key（仅内存后端）。"""
        expires_at = self.expirations.get(key)
        if expires_at is None:
            return
        if expires_at <= self._now():
            self.storage.pop(key, None)
            self.expirations.pop(key, None)

    @staticmethod
    def _now() -> float:
        """当前时间戳（秒），便于测试打桩。"""
        return time.time()


# ---------------------------------------------------------------------------
# 工厂函数
# ---------------------------------------------------------------------------

@dataclass(slots=True, frozen=True)
class DramatiqBrokerConfig:
    """Dramatiq broker 配置快照。"""

    backend: str
    redis_url: str
    queue_name: str


def create_runtime_store(settings: Settings | None = None) -> RuntimeStore:
    """根据 Settings 创建 ``RuntimeStore`` 实例。

    当 ``dramatiq_broker_backend`` 为 ``"stub"`` 时使用纯内存后端，
    否则连接真实 Redis。

    Args:
        settings: 可选的 Settings 实例，缺省时调用 ``get_settings()``。

    Returns:
        初始化好的 ``RuntimeStore``。
    """
    active_settings = settings or get_settings()
    if active_settings.dramatiq_broker_backend == "stub":
        return RuntimeStore(backend="memory-runtime-store", redis_url=active_settings.redis_url)

    return RuntimeStore(
        backend="redis-runtime-store",
        redis_url=active_settings.redis_url,
        client=Redis.from_url(active_settings.redis_url, decode_responses=True),
    )


def create_dramatiq_broker_config(settings: Settings | None = None) -> DramatiqBrokerConfig:
    """根据 Settings 创建 Dramatiq broker 配置快照。

    Args:
        settings: 可选的 Settings 实例。

    Returns:
        ``DramatiqBrokerConfig`` 实例。
    """
    active_settings = settings or get_settings()
    return DramatiqBrokerConfig(
        backend=active_settings.dramatiq_broker_backend,
        redis_url=active_settings.redis_url,
        queue_name=active_settings.dramatiq_queue_name,
    )


def create_dramatiq_broker(settings: Settings | None = None) -> RedisBroker | StubBroker:
    """根据 Settings 创建 Dramatiq broker 实例。

    Args:
        settings: 可选的 Settings 实例。

    Returns:
        ``RedisBroker``（生产）或 ``StubBroker``（测试）。
    """
    active_settings = settings or get_settings()
    broker_config = create_dramatiq_broker_config(active_settings)
    middleware_classes = list(default_middleware)
    if not active_settings.dramatiq_prometheus_enabled and DRAMATIQ_PROMETHEUS_AVAILABLE:
        middleware_classes = [
            middleware_cls
            for middleware_cls in middleware_classes
            if middleware_cls is not Prometheus
        ]
    middleware = [
        middleware_cls()
        for middleware_cls in middleware_classes
    ]
    if broker_config.backend == "stub":
        broker = StubBroker(middleware=middleware)
        broker.emit_after("process_boot")
        return broker
    return RedisBroker(url=broker_config.redis_url, middleware=middleware)
