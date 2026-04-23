"""课堂 AgentProfile 的共享基类。

Wave 1.5 整合：原先 ``classroom/schemas.py`` (API 层) 和
``classroom/orchestration/schemas.py`` (Orchestration 层) 各自独立定义了
``AgentProfile``，共同字段重复三次；本模块抽出 ``AgentProfileBase``
保留公共字段，两层各自 extend 加自己的专属字段：

- API 层专属：``voice_config``（前端 / TTS 配置，camelCase alias = voiceConfig）
- Orchestration 层专属：``priority`` / ``allowed_actions``（LangGraph 调度）

两层仍保留各自的 ``AgentProfile`` 类名以兼容历史引用，但现在都继承同一
``AgentProfileBase``，字段定义与 role 枚举在此统一维护。
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

# Role 枚举 —— API 层与 Orchestration 层保持一致。
# 顺序差异 ("teacher"|"student"|"assistant" vs "teacher"|"assistant"|"student") 是
# 历史遗留，两层都兼容任意序，合并后统一使用 teacher|student|assistant。
AgentRole = Literal["teacher", "student", "assistant"]


class AgentProfileBase(BaseModel):
    """智能体画像公共字段基类。

    共同字段：id / name / role / persona / avatar / color。
    子类按所在层补充各自额外字段。
    """

    id: str
    name: str
    role: AgentRole = "teacher"
    persona: str = ""
    avatar: str | None = None
    color: str | None = None


__all__ = ["AgentProfileBase", "AgentRole"]
