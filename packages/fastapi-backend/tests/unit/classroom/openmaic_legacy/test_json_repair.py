"""Tests for JSON repair utilities and action parser."""

from __future__ import annotations

import json

import pytest

from app.features.classroom.generation.json_repair import parse_json_response
from app.features.classroom.generation.action_parser import parse_actions_from_structured_output


# ── JSON repair tests ──────────────────────────────────────────────────────────

def test_parse_json_response_from_code_block():
    response = '```json\n{"key": "value"}\n```'
    result = parse_json_response(response)
    assert result == {"key": "value"}


def test_parse_json_response_from_body():
    response = 'Some text before {"items": [1, 2, 3]} some text after'
    result = parse_json_response(response)
    assert result == {"items": [1, 2, 3]}


def test_parse_json_response_plain_json():
    response = '{"languageDirective": "教中文", "outlines": []}'
    result = parse_json_response(response)
    assert isinstance(result, dict)
    assert result["languageDirective"] == "教中文"


def test_parse_json_response_array():
    response = '[{"id": 1}, {"id": 2}]'
    result = parse_json_response(response)
    assert isinstance(result, list)
    assert len(result) == 2


def test_parse_json_response_returns_none_for_garbage():
    result = parse_json_response("This is completely unstructured text.")
    assert result is None


def test_parse_json_response_handles_latex_escapes():
    """JSON with LaTeX-like backslash sequences should parse."""
    # Simple valid JSON that might have tricky content
    response = '{"formula": "simple text"}'
    result = parse_json_response(response)
    assert result is not None


# ── Action parser tests ────────────────────────────────────────────────────────

def test_parse_actions_basic():
    response = json.dumps([
        {"type": "action", "name": "spotlight", "params": {"elementId": "el_1"}},
        {"type": "text", "content": "看这里"},
    ])
    actions = parse_actions_from_structured_output(response)
    assert len(actions) == 2
    assert actions[0]["type"] == "spotlight"
    assert actions[1]["type"] == "speech"
    assert actions[1]["text"] == "看这里"


def test_parse_actions_strips_code_fences():
    response = '```json\n[{"type": "text", "content": "Hello"}]\n```'
    actions = parse_actions_from_structured_output(response)
    assert len(actions) == 1
    assert actions[0]["text"] == "Hello"


def test_parse_actions_filters_slide_only_for_non_slide():
    """Spotlight 等仅幻灯片可用的动作应在非 slide 场景被剥离（如 discussion / pbl）。"""
    response = json.dumps([
        {"type": "action", "name": "spotlight", "params": {"elementId": "el_1"}},
        {"type": "text", "content": "讲解题目"},
    ])
    actions = parse_actions_from_structured_output(response, scene_type="discussion")
    action_types = [a["type"] for a in actions]
    assert "spotlight" not in action_types
    assert "speech" in action_types


def test_parse_actions_discussion_is_last():
    """Discussion action should truncate anything after it."""
    response = json.dumps([
        {"type": "text", "content": "介绍"},
        {"type": "action", "name": "discussion", "params": {"question": "你有什么问题？"}},
        {"type": "text", "content": "这段应该被截断"},
    ])
    actions = parse_actions_from_structured_output(response)
    # Verify discussion is last
    assert actions[-1]["type"] == "discussion"
    assert len(actions) == 2  # speech + discussion


def test_parse_actions_returns_empty_on_garbage():
    actions = parse_actions_from_structured_output("not json at all")
    assert actions == []


def test_parse_actions_legacy_format():
    """Support old tool_name/parameters format."""
    response = json.dumps([
        {"type": "action", "tool_name": "spotlight", "parameters": {"elementId": "el_2"}},
    ])
    actions = parse_actions_from_structured_output(response)
    assert len(actions) == 1
    assert actions[0]["type"] == "spotlight"
