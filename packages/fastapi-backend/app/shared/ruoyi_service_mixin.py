"""RuoYi 防腐层服务共享 Mixin — 提供通用的响应校验、错误构造和 client factory 解析方法。

所有与 RuoYi 后端对接的业务 Service 均可继承 ``RuoYiServiceMixin``，
通过声明类属性 ``_RESOURCE`` 复用统一的 ``_invalid_response_error`` 方法，
并通过 ``_resolve_factory`` 方法在有用户上下文时自动切换到用户 token 的客户端。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.errors import IntegrationError

if TYPE_CHECKING:
    from app.core.security import AccessContext
    from app.shared.ruoyi_client import RuoYiClientFactory


class RuoYiServiceMixin:
    """提供 RuoYi 防腐层 Service 通用的错误构造与 client factory 解析能力。

    子类必须定义类属性 ``_RESOURCE: str``，标识当前 Service 对应的
    RuoYi 资源名称（如 ``"video-publication"``、``"companion-turn"`` 等），
    该值会被填入 ``IntegrationError.resource`` 字段。

    子类应在 ``__init__`` 中设置 ``_client_factory`` 属性，
    ``_resolve_factory`` 方法将在有用户上下文时自动切换到用户 token 的客户端。
    """

    _RESOURCE: str
    _client_factory: "RuoYiClientFactory"

    def _uses_default_factory(self) -> bool:
        """判断当前 client factory 是否仍为默认 ``from_settings``。

        这里不能使用 ``is`` 做对象身份比较，因为每次访问 classmethod
        都会生成新的 bound method 对象；使用 ``==`` 才能正确识别默认工厂。
        """
        from app.shared.ruoyi_client import RuoYiClient

        return self._client_factory == RuoYiClient.from_settings

    def _resolve_factory(self, access_context: "AccessContext | None" = None) -> "RuoYiClientFactory":
        """选择 client factory：有用户上下文时用用户 token，否则用默认。

        优先级规则：
        1. 如果 ``_client_factory`` 已被外部注入（非默认 ``from_settings``），
           始终使用注入的 factory（测试 mock 场景）。
        2. 如果有 ``access_context``，使用用户 token 创建临时客户端。
        3. 否则回退到默认 ``from_settings``。

        Args:
            access_context: 可选的已认证用户安全上下文。

        Returns:
            可直接调用以获取 ``RuoYiClient`` 实例的工厂函数。
        """
        from app.shared.ruoyi_client import build_client_factory

        if not self._uses_default_factory():
            return self._client_factory
        return build_client_factory(access_context)

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
