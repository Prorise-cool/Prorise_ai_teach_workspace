"""Provider HTTP 请求公共工具。

统一处理 httpx / OpenAI SDK 异常转换与 HTTP 状态码分类，供所有 Provider
实现复用，避免逐行复制 HTTP 错误处理逻辑。

抛出的标准异常类型（TimeoutError / ConnectionError / ValueError）
与 failover.classify_provider_error 保持对齐。
"""

from __future__ import annotations

from typing import NoReturn

import httpx

from app.providers.protocols import ProviderConfigurationError, ProviderRuntimeConfig

# 响应体截断长度，用于错误消息中嵌入的原始响应片段
ERROR_TEXT_TRUNCATE_LENGTH: int = 200


def raise_for_provider_status(provider_id: str, response: httpx.Response) -> None:
    """根据 HTTP 状态码抛出分类异常。

    异常类型与 ``failover.classify_provider_error`` 对齐：

    * 401/403 -> ``ValueError``  （认证/权限，不可重试）
    * 429/5xx -> ``ConnectionError``  （上游过载或故障，可重试）
    * 其他 4xx -> ``ValueError``  （客户端错误，不可重试）

    Args:
        provider_id: Provider 标识符，用于错误消息前缀。
        response: httpx 响应对象。

    Raises:
        ValueError: 认证失败或客户端请求错误。
        ConnectionError: 上游服务不可用或限流。
    """
    status = response.status_code
    if status < 400:
        return

    body_snippet = response.text[:ERROR_TEXT_TRUNCATE_LENGTH]

    if status in {401, 403}:
        raise ValueError(f"authentication failed: {body_snippet}")
    if status == 429 or status >= 500:
        raise ConnectionError(f"{provider_id} upstream status={status}: {body_snippet}")
    # 其他 4xx
    raise ValueError(f"{provider_id} bad request status={status}: {body_snippet}")


def handle_provider_request_error(provider_id: str, exc: Exception) -> NoReturn:
    """将 httpx 传输层异常转换为标准异常。

    转换规则：

    * ``httpx.TimeoutException``  -> ``TimeoutError``
    * ``httpx.RequestError``      -> ``ConnectionError``
    * 其他异常原样重新抛出

    Args:
        provider_id: Provider 标识符，用于错误消息前缀。
        exc: 捕获到的 httpx 异常。

    Raises:
        TimeoutError: 请求超时。
        ConnectionError: 网络层请求失败。
    """
    if isinstance(exc, httpx.TimeoutException):
        raise TimeoutError(f"{provider_id} request timed out") from exc
    if isinstance(exc, httpx.RequestError):
        raise ConnectionError(f"{provider_id} request failed: {exc}") from exc
    raise exc


def require_setting(config: ProviderRuntimeConfig, key: str) -> str:
    """从 Provider 运行时配置中读取必需的字符串字段。

    Args:
        config: Provider 运行时配置对象。
        key: 配置项键名。

    Returns:
        去除首尾空白后的配置值。

    Raises:
        ProviderConfigurationError: 配置项缺失或为空。
    """
    value = config.settings.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ProviderConfigurationError(f"{config.provider_id} 缺少配置项：{key}")
    return value.strip()


def handle_openai_request_error(provider_id: str, exc: Exception) -> NoReturn:
    """将 OpenAI SDK 异常转换为标准异常（与 failover.classify_provider_error 对齐）。

    Args:
        provider_id: Provider 标识符，用于错误消息前缀。
        exc: 捕获到的 OpenAI SDK 异常。

    Raises:
        TimeoutError: 请求超时。
        ConnectionError: 网络层请求失败或限流。
        ValueError: 认证失败。
    """
    from openai import APIConnectionError, APITimeoutError, AuthenticationError, RateLimitError

    if isinstance(exc, APITimeoutError):
        raise TimeoutError(f"{provider_id} request timed out") from exc
    if isinstance(exc, RateLimitError):
        raise ConnectionError(f"{provider_id} rate limited: {exc}") from exc
    if isinstance(exc, APIConnectionError):
        raise ConnectionError(f"{provider_id} connection failed: {exc}") from exc
    if isinstance(exc, AuthenticationError):
        raise ValueError(f"authentication failed: {exc}") from exc
    raise exc
