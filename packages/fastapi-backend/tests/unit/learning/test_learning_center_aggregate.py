"""学习中心聚合响应构造器单元测试（TASK-007）。"""
from __future__ import annotations

from datetime import datetime, timezone

from app.features.learning.schemas import LearningCenterAggregateResponse
from app.features.learning.service import LearningService


def test_learning_center_response_includes_new_fields_when_ruoyi_returns_them() -> None:
    """RuoYi 聚合响应包含三字段时，FastAPI 响应应透传。"""
    upstream = {
        "averageQuizScore": 88,
        "latestRecommendation": {
            "summary": "继续巩固二次函数",
            "targetRefId": "quiz_0001",
            "sourceTime": "2026-04-20T09:30:00Z",
        },
        "activeLearningPath": {
            "pathId": "path_001",
            "title": "高一数学提升",
            "completedStepCount": 3,
            "totalStepCount": 10,
            "versionNo": 2,
        },
    }

    response = LearningService.build_learning_center_aggregate(upstream)

    assert isinstance(response, LearningCenterAggregateResponse)
    assert response.average_quiz_score == 88
    assert response.latest_recommendation is not None
    assert response.latest_recommendation.summary == "继续巩固二次函数"
    assert response.latest_recommendation.target_ref_id == "quiz_0001"
    assert response.latest_recommendation.source_time == datetime(
        2026, 4, 20, 9, 30, tzinfo=timezone.utc
    )
    assert response.active_learning_path is not None
    assert response.active_learning_path.path_id == "path_001"
    assert response.active_learning_path.title == "高一数学提升"
    assert response.active_learning_path.completed_step_count == 3
    assert response.active_learning_path.total_step_count == 10
    assert response.active_learning_path.version_no == 2


def test_learning_center_response_fields_null_when_ruoyi_missing() -> None:
    """RuoYi 聚合响应缺失三字段时，FastAPI 响应应为 None（不硬编码占位）。"""
    response = LearningService.build_learning_center_aggregate({})

    assert response.average_quiz_score is None
    assert response.latest_recommendation is None
    assert response.active_learning_path is None


def test_learning_center_response_handles_none_payload() -> None:
    """上游直接返回 None 时，也应返回三字段均 None 的响应。"""
    response = LearningService.build_learning_center_aggregate(None)

    assert response.average_quiz_score is None
    assert response.latest_recommendation is None
    assert response.active_learning_path is None


def test_learning_center_response_serializes_with_camel_case_aliases() -> None:
    """响应 by_alias 序列化时应使用 camelCase，以对齐前端合约。"""
    response = LearningCenterAggregateResponse(
        average_quiz_score=75,
        latest_recommendation=None,
        active_learning_path=None,
    )

    dumped = response.model_dump(by_alias=True)
    assert "averageQuizScore" in dumped
    assert "latestRecommendation" in dumped
    assert "activeLearningPath" in dumped
    assert dumped["averageQuizScore"] == 75


def test_learning_center_response_partial_recommendation_is_dropped() -> None:
    """上游 latestRecommendation 字段不完整时，整个字段置 None，避免半截数据。"""
    upstream = {
        "latestRecommendation": {
            "summary": "only summary, missing others",
        },
    }
    response = LearningService.build_learning_center_aggregate(upstream)
    assert response.latest_recommendation is None


def test_learning_center_response_accepts_snake_case_upstream_keys() -> None:
    """上游同时支持 snake_case 键名（向后兼容）。"""
    upstream = {
        "average_quiz_score": 66,
        "active_learning_path": {
            "path_id": "p2",
            "title": "复习",
            "completed_step_count": 0,
            "total_step_count": 5,
            "version_no": 1,
        },
    }
    response = LearningService.build_learning_center_aggregate(upstream)
    assert response.average_quiz_score == 66
    assert response.active_learning_path is not None
    assert response.active_learning_path.path_id == "p2"
    assert response.active_learning_path.completed_step_count == 0
    assert response.active_learning_path.total_step_count == 5
