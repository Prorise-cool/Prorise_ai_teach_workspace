"""腾讯 ADP 工作流配置数据模型。"""

from dataclasses import dataclass


@dataclass(slots=True)
class TencentAdpConfig:
    """腾讯 ADP 工作流配置，包含工作流名称和运行环境。"""
    workflow_name: str
    environment: str
