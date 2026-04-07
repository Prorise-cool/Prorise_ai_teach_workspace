"""AI 教学智能体配置数据模型。"""

from dataclasses import dataclass


@dataclass(slots=True)
class AgentProfile:
    """智能体画像配置，定义智能体的标识、显示名称和语气风格。"""
    key: str
    display_name: str
    tone: str
