from pydantic import BaseModel


class BootstrapStatus(BaseModel):
    """功能域骨架的统一 data payload。"""

    feature: str
    status: str = "scaffolded"
    mode: str = "epic-0"
