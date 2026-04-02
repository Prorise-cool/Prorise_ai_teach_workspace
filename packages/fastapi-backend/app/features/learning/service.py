from datetime import datetime, timezone
from typing import Mapping

from app.core.errors import IntegrationError
from app.features.learning.schemas import (
    LONG_TERM_TABLE_BY_RESULT_TYPE,
    LearningBootstrapResponse,
    LearningPersistenceItem,
    LearningPersistenceRequest,
    LearningPersistenceResponse,
    LearningResultInput,
    LearningResultType
)
from app.shared.ruoyi_client import RuoYiClient


class LearningService:
    _RESOURCE = "learning-result"
    _OPERATION = "persist-batch"
    _ENDPOINT = "/internal/xiaomai/learning/results"

    def __init__(self, client_factory=None) -> None:
        self._client_factory = client_factory or RuoYiClient.from_settings

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

    async def persist_results(
        self,
        request: LearningPersistenceRequest
    ) -> LearningPersistenceResponse:
        preview = await self.prepare_persistence_preview(request)
        async with self._client_factory() as client:
            result = await client.post_single(
                self._ENDPOINT,
                resource=self._RESOURCE,
                operation=self._OPERATION,
                retry_enabled=False,
                json_body={
                    "userId": preview.user_id,
                    "records": [
                        self._to_ruoyi_record(record)
                        for record in preview.records
                    ]
                }
            )
        data = result.data
        records = self._require_record_items(data)
        table_summary = self._require_table_summary(data)
        response_user_id = self._first_present(data, "userId", "user_id", default=preview.user_id)
        return LearningPersistenceResponse.model_validate(
            {
                "user_id": response_user_id,
                "records": [
                    self._from_ruoyi_record(item, default_user_id=response_user_id)
                    for item in records
                ],
                "table_summary": table_summary,
                "traceability_rule": self._first_present(
                    data,
                    "traceabilityRule",
                    "traceability_rule",
                    default="version-or-updated-at"
                ),
            }
        )

    def _normalize_record(
        self,
        user_id: str,
        record: LearningResultInput
    ) -> LearningPersistenceItem:
        result_type = LearningResultType(record.result_type)
        occurred_at = record.occurred_at or record.updated_at or datetime.now(timezone.utc)
        updated_at = record.updated_at or occurred_at
        source_result_id = record.source_result_id or record.detail_ref or record.source_task_id or f"{record.result_type}:{record.source_session_id}"
        detail_ref = record.detail_ref or source_result_id
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
            source_result_id=source_result_id,
            occurred_at=occurred_at,
            updated_at=updated_at,
            score=record.score,
            question_total=record.question_total,
            correct_total=record.correct_total,
            question_text=record.question_text,
            wrong_answer_text=record.wrong_answer_text,
            reference_answer_text=record.reference_answer_text,
            target_type=record.target_type,
            target_ref_id=record.target_ref_id,
            path_title=record.path_title,
            step_count=record.step_count,
            analysis_summary=record.analysis_summary,
            status=record.status,
            detail_ref=detail_ref,
            version_no=version_no
        )

    @staticmethod
    def _to_ruoyi_record(record: LearningPersistenceItem) -> dict[str, object | None]:
        return {
            "tableName": record.table_name,
            "resultType": record.result_type,
            "sourceType": record.source_type,
            "sourceSessionId": record.source_session_id,
            "sourceTaskId": record.source_task_id,
            "sourceResultId": record.source_result_id,
            "occurredAt": record.occurred_at.isoformat().replace("+00:00", "Z"),
            "updatedAt": record.updated_at.isoformat().replace("+00:00", "Z"),
            "score": record.score,
            "questionTotal": record.question_total,
            "correctTotal": record.correct_total,
            "questionText": record.question_text,
            "wrongAnswerText": record.wrong_answer_text,
            "referenceAnswerText": record.reference_answer_text,
            "targetType": record.target_type,
            "targetRefId": record.target_ref_id,
            "pathTitle": record.path_title,
            "stepCount": record.step_count,
            "analysisSummary": record.analysis_summary,
            "status": record.status,
            "detailRef": record.detail_ref,
            "versionNo": record.version_no
        }

    @classmethod
    def _from_ruoyi_record(
        cls,
        item: dict[str, object],
        *,
        default_user_id: str
    ) -> dict[str, object | None]:
        return {
            "table_name": cls._first_present(item, "tableName", "table_name"),
            "user_id": cls._first_present(item, "userId", "user_id", default=default_user_id),
            "result_type": cls._first_present(item, "resultType", "result_type"),
            "source_type": cls._first_present(item, "sourceType", "source_type"),
            "source_session_id": cls._first_present(item, "sourceSessionId", "source_session_id"),
            "source_task_id": cls._first_present(item, "sourceTaskId", "source_task_id"),
            "source_result_id": cls._first_present(item, "sourceResultId", "source_result_id"),
            "occurred_at": cls._first_present(item, "occurredAt", "occurred_at"),
            "updated_at": cls._first_present(item, "updatedAt", "updated_at"),
            "score": cls._first_present(item, "score"),
            "question_total": cls._first_present(item, "questionTotal", "question_total"),
            "correct_total": cls._first_present(item, "correctTotal", "correct_total"),
            "question_text": cls._first_present(item, "questionText", "question_text"),
            "wrong_answer_text": cls._first_present(item, "wrongAnswerText", "wrong_answer_text"),
            "reference_answer_text": cls._first_present(item, "referenceAnswerText", "reference_answer_text"),
            "target_type": cls._first_present(item, "targetType", "target_type"),
            "target_ref_id": cls._first_present(item, "targetRefId", "target_ref_id"),
            "path_title": cls._first_present(item, "pathTitle", "path_title"),
            "step_count": cls._first_present(item, "stepCount", "step_count"),
            "analysis_summary": cls._first_present(item, "analysisSummary", "analysis_summary"),
            "status": cls._first_present(item, "status"),
            "detail_ref": cls._first_present(item, "detailRef", "detail_ref"),
            "version_no": cls._first_present(item, "versionNo", "version_no"),
        }

    @staticmethod
    def _first_present(payload: dict[str, object], *keys: str, default=None):
        for key in keys:
            if key in payload and payload[key] is not None:
                return payload[key]
        return default

    def _require_record_items(self, payload: Mapping[str, object]) -> list[dict[str, object]]:
        records = self._first_present(payload, "records", default=[])
        if not isinstance(records, list):
            raise self._invalid_response_error("records is not a list")

        normalized_records: list[dict[str, object]] = []
        for index, item in enumerate(records):
            if not isinstance(item, Mapping):
                raise self._invalid_response_error(f"records[{index}] is not an object")
            normalized_records.append(dict(item))
        return normalized_records

    def _require_table_summary(self, payload: Mapping[str, object]) -> dict[str, str]:
        table_summary = self._first_present(payload, "tableSummary", "table_summary", default=self.table_catalog())
        if not isinstance(table_summary, Mapping):
            raise self._invalid_response_error("tableSummary is not an object")
        return {str(key): str(value) for key, value in table_summary.items()}

    def _invalid_response_error(self, reason: str) -> IntegrationError:
        return IntegrationError(
            service="ruoyi",
            resource=self._RESOURCE,
            operation=self._OPERATION,
            code="RUOYI_INVALID_RESPONSE",
            message="RuoYi 响应格式异常",
            status_code=502,
            retryable=False,
            details={
                "endpoint": self._ENDPOINT,
                "reason": reason,
            }
        )
