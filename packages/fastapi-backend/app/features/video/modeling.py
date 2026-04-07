"""视频域共享的模型基类与序列化约定。

``VideoCamelModel`` 已统一到 ``app.schemas.common.CamelCaseModel``，
本模块仅作兼容性重新导出，供视频域已有 import 路径继续工作。
"""

from __future__ import annotations

from app.schemas.common import CamelCaseModel as VideoCamelModel  # noqa: F401
from app.schemas.common import to_camel_case  # noqa: F401

__all__ = ["VideoCamelModel", "to_camel_case"]
