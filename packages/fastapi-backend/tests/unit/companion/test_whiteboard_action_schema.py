"""Story 6.6: 白板动作协议与结构化降级 — 单元测试。"""

from __future__ import annotations

from app.features.companion.whiteboard.action_schema import (
    WhiteboardActionPayload,
    WhiteboardActionType,
    WhiteboardDegradedContent,
    build_degraded_content,
)


class TestWhiteboardActionType:
    """验证白板动作类型枚举。"""

    def test_all_types_defined(self) -> None:
        assert WhiteboardActionType.DRAW_FUNCTION == "draw_function"
        assert WhiteboardActionType.HIGHLIGHT_REGION == "highlight_region"
        assert WhiteboardActionType.ANIMATE_STEP == "animate_step"
        assert WhiteboardActionType.DRAW_SHAPE == "draw_shape"
        assert WhiteboardActionType.SHOW_EQUATION == "show_equation"


class TestWhiteboardActionPayload:
    """验证白板动作 payload schema。"""

    def test_minimal_payload(self) -> None:
        p = WhiteboardActionPayload(
            action_type=WhiteboardActionType.DRAW_FUNCTION,
            payload={"expression": "y = x^2"},
        )
        assert p.action_type == WhiteboardActionType.DRAW_FUNCTION
        assert p.render_uri is None

    def test_with_render_uri(self) -> None:
        p = WhiteboardActionPayload(
            action_type=WhiteboardActionType.ANIMATE_STEP,
            payload={"step": 1},
            render_uri="/renders/step1.png",
        )
        assert p.render_uri == "/renders/step1.png"


class TestDegradedContent:
    """验证白板降级内容构建。"""

    def test_build_degraded(self) -> None:
        content = build_degraded_content("渲染超时")
        assert isinstance(content, WhiteboardDegradedContent)
        assert len(content.steps) == 1
        assert "渲染超时" in content.steps[0]
        assert content.fallback_text == "渲染超时"

    def test_degraded_content_serialization(self) -> None:
        content = WhiteboardDegradedContent(
            steps=["步骤1", "步骤2"],
            fallback_text="降级文本",
        )
        data = content.model_dump()
        assert len(data["steps"]) == 2
