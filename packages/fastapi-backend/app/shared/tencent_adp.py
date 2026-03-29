from dataclasses import dataclass


@dataclass(slots=True)
class TencentAdpConfig:
    workflow_name: str
    environment: str
