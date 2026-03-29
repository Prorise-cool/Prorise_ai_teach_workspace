from dataclasses import dataclass


@dataclass(slots=True)
class AgentProfile:
    key: str
    display_name: str
    tone: str
