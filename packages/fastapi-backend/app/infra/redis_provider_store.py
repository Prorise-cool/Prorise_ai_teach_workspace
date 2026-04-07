"""Provider 健康状态运行态存储 mixin。

提供外部 AI Provider 健康探测结果的 Redis 读写能力。
通过 mixin 方式混入 ``RuntimeStore``。
"""

from __future__ import annotations

from app.core.logging import format_trace_timestamp
from app.shared.task_framework.key_builder import (
    PROVIDER_HEALTH_TTL_SECONDS,
    build_provider_health_key,
)


class ProviderHealthStoreMixin:
    """Provider 健康状态读写 mixin。

    需要宿主类提供 ``get_runtime_value`` 和 ``set_runtime_value`` 接口。
    """

    def set_provider_health(
        self,
        provider: str,
        *,
        is_healthy: bool,
        reason: str | None = None,
        checked_at: str | None = None,
        metadata: dict[str, object] | None = None
    ) -> dict[str, object]:
        """写入 Provider 健康探测结果。

        Args:
            provider: Provider 标识名称。
            is_healthy: 是否健康。
            reason: 不健康原因描述。
            checked_at: 探测时间戳（省略时自动生成）。
            metadata: 扩展元数据。

        Returns:
            写入后的完整健康状态字典。
        """
        payload: dict[str, object] = {
            "provider": provider,
            "isHealthy": is_healthy,
            "reason": reason,
            "checkedAt": checked_at or format_trace_timestamp(),
            "metadata": metadata or {}
        }
        self.set_runtime_value(  # type: ignore[attr-defined]
            build_provider_health_key(provider),
            payload,
            ttl_seconds=PROVIDER_HEALTH_TTL_SECONDS
        )
        return payload

    def get_provider_health(self, provider: str) -> dict[str, object] | None:
        """读取 Provider 健康探测结果。

        Args:
            provider: Provider 标识名称。

        Returns:
            健康状态字典，不存在时返回 ``None``。
        """
        payload = self.get_runtime_value(build_provider_health_key(provider))  # type: ignore[attr-defined]
        if payload is None:
            return None
        return dict(payload)
