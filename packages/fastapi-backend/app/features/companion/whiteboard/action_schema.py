from pydantic import BaseModel, Field


class WhiteboardAction(BaseModel):
    action: str
    payload: dict[str, object] = Field(default_factory=dict)
