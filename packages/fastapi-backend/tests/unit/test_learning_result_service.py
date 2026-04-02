import asyncio
from datetime import datetime, timezone
import json

import httpx
import pytest

from app.core.errors import IntegrationError
from app.features.learning.schemas import (
    LearningPersistenceRequest,
    LearningResultInput,
    LearningResultStatus,
    LearningResultType,
    LearningSourceType
)
from app.features.learning.service import LearningService
from app.shared.ruoyi_client import RuoYiClient


def test_learning_service_catalog_includes_all_long_term_result_types() -> None:
    service = LearningService()

    assert service.table_catalog() == {
        "checkpoint": "xm_learning_record",
        "quiz": "xm_quiz_result",
        "wrongbook": "xm_learning_wrongbook",
        "recommendation": "xm_learning_recommendation",
        "path": "xm_learning_path"
    }


def test_learning_service_preserves_path_version_and_traceability_timestamp() -> None:
    service = LearningService()
    updated_at = datetime(2026, 3, 28, 18, 30, tzinfo=timezone.utc)
    request = LearningPersistenceRequest(
        user_id="student-001",
        records=[
            LearningResultInput(
                result_type=LearningResultType.PATH,
                source_type=LearningSourceType.LEARNING,
                source_session_id="session-001",
                source_task_id="task-001",
                source_result_id="result-001",
                occurred_at=updated_at,
                updated_at=updated_at,
                analysis_summary="路径版本 2 需要保留",
                status=LearningResultStatus.COMPLETED,
                detail_ref="path-001",
                version_no=2,
                path_title="高三冲刺路径",
                step_count=6
            )
        ]
    )

    payload = asyncio.run(service.prepare_persistence_preview(request))

    record = payload.records[0]
    assert record.table_name == "xm_learning_path"
    assert record.version_no == 2
    assert record.updated_at == updated_at
    assert record.occurred_at == updated_at
    assert record.detail_ref == "path-001"
    assert record.path_title == "高三冲刺路径"
    assert record.step_count == 6


def test_learning_service_persists_batch_to_ruoyi_and_preserves_detail_fields() -> None:
    captured_payloads: list[dict[str, object]] = []
    captured_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_paths.append(request.url.path)
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        captured_payloads.append(payload)
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "userId": payload["userId"],
                    "records": [
                        {
                            **item,
                            "tableName": item["tableName"],
                            "userId": payload["userId"],
                            "occurredAt": item["occurredAt"],
                            "updatedAt": item["updatedAt"],
                        }
                        for item in payload["records"]
                    ],
                    "tableSummary": {
                        "checkpoint": "xm_learning_record",
                        "quiz": "xm_quiz_result",
                        "wrongbook": "xm_learning_wrongbook",
                        "recommendation": "xm_learning_recommendation",
                        "path": "xm_learning_path",
                    },
                    "traceabilityRule": "version-or-updated-at",
                },
            },
        )

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    service = LearningService(client_factory=client_factory)
    request = LearningPersistenceRequest(
        user_id="student-009",
        records=[
            LearningResultInput(
                result_type=LearningResultType.QUIZ,
                source_type=LearningSourceType.VIDEO,
                source_session_id="session-009",
                source_task_id="task-009",
                question_total=12,
                correct_total=10,
                analysis_summary="quiz 结果摘要",
                status=LearningResultStatus.COMPLETED,
            ),
            LearningResultInput(
                result_type=LearningResultType.WRONGBOOK,
                source_type=LearningSourceType.QUIZ,
                source_session_id="session-010",
                source_task_id="task-010",
                question_text="题干",
                wrong_answer_text="错误答案",
                reference_answer_text="标准答案",
                analysis_summary="错题摘要",
                status=LearningResultStatus.FAILED,
            ),
            LearningResultInput(
                result_type=LearningResultType.RECOMMENDATION,
                source_type=LearningSourceType.LEARNING,
                source_session_id="session-011",
                source_task_id="task-011",
                target_type="knowledge_point",
                target_ref_id="kp-011",
                analysis_summary="推荐摘要",
                status=LearningResultStatus.COMPLETED,
            ),
        ],
    )

    payload = asyncio.run(service.persist_results(request))

    assert payload.records[0].source_result_id == "task-009"
    assert payload.records[0].detail_ref == "task-009"
    assert payload.records[0].question_total == 12
    assert payload.records[0].correct_total == 10
    assert payload.records[1].question_text == "题干"
    assert payload.records[1].wrong_answer_text == "错误答案"
    assert payload.records[1].reference_answer_text == "标准答案"
    assert payload.records[2].target_type == "knowledge_point"
    assert payload.records[2].target_ref_id == "kp-011"
    assert captured_paths == ["/internal/xiaomai/learning/results"]
    assert captured_payloads[0]["userId"] == "student-009"
    assert captured_payloads[0]["records"][0]["sourceResultId"] == "task-009"
    assert captured_payloads[0]["records"][0]["tableName"] == "xm_quiz_result"
    assert captured_payloads[0]["records"][0]["questionTotal"] == 12
    assert captured_payloads[0]["records"][0]["correctTotal"] == 10
    assert captured_payloads[0]["records"][1]["questionText"] == "题干"
    assert captured_payloads[0]["records"][1]["wrongAnswerText"] == "错误答案"
    assert captured_payloads[0]["records"][1]["referenceAnswerText"] == "标准答案"
    assert captured_payloads[0]["records"][2]["targetType"] == "knowledge_point"
    assert captured_payloads[0]["records"][2]["targetRefId"] == "kp-011"


def test_learning_service_uses_batch_user_id_when_ruoyi_record_omits_user_id() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8")) if request.content else None
        return httpx.Response(
            200,
            json={
                "code": 200,
                "msg": "ok",
                "data": {
                    "userId": payload["userId"],
                    "records": [
                        {
                            "tableName": "xm_learning_path",
                            "resultType": "path",
                            "sourceType": "learning",
                            "sourceSessionId": "session-301",
                            "sourceTaskId": "task-301",
                            "sourceResultId": "path-result-301",
                            "occurredAt": "2026-03-28T18:30:00Z",
                            "updatedAt": "2026-03-28T18:35:00Z",
                            "analysisSummary": "路径版本 3 已落表",
                            "status": "completed",
                            "detailRef": "path-detail-301",
                            "versionNo": 3
                        }
                    ],
                    "tableSummary": {
                        "path": "xm_learning_path",
                    },
                    "traceabilityRule": "version-or-updated-at",
                },
            },
        )

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    service = LearningService(client_factory=client_factory)
    request = LearningPersistenceRequest(
        user_id="student-301",
        records=[
            LearningResultInput(
                result_type=LearningResultType.PATH,
                source_type=LearningSourceType.LEARNING,
                source_session_id="session-301",
                source_task_id="task-301",
                source_result_id="path-result-301",
                occurred_at=datetime(2026, 3, 28, 18, 30, tzinfo=timezone.utc),
                updated_at=datetime(2026, 3, 28, 18, 35, tzinfo=timezone.utc),
                analysis_summary="路径版本 3 已落表",
                status=LearningResultStatus.COMPLETED,
                detail_ref="path-detail-301",
                version_no=3,
            )
        ],
    )

    payload = asyncio.run(service.persist_results(request))

    assert payload.user_id == "student-301"
    assert payload.records[0].user_id == "student-301"
    assert payload.records[0].table_name == "xm_learning_path"
    assert payload.records[0].version_no == 3


@pytest.mark.parametrize(
    ("data_payload", "expected_reason"),
    [
        ({"userId": "student-401", "records": "oops"}, "records is not a list"),
        ({"userId": "student-401", "records": ["oops"]}, "records[0] is not an object"),
    ]
)
def test_learning_service_rejects_malformed_success_payload(
    data_payload: dict[str, object],
    expected_reason: str
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"code": 200, "msg": "ok", "data": data_payload},
        )

    def client_factory() -> RuoYiClient:
        return RuoYiClient(
            base_url="http://ruoyi.local",
            transport=httpx.MockTransport(handler),
            timeout_seconds=0.01,
            retry_attempts=0,
            retry_delay_seconds=0.0,
        )

    service = LearningService(client_factory=client_factory)
    request = LearningPersistenceRequest(
        user_id="student-401",
        records=[
            LearningResultInput(
                result_type=LearningResultType.QUIZ,
                source_type=LearningSourceType.VIDEO,
                source_session_id="session-401",
                source_task_id="task-401",
                analysis_summary="bad payload",
                status=LearningResultStatus.COMPLETED,
            )
        ],
    )

    with pytest.raises(IntegrationError) as exc_info:
        asyncio.run(service.persist_results(request))

    assert exc_info.value.code == "RUOYI_INVALID_RESPONSE"
    assert exc_info.value.details["reason"] == expected_reason
