"""Agent action parser — converts structured JSON array output to Action dicts.

Ported from OpenMAIC /lib/generation/action-parser.ts.
Produces action dicts rather than typed objects for flexibility.
"""

from __future__ import annotations

import json
import logging
import re
import uuid

from app.features.classroom.generation.json_repair import _try_parse_json

logger = logging.getLogger(__name__)

# Actions that only make sense in slide scenes
SLIDE_ONLY_ACTIONS: frozenset[str] = frozenset({"spotlight", "laser_pointer"})


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?\s*```\s*$", "", text)
    return text.strip()


def _new_action_id() -> str:
    return f"action_{uuid.uuid4().hex[:8]}"


def parse_actions_from_structured_output(
    response: str,
    scene_type: str | None = None,
    allowed_actions: list[str] | None = None,
) -> list[dict]:
    """Parse LLM JSON array response into list of action dicts.

    Expected input format:
      [{"type":"action","name":"spotlight","params":{"elementId":"..."}},
       {"type":"text","content":"speech content"},...]

    Also supports legacy format:
      [{"type":"action","tool_name":"spotlight","parameters":{...}},...]

    Returns empty list on parse failure.
    """
    # Step 1: Strip markdown fences
    cleaned = _strip_code_fences(response)

    # Step 2: Find JSON array bounds
    start_idx = cleaned.find("[")
    end_idx = cleaned.rfind("]")

    if start_idx == -1:
        logger.warning("No JSON array found in action response")
        return []

    if end_idx > start_idx:
        json_str = cleaned[start_idx : end_idx + 1]
    else:
        # Unclosed array — let partial_json handle it
        json_str = cleaned[start_idx:]

    # Step 3: Parse
    items = _parse_json_array(json_str)
    if items is None:
        return []

    if not isinstance(items, list):
        logger.warning("Parsed result is not an array")
        return []

    # Step 4: Convert to action dicts
    actions: list[dict] = []
    for item in items:
        if not isinstance(item, dict) or "type" not in item:
            continue

        if item["type"] == "text":
            text = str(item.get("content", "")).strip()
            if text:
                actions.append({
                    "id": _new_action_id(),
                    "type": "speech",
                    "text": text,
                })
        elif item["type"] == "action":
            # Support new format (name/params) and legacy (tool_name/parameters)
            action_name = item.get("name") or item.get("tool_name")
            action_params = item.get("params") or item.get("parameters") or {}
            action_id = item.get("action_id") or item.get("tool_id") or _new_action_id()

            if action_name:
                actions.append({
                    "id": action_id,
                    "type": action_name,
                    **action_params,
                })

    # Step 5: Ensure discussion is the last action
    discussion_indices = [i for i, a in enumerate(actions) if a.get("type") == "discussion"]
    if discussion_indices:
        first_discussion = discussion_indices[0]
        if first_discussion < len(actions) - 1:
            actions = actions[: first_discussion + 1]

    # Step 6: Filter slide-only actions from non-slide scenes
    if scene_type and scene_type != "slide":
        before_count = len(actions)
        actions = [a for a in actions if a.get("type") not in SLIDE_ONLY_ACTIONS]
        stripped = before_count - len(actions)
        if stripped:
            logger.info("Stripped %d slide-only action(s) from %s scene", stripped, scene_type)

    # Step 7: Filter by allowedActions whitelist
    if allowed_actions:
        before_count = len(actions)
        actions = [
            a for a in actions
            if a.get("type") == "speech" or a.get("type") in allowed_actions
        ]
        stripped = before_count - len(actions)
        if stripped:
            logger.info("Stripped %d disallowed action(s) by whitelist", stripped)

    return actions


def _parse_json_array(json_str: str) -> list | None:
    """Parse JSON array with multiple fallback strategies."""
    # Attempt 1: Standard parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Use our repair logic
    result = _try_parse_json(json_str)
    if result is not None:
        return result if isinstance(result, list) else None

    logger.warning("Failed to parse action JSON array")
    return None
