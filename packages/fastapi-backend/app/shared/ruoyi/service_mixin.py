"""RuoYi 防腐层服务共享 Mixin — 提供通用的响应校验、错误构造和 client factory 解析方法。

所有与 RuoYi 后端对接的业务 Service 均可继承 ``RuoYiServiceMixin``，
通过声明类属性 ``_RESOURCE`` 复用统一的 ``_invalid_response_error`` 方法，
并通过 ``_resolve_factory`` 方法在有显式请求鉴权时解析客户端。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.core.errors import AppError, IntegrationError

if TYPE_CHECKING:
    from app.core.security import AccessContext
    from app.shared.ruoyi.auth import RuoYiRequestAuth
    from app.shared.ruoyi.client import RuoYiClientFactory


class RuoYiServiceMixin:
    """提供 RuoYi 防腐层 Service 通用的错误构造与 client factory 解析能力。

    子类必须定义类属性 ``_RESOURCE: str``，标识当前 Service 对应的
    RuoYi 资源名称（如 ``"video-publication"``、``"companion-turn"`` 等），
    该值会被填入 ``IntegrationError.resource`` 字段。

    子类应在 ``__init__`` 中设置 ``_client_factory`` 属性。
    默认工厂仅用于声明"走真实 RuoYiClient"，真正执行时必须显式传入
    ``access_context`` 或 ``request_auth``，否则直接报错。
    """

    _RESOURCE: str
    _client_factory: "RuoYiClientFactory"

    def _uses_default_factory(self) -> bool:
        """判断当前 client factory 是否仍为默认 ``from_settings``。

        这里不能使用 ``is`` 做对象身份比较，因为每次访问 classmethod
        都会生成新的 bound method 对象；使用 ``==`` 才能正确识别默认工厂。
        """
        from app.shared.ruoyi.client import RuoYiClient

        return self._client_factory == RuoYiClient.from_settings

    def _resolve_factory(
        self,
        access_context: "AccessContext | None" = None,
        *,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> "RuoYiClientFactory":
        """解析本次调用的显式 client factory。

        优先级规则：
        1. 如果 ``_client_factory`` 已被外部注入（非默认 ``from_settings``），
           始终使用注入的 factory（测试 mock 场景）。
        2. 如果有显式 ``request_auth``，使用显式请求鉴权创建客户端。
        3. 如果有 ``access_context``，使用用户 token 创建临时客户端。
        4. 否则直接报错，禁止匿名回退。

        Args:
            access_context: 可选的已认证用户安全上下文。
            request_auth: 可选的显式 RuoYi 请求鉴权信息。

        Returns:
            可直接调用以获取 ``RuoYiClient`` 实例的工厂函数。
        """
        from app.shared.ruoyi.client import build_client_factory

        if not self._uses_default_factory():
            return self._client_factory
        try:
            return build_client_factory(access_context, request_auth=request_auth)
        except ValueError as exc:
            raise AppError(
                code="RUOYI_REQUEST_AUTH_REQUIRED",
                message="当前链路缺少显式 RuoYi 请求鉴权，禁止静默回退到匿名客户端或进程级 token",
                status_code=500,
                details={"resource": self._RESOURCE},
            ) from exc

    def _resolve_authenticated_factory(
        self,
        access_context: "AccessContext | None" = None,
        *,
        request_auth: "RuoYiRequestAuth | None" = None,
    ) -> "RuoYiClientFactory":
        """解析必须显式带鉴权上下文的 client factory。

        业务路由和 worker 写回链路都应明确声明本次调用到底使用用户 token
        还是显式透传的请求鉴权，而不是在缺少上下文时静默回退到匿名客户端。
        只有测试注入了自定义 ``client_factory`` 时，才允许绕过该约束。
        """
        if not self._uses_default_factory():
            return self._client_factory
        if request_auth is None and access_context is None:
            raise AppError(
                code="RUOYI_REQUEST_AUTH_REQUIRED",
                message="当前链路缺少显式 RuoYi 请求鉴权，禁止静默回退到匿名客户端或进程级 token",
                status_code=500,
                details={"resource": self._RESOURCE},
            )
        return self._resolve_factory(access_context, request_auth=request_auth)

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
