"""Phase 1: ClassroomCreateRequest 新增字段的契约测试。

守护点：
- 前端 camelCase (sceneCount / durationMinutes / interactiveMode) 正确映射到 snake_case
- 范围校验 (scene_count 1-30, duration_minutes 5-120)
- 字段缺失时走默认值 (scene_count=None, duration_minutes=None, interactive_mode=False)
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.features.classroom.schemas import ClassroomCreateRequest


def test_request_accepts_new_camel_case_fields() -> None:
    req = ClassroomCreateRequest.model_validate(
        {
            "requirement": "讲解 RSA 加密",
            "sceneCount": 15,
            "durationMinutes": 30,
            "interactiveMode": True,
        }
    )
    assert req.scene_count == 15
    assert req.duration_minutes == 30
    assert req.interactive_mode is True


def test_request_defaults_when_advanced_fields_missing() -> None:
    req = ClassroomCreateRequest.model_validate({"requirement": "讲解链式法则"})
    assert req.scene_count is None
    assert req.duration_minutes is None
    assert req.interactive_mode is False


def test_request_rejects_scene_count_out_of_range() -> None:
    with pytest.raises(ValidationError):
        ClassroomCreateRequest.model_validate(
            {"requirement": "x" * 5, "sceneCount": 0}
        )
    with pytest.raises(ValidationError):
        ClassroomCreateRequest.model_validate(
            {"requirement": "x" * 5, "sceneCount": 31}
        )


def test_request_rejects_duration_out_of_range() -> None:
    with pytest.raises(ValidationError):
        ClassroomCreateRequest.model_validate(
            {"requirement": "x" * 5, "durationMinutes": 4}
        )
    with pytest.raises(ValidationError):
        ClassroomCreateRequest.model_validate(
            {"requirement": "x" * 5, "durationMinutes": 121}
        )


def test_request_populate_by_name_also_accepts_snake_case() -> None:
    """populate_by_name=True → 两种命名都能进 Pydantic 实例。"""
    req = ClassroomCreateRequest.model_validate(
        {
            "requirement": "讲解傅里叶级数",
            "scene_count": 8,
            "duration_minutes": 20,
            "interactive_mode": True,
        }
    )
    assert req.scene_count == 8
    assert req.duration_minutes == 20
    assert req.interactive_mode is True
