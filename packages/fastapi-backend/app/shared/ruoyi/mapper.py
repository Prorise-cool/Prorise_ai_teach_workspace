"""RuoYi 数据格式双向映射器，处理字段别名、状态码映射与日期时间转换。"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Mapping

from app.shared.datetime_utils import (
    RUOYI_DATETIME_FORMAT,
    parse_datetime as _shared_parse_datetime,
)


def _parse_datetime(value: Any) -> Any:
    """RuoYi mapper 内部使用的宽松解析：失败回退原值，不抛异常。"""
    if not isinstance(value, (datetime, str)):
        return value
    try:
        result = _shared_parse_datetime(value)
    except ValueError:
        return value
    return result if result is not None else value


def _format_datetime(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.strftime(RUOYI_DATETIME_FORMAT)
    return value


@dataclass(slots=True)
class RuoYiMapper:
    """RuoYi 数据双向映射器，支持字段别名、状态枚举和日期时间的自动转换。"""

    field_aliases: Mapping[str, str] = field(default_factory=dict)
    status_fields: Mapping[str, Mapping[Any, str]] = field(default_factory=dict)
    datetime_fields: set[str] = field(default_factory=set)

    def from_ruoyi(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        """将 RuoYi camelCase 字典转换为项目内部 snake_case 字典。"""
        reverse_aliases = {ruoyi_field: canonical_field for canonical_field, ruoyi_field in self.field_aliases.items()}
        normalized: dict[str, Any] = {}

        for key, value in payload.items():
            canonical_key = reverse_aliases.get(key, key)
            normalized[canonical_key] = self._normalize_value(canonical_key, value, inbound=True)

        return normalized

    def to_ruoyi(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        """将项目内部 snake_case 字典转换为 RuoYi camelCase 字典。"""
        serialized: dict[str, Any] = {}

        for key, value in payload.items():
            ruoyi_key = self.field_aliases.get(key, key)
            serialized[ruoyi_key] = self._normalize_value(key, value, inbound=False)

        return serialized

    def _normalize_value(self, canonical_key: str, value: Any, *, inbound: bool) -> Any:
        if canonical_key in self.datetime_fields:
            return _parse_datetime(value) if inbound else _format_datetime(value)

        if canonical_key in self.status_fields:
            return self._normalize_status(canonical_key, value, inbound=inbound)

        return value

    def _normalize_status(self, canonical_key: str, value: Any, *, inbound: bool) -> Any:
        aliases = self.status_fields.get(canonical_key, {})
        if inbound:
            if value in aliases:
                return aliases[value]

            string_value = str(value)
            if string_value in aliases:
                return aliases[string_value]

            if string_value.isdigit():
                numeric_value = int(string_value)
                if numeric_value in aliases:
                    return aliases[numeric_value]

            return value

        reverse_aliases: dict[str, Any] = {}
        for raw_value, canonical_value in aliases.items():
            reverse_aliases.setdefault(canonical_value, raw_value)
            reverse_aliases.setdefault(str(canonical_value), raw_value)
        if value in reverse_aliases:
            return reverse_aliases[value]

        string_value = str(value)
        if string_value in reverse_aliases:
            return reverse_aliases[string_value]

        return value
