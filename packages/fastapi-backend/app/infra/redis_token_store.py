"""在线 token 运行态存储 mixin。

提供 RuoYi online token 的 Redis 读写、删除与 TTL 查询能力。
通过 mixin 方式混入 ``RuntimeStore``，不可独立实例化。
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

ONLINE_TOKEN_KEY_PREFIX = "online_tokens:"


def build_online_token_key(token_value: str, tenant_id: str | None = None) -> str:
    """构造在线 token 运行态 key。

    Args:
        token_value: token 原始值。
        tenant_id: 租户 ID，为 ``None`` 时使用默认命名空间。

    Returns:
        Redis key 字符串。
    """
    if tenant_id:
        return f"{tenant_id}:{ONLINE_TOKEN_KEY_PREFIX}{token_value}"
    return f"{ONLINE_TOKEN_KEY_PREFIX}{token_value}"


def build_online_token_key_candidates(
    token_value: str,
    tenant_id: str | None = None
) -> tuple[str, ...]:
    """构造在线 token 的候选 key 列表（优先租户维度）。

    Args:
        token_value: token 原始值。
        tenant_id: 租户 ID。

    Returns:
        去重后的候选 key 元组。
    """
    candidates: list[str] = []
    for key in (
        build_online_token_key(token_value, tenant_id=tenant_id),
        build_online_token_key(token_value),
    ):
        if key not in candidates:
            candidates.append(key)
    return tuple(candidates)


def normalize_online_token_payload(payload: object) -> dict[str, object] | None:
    """将 Redis 中读取到的 token payload 归一化为 dict。

    兼容两种存储格式：纯 dict 或 ``[meta, dict]`` 数组。

    Args:
        payload: 从 Redis 反序列化后的原始值。

    Returns:
        归一化后的 dict，无法识别时返回 ``None``。
    """
    if isinstance(payload, dict):
        return dict(payload)

    if (
        isinstance(payload, list)
        and len(payload) == 2
        and isinstance(payload[1], dict)
    ):
        return dict(payload[1])

    return None


class OnlineTokenStoreMixin:
    """在线 token 运行态读写 mixin。

    需要宿主类提供 ``get_runtime_value``、``set_runtime_value``、
    ``delete_runtime_value``、``ttl``、``client``、``storage``、
    ``expirations``、``_lock``、``_now`` 等接口。
    """

    def get_online_token_record(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> dict[str, object] | None:
        """按 token 值查询在线 token 记录。

        Args:
            token_value: token 原始值。
            tenant_id: 租户 ID。

        Returns:
            归一化后的 payload dict，未找到时返回 ``None``。
        """
        for key in build_online_token_key_candidates(token_value, tenant_id=tenant_id):
            payload = self.get_runtime_value(key)  # type: ignore[attr-defined]
            normalized = normalize_online_token_payload(payload)
            if normalized is not None:
                return normalized
        return None

    def set_online_token_record(
        self,
        token_value: str,
        payload: dict[str, object],
        *,
        tenant_id: str | None = None,
        ttl_seconds: int
    ) -> None:
        """写入在线 token 记录。

        Args:
            token_value: token 原始值。
            payload: 需存储的 token 数据。
            tenant_id: 租户 ID。
            ttl_seconds: 过期秒数，必须为正数。

        Raises:
            ValueError: ``ttl_seconds`` 不为正数时抛出。
        """
        if ttl_seconds <= 0:
            raise ValueError("在线态写入必须显式设置正数 TTL")

        key = build_online_token_key(token_value, tenant_id=tenant_id)

        if self.client is not None:  # type: ignore[attr-defined]
            self.client.set(key, json.dumps(payload), ex=ttl_seconds)  # type: ignore[attr-defined]
            return

        with self._lock:  # type: ignore[attr-defined]
            self.storage[key] = json.loads(json.dumps(payload))  # type: ignore[attr-defined]
            self.expirations[key] = self._now() + ttl_seconds  # type: ignore[attr-defined]

    def delete_online_token_record(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> None:
        """删除在线 token 记录（含所有候选 key）。

        Args:
            token_value: token 原始值。
            tenant_id: 租户 ID。
        """
        keys = build_online_token_key_candidates(token_value, tenant_id=tenant_id)

        if self.client is not None:  # type: ignore[attr-defined]
            self.client.delete(*keys)  # type: ignore[attr-defined]
            return

        with self._lock:  # type: ignore[attr-defined]
            for key in keys:
                self.storage.pop(key, None)  # type: ignore[attr-defined]
                self.expirations.pop(key, None)  # type: ignore[attr-defined]

    def get_online_token_ttl(
        self,
        token_value: str,
        *,
        tenant_id: str | None = None
    ) -> int:
        """查询在线 token 的剩余 TTL。

        Args:
            token_value: token 原始值。
            tenant_id: 租户 ID。

        Returns:
            剩余秒数；key 不存在时返回 ``-2``，无 TTL 时返回 ``-1``。
        """
        for key in build_online_token_key_candidates(token_value, tenant_id=tenant_id):
            ttl = self.ttl(key)  # type: ignore[attr-defined]
            if ttl >= -1:
                return ttl
        return -2
