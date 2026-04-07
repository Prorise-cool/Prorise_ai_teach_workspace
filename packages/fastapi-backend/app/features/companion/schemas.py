"""伴学功能域 schema。"""

from app.features.common import BootstrapStatus


class CompanionBootstrapResponse(BootstrapStatus):
    """伴学功能域 bootstrap 状态数据。"""
    feature: str = "companion"
