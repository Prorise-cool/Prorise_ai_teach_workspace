from app.features.knowledge.schemas import KnowledgeBootstrapResponse


class KnowledgeService:
    async def bootstrap_status(self) -> KnowledgeBootstrapResponse:
        return KnowledgeBootstrapResponse()
