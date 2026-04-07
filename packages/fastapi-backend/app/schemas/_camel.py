"""CamelCase 序列化基类 —— 全项目唯一定义。

本模块是 ``to_camel_case`` 函数与 ``CamelCaseModel`` 基类的 **唯一权威来源**。
所有需要 camelCase JSON 序列化的模型均应从此导入或从 ``app.schemas.common``
重新导出的入口导入，禁止在业务模块中重复定义。

``VideoCamelModel`` 是 ``CamelCaseModel`` 的别名，仅为视频域已有代码提供
平滑过渡，语义上完全等价。

本模块故意不依赖项目内任何其他模块，以避免循环导入。
"""

from pydantic import BaseModel, ConfigDict


def to_camel_case(value: str) -> str:
    """将 snake_case 字符串转换为 camelCase。

    用作 Pydantic ``alias_generator``，使 JSON 序列化输出遵循前端 camelCase 约定。

    Args:
        value: snake_case 格式的字段名，例如 ``"user_name"``。

    Returns:
        camelCase 格式的字符串，例如 ``"userName"``。
    """
    head, *tail = value.split("_")
    return head + "".join(segment.capitalize() for segment in tail)


class CamelCaseModel(BaseModel):
    """统一的 camelCase 序列化 Pydantic 基类。

    所有需要以 camelCase 输出 JSON 的模型均应继承此类，
    而非各自重复定义 ``alias_generator`` / ``populate_by_name`` / ``serialize_by_alias``。
    """

    model_config = ConfigDict(
        alias_generator=to_camel_case,
        populate_by_name=True,
        serialize_by_alias=True,
    )


# 保持视频域兼容性的别名
VideoCamelModel = CamelCaseModel
"""``CamelCaseModel`` 的别名，供视频域已有代码平滑过渡。"""
