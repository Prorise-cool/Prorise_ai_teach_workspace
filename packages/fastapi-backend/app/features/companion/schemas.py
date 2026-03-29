from app.features.common import BootstrapStatus


class CompanionBootstrapResponse(BootstrapStatus):
    feature: str = "companion"
