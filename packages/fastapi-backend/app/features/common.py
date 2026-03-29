from pydantic import BaseModel


class BootstrapStatus(BaseModel):
    feature: str
    status: str = "scaffolded"
    mode: str = "epic-0"
