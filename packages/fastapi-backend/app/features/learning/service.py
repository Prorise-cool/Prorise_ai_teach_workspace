"""学习结果持久化业务服务。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Mapping

from app.core.errors import IntegrationError
from app.features.learning.schemas import (
    LONG_TERM_TABLE_BY_RESULT_TYPE,
    ActiveLearningPath,
    LatestRecommendation,
    LearningBootstrapResponse,
    LearningCenterAggregateResponse,
    LearningPersistenceItem,
    LearningPersistenceRequest,
    LearningPersistenceResponse,
    LearningResultInput,
    LearningResultType
)
from app.shared.ruoyi_client import RuoYiClient
from app.shared.ruoyi_service_mixin import RuoYiServiceMixin

if TYPE_CHECKING:
    from app.core.security import AccessContext


class LearningService(RuoYiServiceMixin):
    """学习结果持久化服务，与 RuoYi 批量交互。"""
    _RESOURCE = "learning-result"
    _OPERATION = "persist-batch"
    _ENDPOINT = "/internal/xiaomai/learning/results"

    def __init__(self, client_factory=None) -> None:
        """初始化学习结果持久化服务。"""
        self._client_factory = client_factory or RuoYiClient.from_settings

    async def bootstrap_status(self) -> LearningBootstrapResponse:
        """返回学习功能域 bootstrap 状态。"""
        return LearningBootstrapResponse()

    def table_catalog(self) -> dict[str, str]:
        """返回结果类型到数据库表名的映射。"""
        return {result_type.value: table_name for result_type, table_name in LONG_TERM_TABLE_BY_RESULT_TYPE.items()}

    def table_name_for(self, result_type: LearningResultType) -> str:
        """根据结果类型获取对应的数据库表名。"""
        return LONG_TERM_TABLE_BY_RESULT_TYPE[result_type]

    async def prepare_persistence_preview(
        self,
        request: LearningPersistenceRequest
    ) -> LearningPersistenceResponse:
        """预览学习结果的持久化映射（不写入远端）。"""
        records = [
            self._normalize_record(request.user_id, record)
            for record in request.records
        ]
        return LearningPersistenceResponse(
            user_id=request.user_id,
            records=records,
            table_summary=self.table_catalog()
        )

    async def fetch_quiz_history(
        self,
        quiz_id: str,
        user_id: str,
        *,
        access_context: "AccessContext | None" = None,
    ) -> dict[str, object] | None:
        """从 RuoYi 读取 xm_quiz_result 历史答卷（只读）。

        Args:
            quiz_id: 测验 ID（对应 xm_quiz_result.source_result_id 或 detail_ref）。
            user_id: 请求发起者 ID（用于权限校验日志，不参与 URL 拼接）。
            access_context: 可选的已认证用户上下文，提供时使用用户 token。

        Returns:
            RuoYi 返回的原始 dict；当 RuoYi 返回 404 时返回 None。

        Raises:
            IntegrationError: RuoYi 非 404 的其他失败，status_code=503。
        """
        endpoint = f"/internal/xiaomai/learning/results/quiz/{quiz_id}"
        try:
            async with self._resolve_authenticated_factory(access_context)() as client:
                result = await client.get_single(
                    endpoint,
                    resource="learning-result",
                    operation="fetch-quiz-history",
                )
        except IntegrationError as error:
            # RuoYi 明确 404 -> 历史不存在，交由调用方决定 404/空态；
            # 其他错误统一上升为 503，避免把上游不稳定暴露为 500/502。
            if error.status_code == 404:
                return None
            raise IntegrationError(
                service="ruoyi",
                resource="learning-result",
                operation="fetch-quiz-history",
                code="QUIZ_HISTORY_UPSTREAM_UNAVAILABLE",
                message="历史答卷暂时无法获取",
                status_code=503,
                retryable=True,
                details={
                    "endpoint": endpoint,
                    "user_id": user_id,
                    "upstream_code": error.code,
                    "upstream_status": error.status_code,
                },
            ) from error
        data = result.data
        if data is None:
            return None
        if isinstance(data, Mapping):
            return dict(data)
        raise self._invalid_response_error(
            "quiz history data is not an object",
            operation="fetch-quiz-history",
            endpoint=endpoint,
        )

    async def persist_results(
        self,
        request: LearningPersistenceRequest,
        *,
        access_context: "AccessContext | None" = None,
    ) -> LearningPersistenceResponse:
        """将学习结果批量写入远端并返回响应。

        Args:
            request: 学习结果持久化请求。
            access_context: 可选的已认证用户上下文，提供时使用用户 token 调用 RuoYi。
        """
        preview = await self.prepare_persistence_preview(request)
        async with self._resolve_authenticated_factory(access_context)() as client:
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
            version_no=version_no,
            question_items_json=record.question_items_json,
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
            "versionNo": record.version_no,
            "questionItemsJson": record.question_items_json,
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
            "question_items_json": cls._first_present(item, "questionItemsJson", "question_items_json"),
        }

    @classmethod
    def build_learning_center_aggregate(
        cls,
        payload: Mapping[str, object] | None,
    ) -> LearningCenterAggregateResponse:
        """从 RuoYi 聚合响应构造学习中心聚合响应（TASK-007）。

        上游字段任一缺失 → 对应字段保持 None（不硬编码占位）。
        接受 camelCase 与 snake_case 两种键名，优先 camelCase（RuoYi 默认）。
        """
        if not payload:
            return LearningCenterAggregateResponse()

        average_quiz_score = cls._first_present(
            payload, "averageQuizScore", "average_quiz_score"
        )

        latest_raw = cls._first_present(
            payload, "latestRecommendation", "latest_recommendation"
        )
        latest_recommendation: LatestRecommendation | None = None
        if isinstance(latest_raw, Mapping):
            summary = cls._first_present(latest_raw, "summary")
            target_ref_id = cls._first_present(latest_raw, "targetRefId", "target_ref_id")
            source_time = cls._first_present(latest_raw, "sourceTime", "source_time")
            if summary is not None and target_ref_id is not None and source_time is not None:
                latest_recommendation = LatestRecommendation.model_validate(
                    {
                        "summary": summary,
                        "targetRefId": target_ref_id,
                        "sourceTime": source_time,
                    }
                )

        path_raw = cls._first_present(
            payload, "activeLearningPath", "active_learning_path"
        )
        active_learning_path: ActiveLearningPath | None = None
        if isinstance(path_raw, Mapping):
            path_id = cls._first_present(path_raw, "pathId", "path_id")
            title = cls._first_present(path_raw, "title")
            completed = cls._first_present(
                path_raw, "completedStepCount", "completed_step_count"
            )
            total = cls._first_present(path_raw, "totalStepCount", "total_step_count")
            version_no = cls._first_present(path_raw, "versionNo", "version_no")
            if all(v is not None for v in (path_id, title, completed, total, version_no)):
                active_learning_path = ActiveLearningPath.model_validate(
                    {
                        "pathId": path_id,
                        "title": title,
                        "completedStepCount": completed,
                        "totalStepCount": total,
                        "versionNo": version_no,
                    }
                )

        return LearningCenterAggregateResponse(
            average_quiz_score=average_quiz_score if isinstance(average_quiz_score, int) else None,
            latest_recommendation=latest_recommendation,
            active_learning_path=active_learning_path,
        )

    @staticmethod
    def _first_present(payload: Mapping[str, object], *keys: str, default=None):
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

    def _invalid_response_error(  # type: ignore[override]
        self,
        reason: str = "",
        *,
        operation: str = "",
        endpoint: str = "",
    ) -> IntegrationError:
        """简化包装：当仅传 reason 时自动使用类级 _OPERATION / _ENDPOINT。"""
        return super()._invalid_response_error(
            operation=operation or self._OPERATION,
            endpoint=endpoint or self._ENDPOINT,
            reason=reason,
        )
