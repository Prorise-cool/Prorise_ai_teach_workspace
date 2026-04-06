"""视频域共享的模型基类与序列化约定。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


def to_camel_case(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(segment.capitalize() for segment in tail)


class VideoCamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel_case,
        populate_by_name=True,
        serialize_by_alias=True,
    )
