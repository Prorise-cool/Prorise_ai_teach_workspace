"""HTTP 请求重试工具。"""

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


async def with_retry(
    operation: Callable[[], Awaitable[T]],
    retries: int = 2,
    delay_seconds: float = 0.1,
) -> T:
    """带重试的异步操作执行器。

    对 *operation* 最多执行 ``retries + 1`` 次调用，每次失败后
    等待 *delay_seconds* 秒再重试。若所有尝试均失败则重新抛出
    最后一次捕获的异常。

    ``asyncio.CancelledError`` 和 ``KeyboardInterrupt`` 不会被
    捕获和重试，而是立即向上传播。

    Args:
        operation: 无参异步工厂函数，返回待重试的协程。
        retries: 最大重试次数（不含首次调用）。
        delay_seconds: 两次尝试之间的等待秒数。

    Returns:
        *operation* 的返回值。

    Raises:
        Exception: 最后一次尝试捕获到的异常。
        asyncio.CancelledError: 协程被取消时直接传播。
        KeyboardInterrupt: 进程中断时直接传播。
    """
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return await operation()
        except (asyncio.CancelledError, KeyboardInterrupt):
            raise
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt == retries:
                break
            await asyncio.sleep(delay_seconds)

    assert last_error is not None
    raise last_error
