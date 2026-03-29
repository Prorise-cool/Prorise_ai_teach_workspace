from datetime import datetime, timezone

from app.features.learning.schemas import (
    LONG_TERM_TABLE_BY_RESULT_TYPE,
    LearningBootstrapResponse,
    LearningPersistenceItem,
    LearningPersistenceRequest,
    LearningPersistenceResponse,
    LearningResultInput,
    LearningResultType
)


class LearningService:
    async def bootstrap_status(self) -> LearningBootstrapResponse:
        return LearningBootstrapResponse()

    def table_catalog(self) -> dict[str, str]:
        return {result_type.value: table_name for result_type, table_name in LONG_TERM_TABLE_BY_RESULT_TYPE.items()}

    def table_name_for(self, result_type: LearningResultType) -> str:
        return LONG_TERM_TABLE_BY_RESULT_TYPE[result_type]

    async def prepare_persistence_preview(
        self,
        request: LearningPersistenceRequest
    ) -> LearningPersistenceResponse:
        records = [
            self._normalize_record(request.user_id, record)
            for record in request.records
        ]
        return LearningPersistenceResponse(
            user_id=request.user_id,
            records=records,
            table_summary=self.table_catalog()
        )

    def _normalize_record(
        self,
        user_id: str,
        record: LearningResultInput
    ) -> LearningPersistenceItem:
        result_type = LearningResultType(record.result_type)
        occurred_at = record.occurred_at or record.updated_at or datetime.now(timezone.utc)
        updated_at = record.updated_at or occurred_at
        detail_ref = record.detail_ref or record.source_result_id or record.source_session_id
        version_no = record.version_no
        if result_type == LearningResultType.PATH and version_no is None:
            version_no = 1

        return LearningPersistenceItem(
            table_name=self.table_name_for(result_type),
            user_id=user_id,
            result_type=record.result_type,
            source_type=record.source_type,
            source_session_id=record.source_session_id,
            source_task_id=record.source_task_id,
            source_result_id=record.source_result_id,
            occurred_at=occurred_at,
            updated_at=updated_at,
            score=record.score,
            analysis_summary=record.analysis_summary,
            status=record.status,
            detail_ref=detail_ref,
            version_no=version_no
        )
