"""Classroom orchestration summarizers 单测。

覆盖 summarize_conversation / convert_messages_to_openai /
build_peer_context_section / build_state_context /
build_virtual_whiteboard_context 的关键分支。
"""
from __future__ import annotations

from app.features.classroom.orchestration.schemas import (
    AgentTurnSummary,
    ChatMessage,
    ClassroomContext,
    MessageMetadata,
    MessagePart,
    WhiteboardActionRecord,
)
from app.features.classroom.orchestration.summarizers import (
    build_peer_context_section,
    build_state_context,
    build_virtual_whiteboard_context,
    convert_messages_to_openai,
    summarize_conversation,
)


# ── summarize_conversation ─────────────────────────────────────────────────

def test_summarize_conversation_empty_returns_placeholder() -> None:
    assert summarize_conversation([]) == "暂无对话记录。"


def test_summarize_conversation_role_labels_and_truncation() -> None:
    messages = [
        {"role": "user", "content": "你好"},
        {"role": "assistant", "content": "你好同学"},
        {"role": "system", "content": "x" * 250},
    ]
    out = summarize_conversation(messages, max_content_length=100)
    assert "[学生] 你好" in out
    assert "[助手] 你好同学" in out
    assert "[系统]" in out
    # truncated long content ends with ...
    assert "..." in out


def test_summarize_conversation_limits_by_max_messages() -> None:
    messages = [{"role": "user", "content": str(i)} for i in range(20)]
    out = summarize_conversation(messages, max_messages=3)
    assert out.count("\n") == 2  # 3 lines → 2 newlines
    # only the last 3 kept
    assert "[学生] 17" in out
    assert "[学生] 19" in out
    assert "[学生] 0" not in out


# ── convert_messages_to_openai ─────────────────────────────────────────────

def test_convert_messages_skips_system_and_empty() -> None:
    messages = [
        ChatMessage(role="system", parts=[MessagePart(type="text", text="ignored")]),
        ChatMessage(role="user", parts=[MessagePart(type="text", text="   ")]),
        ChatMessage(role="user", parts=[MessagePart(type="text", text="真问题")]),
    ]
    out = convert_messages_to_openai(messages)
    assert out == [{"role": "user", "content": "真问题"}]


def test_convert_messages_assistant_action_result_shape() -> None:
    msg = ChatMessage(
        role="assistant",
        parts=[
            MessagePart(type="text", text="开讲"),
            MessagePart(
                type="action-wb_draw_circle",
                state="result",
                output={"success": True, "data": "circle-1"},
            ),
            MessagePart(
                type="action-wb_draw_rect",
                state="result",
                output={"success": False, "error": "denied"},
            ),
        ],
    )
    out = convert_messages_to_openai([msg])
    assert len(out) == 1
    assert out[0]["role"] == "assistant"
    # content is repr of a list of structured items
    content = out[0]["content"]
    assert "wb_draw_circle" in content
    assert "wb_draw_rect" in content
    assert "denied" in content


def test_convert_messages_other_agent_attributed_as_user() -> None:
    msg = ChatMessage(
        role="assistant",
        parts=[MessagePart(type="text", text="我先回答")],
        metadata=MessageMetadata(agent_id="tutor-b", sender_name="B 老师"),
    )
    out = convert_messages_to_openai([msg], current_agent_id="tutor-a")
    assert out[0]["role"] == "user"
    assert out[0]["content"].startswith("[B 老师]")


def test_convert_messages_user_interrupted_flag_appended() -> None:
    msg = ChatMessage(
        role="user",
        parts=[MessagePart(type="text", text="等等")],
        metadata=MessageMetadata(interrupted=True),
    )
    out = convert_messages_to_openai([msg])
    assert "已被中断" in out[0]["content"]


# ── build_peer_context_section ─────────────────────────────────────────────

def test_build_peer_context_empty_when_no_peers() -> None:
    assert build_peer_context_section([], "alice") == ""
    # only self
    responses = [
        AgentTurnSummary(
            agent_id="a1", agent_name="alice", content_preview="hi", action_count=0
        )
    ]
    assert build_peer_context_section(responses, "alice") == ""


def test_build_peer_context_lists_peers_with_action_counts() -> None:
    responses = [
        AgentTurnSummary(
            agent_id="b", agent_name="bob", content_preview="bob 说 " + "x" * 200, action_count=2
        ),
    ]
    section = build_peer_context_section(responses, "alice")
    assert "已发言的同伴" in section
    assert "bob" in section
    assert "[2个操作]" in section
    # preview truncated
    assert "..." in section


# ── build_state_context ────────────────────────────────────────────────────

def test_build_state_context_defaults_fallback() -> None:
    ctx = ClassroomContext()
    # no scene info, just whiteboard default closed
    out = build_state_context(ctx)
    assert "白板状态：已关闭" in out


def test_build_state_context_populated_scene_slide_truncates() -> None:
    ctx = ClassroomContext(
        current_scene_type="slide",
        slide_content="x" * 400,
        whiteboard_open=True,
    )
    out = build_state_context(ctx)
    assert "当前场景类型：幻灯片" in out
    # truncated to 300 chars of slide content
    assert "x" * 300 in out
    assert "x" * 400 not in out
    assert "白板状态：已打开" in out


def test_build_state_context_phase4_structured_fields_expand() -> None:
    """Phase 4：结构化字段（scene_title/body/key_points/recent_speech/canvas_summary）
    应逐项展开，并附带 `[elem:xxx]` 协议说明。"""
    ctx = ClassroomContext(
        current_scene_type="slide",
        scene_title="微积分基本定理",
        scene_body="牛顿-莱布尼茨公式将积分与原函数关联",
        key_points=["不定积分", "定积分", "微积分基本定理"],
        recent_speech="我们刚讲了定积分的几何意义",
        canvas_summary="  1. [id:e1] text: \"∫f(x)dx\" at (200,120)",
    )
    out = build_state_context(ctx)
    assert "当前场景：微积分基本定理" in out
    assert "牛顿-莱布尼茨公式" in out
    assert "不定积分、定积分、微积分基本定理" in out
    assert "最近旁白：我们刚讲了定积分的几何意义" in out
    assert "[id:e1]" in out
    assert "[elem:xxx]" in out  # 协议说明应被注入


def test_build_state_context_structured_fields_suppress_legacy_slide() -> None:
    """当 scene_title / scene_body / canvas_summary 任一存在时，不要再重复
    渲染老的 slide_content（避免 prompt 里画布内容出现两次）。"""
    ctx = ClassroomContext(
        scene_title="Foo",
        slide_content="LEGACY_SLIDE_TEXT",
    )
    out = build_state_context(ctx)
    assert "LEGACY_SLIDE_TEXT" not in out


def test_build_state_context_legacy_slide_still_used_when_structured_absent() -> None:
    """向下兼容：旧前端只传 slide_content 时继续工作。"""
    ctx = ClassroomContext(slide_content="老字段占位内容")
    out = build_state_context(ctx)
    assert "当前幻灯片内容：老字段占位内容" in out


# ── build_virtual_whiteboard_context ───────────────────────────────────────

def test_whiteboard_context_empty_ledger_returns_empty() -> None:
    ctx = ClassroomContext()
    assert build_virtual_whiteboard_context(ctx, None) == ""
    assert build_virtual_whiteboard_context(ctx, []) == ""


def test_whiteboard_context_counts_draws_and_clears() -> None:
    ctx = ClassroomContext()
    ledger = [
        WhiteboardActionRecord(action_name="wb_draw_circle", agent_id="a", agent_name="A"),
        WhiteboardActionRecord(action_name="wb_draw_rect", agent_id="b", agent_name="B"),
        WhiteboardActionRecord(action_name="wb_delete", agent_id="a", agent_name="A"),
        WhiteboardActionRecord(action_name="wb_clear", agent_id="a", agent_name="A"),
        WhiteboardActionRecord(action_name="wb_draw_text", agent_id="c", agent_name="C"),
    ]
    out = build_virtual_whiteboard_context(ctx, ledger)
    # after clear element_count reset, then +1 from draw_text
    assert "元素数量：1" in out
    # contributors include all drawers (draw events add)
    assert "A" in out and "B" in out and "C" in out
    assert "白板当前状态" in out
    assert "（白板已清空）" in out
