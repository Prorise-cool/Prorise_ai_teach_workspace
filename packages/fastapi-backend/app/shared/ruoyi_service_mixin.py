"""RuoYi 防腐层服务共享 Mixin — 提供通用的响应校验错误构造方法。

所有与 RuoYi 后端对接的业务 Service 均可继承 ``RuoYiServiceMixin``，
通过声明类属性 ``_RESOURCE`` 复用统一的 ``_invalid_response_error`` 方法，
避免在各 feature Service 中重复同一段 ``IntegrationError`` 构造逻辑。
"""

from __future__ import annotations

from app.core.errors import IntegrationError


class RuoYiServiceMixin:
    """提供 RuoYi 防腐层 Service 通用的错误构造能力。

    子类必须定义类属性 ``_RESOURCE: str``，标识当前 Service 对应的
    RuoYi 资源名称（如 ``"video-publication"``、``"companion-turn"`` 等），
    该值会被填入 ``IntegrationError.resource`` 字段。
    """

    _RESOURCE: str

    def _invalid_response_error(
        self,
        *,
        operation: str,
        endpoint: str,
        reason: str,
    ) -> IntegrationError:
        """构造 RuoYi 响应格式异常的 ``IntegrationError``。

        Args:
            operation: 当前执行的操作名称，如 ``"sync"``、``"get"``、``"page"``。
            endpoint: 请求的 RuoYi 端点路径。
            reason: 异常原因的可读描述。

        Returns:
            可直接 ``raise`` 的 ``IntegrationError`` 实例。
        """
        return IntegrationError(
            service="ruoyi",
            resource=self._RESOURCE,
            operation=operation,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details={"endpoint": endpoint, "reason": reason},
        )
