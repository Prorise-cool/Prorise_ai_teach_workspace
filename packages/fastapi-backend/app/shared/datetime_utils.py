"""共享日期时间工具函数。

集中提供项目内部反复出现的日期时间解析、格式化辅助。原先分散在
`app/shared/ruoyi/mapper.py`、`app/shared/long_term/mapper.py`、
`app/shared/task/metadata.py`、`app/features/video/long_term/records.py`
等处的同名私有函数（``_parse_datetime`` / ``_format_ruoyi_datetime``
等）统一收口至本模块。

提供以下能力：

- ``parse_datetime``        — 解析任意 datetime/字符串 → ``datetime`` 或 ``None``
- ``format_ruoyi_datetime`` — datetime → RuoYi 后端约定的 ``YYYY-MM-DD HH:MM:SS`` 字符串
- ``format_iso8601``        — datetime → ISO8601 字符串（默认带 ``Z`` 后缀）
- ``utc_now``               — 返回当前 UTC ``datetime``（带 tzinfo）
"""

from __future__ import annotations

from datetime import UTC, datetime, timezone
from typing import Any

# RuoYi 后端通用日期时间格式（与 app.shared.ruoyi.mapper.RUOYI_DATETIME_FORMAT 一致）
RUOYI_DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"


def parse_datetime(value: Any) -> datetime | None:
    """解析任意输入为 ``datetime``。

    合并自 ``app/features/video/long_term/records.py`` 与
    ``app/shared/ruoyi/mapper.py`` 两处的 ``_parse_datetime`` 实现，
    取并集语义：

    - ``None`` 或 ``""`` → ``None``
    - 已是 ``datetime`` → 原样返回
    - 字符串：先按 RuoYi 格式 parse，失败回退到 ``fromisoformat``（``Z`` → ``+00:00``）；再失败抛 ``ValueError``
    - 其他类型 → 抛 ``ValueError``
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.strptime(value, RUOYI_DATETIME_FORMAT)
        except ValueError:
            normalized_value = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized_value)
    raise ValueError(f"unsupported datetime value: {value!r}")


def format_ruoyi_datetime(value: datetime | None) -> str | None:
    """将 ``datetime`` 格式化为 RuoYi 字符串格式。

    带时区的 datetime 会先转换为 UTC，再以 ``RUOYI_DATETIME_FORMAT`` 序列化。
    ``None`` 输入返回 ``None``。
    """
    if value is None:
        return None
    normalized = value.astimezone(UTC) if value.tzinfo is not None else value
    return normalized.strftime(RUOYI_DATETIME_FORMAT)


def format_iso8601(value: datetime, *, with_z: bool = True) -> str:
    """将 ``datetime`` 格式化为 ISO8601 字符串。

    Parameters
    ----------
    value : datetime
        必填。无 tzinfo 时会按 UTC 解释。
    with_z : bool, default True
        ``True`` 时输出尾部使用 ``Z`` 替代 ``+00:00``，对应前端常用格式。
    """
    normalized = (
        value.astimezone(timezone.utc)
        if value.tzinfo is not None
        else value.replace(tzinfo=timezone.utc)
    )
    rendered = normalized.isoformat()
    if with_z:
        return rendered.replace("+00:00", "Z")
    return rendered


def utc_now() -> datetime:
    """返回当前 UTC ``datetime``（带 tzinfo）。"""
    return datetime.now(UTC)
