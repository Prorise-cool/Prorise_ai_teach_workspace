"""共享值类型转换工具函数。

集中提供项目内部反复出现的 ``Any`` → ``int`` / ``float`` / ``str`` / ``bool``
宽松转换辅助。原先分散在以下位置的私有 ``_coerce_*`` 函数收口至本模块：

- ``app/providers/tts/doubao_provider.py`` —— ``_coerce_int`` / ``_coerce_float``（带 default）
- ``app/features/video/service/_helpers.py`` —— ``_coerce_int``（夹紧到 ``>= 0``）
- ``app/features/companion/context_adapter/video_adapter.py`` —— ``_coerce_int``（夹紧到 ``>= 0``）

各调用方在迁移时通过 ``clamp_min`` 与 ``default`` 参数还原原语义。
"""

from __future__ import annotations

from typing import Any


def coerce_int(
    value: Any,
    default: int | None = None,
    *,
    clamp_min: int | None = None,
    clamp_max: int | None = None,
) -> int | None:
    """宽松转换为 ``int``，失败返回 ``default``。

    Parameters
    ----------
    value : Any
        待转换的原始值。``None`` / 空字符串视作缺失。
    default : int | None, default ``None``
        转换失败或缺失时的回退值。
    clamp_min : int | None, default ``None``
        若提供，结果将不小于该值（``max(clamp_min, result)``）。
    clamp_max : int | None, default ``None``
        若提供，结果将不大于该值（``min(clamp_max, result)``）。
    """
    if value is None or value == "":
        return default
    try:
        result = int(value)
    except (TypeError, ValueError):
        return default
    if clamp_min is not None and result < clamp_min:
        result = clamp_min
    if clamp_max is not None and result > clamp_max:
        result = clamp_max
    return result


def coerce_float(
    value: Any,
    default: float | None = None,
) -> float | None:
    """宽松转换为 ``float``，失败返回 ``default``。"""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def coerce_str(
    value: Any,
    default: str | None = None,
    *,
    strip: bool = False,
) -> str | None:
    """宽松转换为 ``str``。

    ``None`` 直接返回 ``default``。其他类型经 ``str()``，可选 ``strip``；
    去空白后若为 ``""`` 仍返回 ``default``。
    """
    if value is None:
        return default
    rendered = str(value)
    if strip:
        rendered = rendered.strip()
        if rendered == "":
            return default
    return rendered


def coerce_bool(value: Any, default: bool = False) -> bool:
    """宽松转换为 ``bool``。

    - ``bool`` 原样返回
    - ``int`` ：非零 → ``True``
    - ``str`` ：``1/true/yes/on`` → ``True``，``0/false/no/off/""`` → ``False``，其他 → ``default``
    - ``None`` → ``default``
    - 其他类型 → ``bool(value)``
    """
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off", ""}:
            return False
        return default
    return bool(value)
