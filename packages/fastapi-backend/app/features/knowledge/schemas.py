"""知识检索功能域 schema。"""

from app.features.common import BootstrapStatus


class KnowledgeBootstrapResponse(BootstrapStatus):
    """知识检索功能域 bootstrap 状态数据。"""
    feature: str = "knowledge"
