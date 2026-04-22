"""Code2Video 核心引擎——agent + LLM 通信 + 代码修复。

当前版本在保留 ManimCat 全量链路的同时，补齐了真正的 section 级代码生成与渲染能力：
- Stage 1: generate_design() → 全局 storyboard / layout contract
- Stage 2a: generate_section_code() → 单个 section 的代码生成
- Stage 2b: render_section() → 单个 section 渲染 + patch 修复
- Legacy: generate_all_code() / render_full_video_with_sections() 仍保留作兼容
"""

from __future__ import annotations

import json
import logging
import math
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ..constants import VIDEO_OUTPUT_FORMAT
from ..prompts.manimcat.api_codebook import SHARED_SPECIFICATION, build_api_index_module
from ..prompts.manimcat.prompt_loader import load_and_render
from .c2v_utils import get_output_dir
from .code_cleaner import clean_manim_code, extract_code_from_response
from .code_generator import generate_code_from_design
from .scene_designer import generate_scene_design

logger = logging.getLogger(__name__)

RENDER_SUCCESS_RATIO = 0.6
RENDER_COMPLETION_GRACE_SECONDS = 45.0
ALLOWED_LAYOUT_FAMILIES = {"center_stage", "two_column"}
DEFAULT_LAYOUT_FAMILY = "center_stage"
SUBTITLE_SAFE_ZONE_NOTE = (
    "reserve the bottom subtitle safe zone below y=-2.6; "
    "do not place persistent formulas, labels, or diagrams there"
)


def required_render_successes(
    total_sections: int,
    success_ratio: float = RENDER_SUCCESS_RATIO,
) -> int:
    """Return the minimum number of successful sections required by the quality gate."""
    if total_sections <= 0:
        return 0
    normalized_ratio = max(0.0, min(float(success_ratio), 1.0))
    return max(1, math.ceil(total_sections * normalized_ratio))


@dataclass
class Section:
    id: str
    title: str
    lecture_lines: List[str]
    animations: List[str]
    section_index: int = 0
    layout_family: str = DEFAULT_LAYOUT_FAMILY
    layout_line: str = ""
    narration_hint: str = ""
    start_state: str = ""
    end_state: str = ""
    raw_shot: str = ""
    design_text: str = ""


@dataclass
class TeachingOutline:
    topic: str
    target_audience: str
    sections: List[Dict[str, Any]]


@dataclass
class RunConfig:
    use_feedback: bool = True
    use_assets: bool = True
    api: Callable = None
    feedback_rounds: int = 2
    iconfinder_api_key: str = ""
    max_code_token_length: int = 10000
    max_fix_bug_tries: int = 10
    max_regenerate_tries: int = 10
    max_feedback_gen_code_tries: int = 3
    max_mllm_fix_bugs_tries: int = 3
    layout_hint: str | None = None
    static_guard_max_passes: int = 3
    patch_retry_max_retries: int = 1
    section_count: int | None = None
    section_duration_seconds: int | None = None
    section_codegen_max_tokens: int = 4000
    section_codegen_max_completion_tokens: int = 8000
    section_codegen_concurrency: int = 1
    render_quality: str = "l"


class TeachingVideoAgent:
    """ManimCat-aligned video generation agent.

    Preferred pipeline:
      1. generate_design() → structured storyboard with locked layout contract
      2. generate_section_code() → one-shot Manim code per section
      3. render_section() → render + patch retry for the section only

    Legacy compatibility:
      - generate_all_code()
      - render_full_video_with_sections()
    """

    def __init__(
        self,
        idx,
        knowledge_point,
        folder="CASES",
        cfg: Optional[RunConfig] = None,
    ):
        self.learning_topic = knowledge_point
        self.idx = idx
        self.cfg = cfg or RunConfig()

        self.API = self.cfg.api
        self.max_code_token_length = self.cfg.max_code_token_length
        self.max_fix_bug_tries = self.cfg.max_fix_bug_tries
        self.layout_hint = getattr(self.cfg, "layout_hint", None)
        self.static_guard_max_passes = max(
            1, int(getattr(self.cfg, "static_guard_max_passes", 3))
        )
        # patch retry 上限：保留非负下限，给出合理硬上限（5 次）防止无限重试，
        # 中间值由 settings / DB binding 控制（原代码 min(1, ...) 硬钳制为 1，
        # 导致管理后台/env 调高都无效；现解除限制到 0..5 区间）
        self.patch_retry_max_retries = max(
            0, min(5, int(getattr(self.cfg, "patch_retry_max_retries", 1)))
        )
        self.section_count = getattr(self.cfg, "section_count", None)
        self.section_duration_seconds = getattr(
            self.cfg, "section_duration_seconds", None
        )
        self.section_codegen_max_tokens = max(
            512, int(getattr(self.cfg, "section_codegen_max_tokens", 4000))
        )
        self.section_codegen_max_completion_tokens = max(
            self.section_codegen_max_tokens,
            int(
                getattr(
                    self.cfg,
                    "section_codegen_max_completion_tokens",
                    8000,
                )
            ),
        )
        self.section_codegen_concurrency = max(
            1, int(getattr(self.cfg, "section_codegen_concurrency", 1))
        )
        self.render_quality = self._normalize_render_quality(
            getattr(self.cfg, "render_quality", "l")
        )

        self.folder = folder
        self.output_dir = get_output_dir(
            idx=idx, knowledge_point=self.learning_topic, base_dir=folder
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.outline = None
        self.sections: list[Section] = []
        self.section_codes: dict[str, str] = {}
        self.section_videos: dict[str, str] = {}
        self.render_results: dict[str, Any] = {}
        self.render_summary: dict[str, Any] = {}
        self.section_status_callback: Optional[Callable[[Dict[str, Any]], None]] = None
        self.full_scene_video: Optional[str] = None

        self.design_text: str = ""
        self.design_goal: str = ""
        self.design_layout: str = ""
        self.design_object_rules: str = ""
        self.design_review: str = ""
        self.design_layout_family: str = DEFAULT_LAYOUT_FAMILY

        self.token_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

    def _request_api_and_track_tokens(self, prompt, max_tokens=10000, **request_kwargs):
        """Wrap API requests and accumulate token usage."""
        try:
            response, usage = self.API(
                prompt, max_tokens=max_tokens, **request_kwargs
            )
        except TypeError as exc:
            if "unexpected keyword argument" not in str(exc):
                raise
            response, usage = self.API(prompt, max_tokens=max_tokens)
        if usage:
            self.token_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
            self.token_usage["completion_tokens"] += usage.get("completion_tokens", 0)
            self.token_usage["total_tokens"] += usage.get("total_tokens", 0)
        return response

    # ── Stage 1: Scene Design ───────────────────────────────────

    def generate_design(self, duration_minutes: int = 5) -> tuple[str, list[Section]]:
        """Generate structured scene design via the ManimCat concept-designer."""
        actual_section_count = self.section_count or max(3, min(20, duration_minutes * 2))
        if self.section_duration_seconds is None:
            self.section_duration_seconds = int((duration_minutes * 60) / actual_section_count)

        design_file = self.output_dir / "manimcat_design.txt"

        if design_file.exists():
            logger.info("Found cached ManimCat design, loading...")
            design_text = design_file.read_text(encoding="utf-8")
        else:
            design_text = generate_scene_design(
                concept=self.learning_topic,
                duration_minutes=duration_minutes,
                section_count=self.section_count,
                section_duration=self.section_duration_seconds,
                layout_hint=self.layout_hint or DEFAULT_LAYOUT_FAMILY,
                api_func=self._request_api_and_track_tokens,
                max_tokens=self.max_code_token_length,
            )
            design_file.write_text(design_text, encoding="utf-8")

        self.design_text = design_text
        sections = self._parse_design_to_sections(design_text)
        self.sections = sections
        self.outline = TeachingOutline(
            topic=self.learning_topic,
            target_audience="students",
            sections=[
                {"id": s.id, "title": s.title, "content": s.title} for s in sections
            ],
        )
        logger.info(
            "Scene design generated: %d sections (layout_family=%s)",
            len(sections),
            self.design_layout_family,
        )
        return design_text, sections

    def _parse_design_to_sections(self, design_text: str) -> list[Section]:
        """Parse ManimCat <design> text into Section objects with per-section contracts."""
        design_body = self._extract_design_body(design_text)
        self.design_goal = self._extract_named_block(design_body, "Goal")
        self.design_layout = self._extract_named_block(design_body, "Layout")
        self.design_object_rules = self._extract_named_block(design_body, "Object Rules")
        self.design_review = self._extract_named_block(design_body, "Review")
        self.design_layout_family = self._resolve_layout_family(
            f"{self.layout_hint or ''}\n{self.design_layout}"
        )

        shot_blocks = list(self._extract_shot_blocks(design_body))
        sections: list[Section] = []
        for fallback_index, (shot_num, shot_title, shot_body) in enumerate(shot_blocks):
            title = shot_title.strip().splitlines()[0].strip() or f"第 {shot_num} 段"
            narration = (
                self._extract_inline_value(shot_body, r'narration_hint\s*:\s*"([^"]*)"')
                or title
            )
            layout_line = self._extract_multiline_value(shot_body, r"^layout\s+(.+)$")
            start_state = self._extract_multiline_value(
                shot_body, r"^- start state:\s*(.+)$"
            )
            end_state = self._extract_multiline_value(
                shot_body, r"^- end state:\s*(.+)$"
            )
            action_line = self._extract_multiline_value(shot_body, r"^- action:\s*(.+)$")
            section = Section(
                id=f"section_{shot_num}",
                title=title,
                lecture_lines=[narration],
                animations=[action_line or f"Shot {shot_num} animation"],
                section_index=fallback_index,
                layout_family=self._resolve_layout_family(
                    f"{layout_line or ''}\n{self.design_layout}"
                ),
                layout_line=layout_line or "",
                narration_hint=narration,
                start_state=start_state or "",
                end_state=end_state or "",
                raw_shot=shot_body.strip(),
            )
            sections.append(section)

        if not sections:
            sections = [
                Section(
                    id="section_1",
                    title=self.learning_topic,
                    lecture_lines=[self.learning_topic],
                    animations=["Main animation"],
                    section_index=0,
                    layout_family=self.design_layout_family,
                    narration_hint=self.learning_topic,
                    start_state="empty frame",
                    end_state="main concept introduced",
                    raw_shot=(
                        'duration 20s\n'
                        f'narration_hint: "{self.learning_topic}"\n'
                        f"layout {self.design_layout_family}\n"
                        "focus main_concept\n"
                        "enter title_card\n"
                        "keep title_card\n"
                        f"note {SUBTITLE_SAFE_ZONE_NOTE}"
                    ),
                )
            ]

        for index, section in enumerate(sections):
            previous = sections[index - 1] if index > 0 else None
            section.design_text = self._build_section_design(section, previous)

        return sections

    @staticmethod
    def _extract_design_body(design_text: str) -> str:
        match = re.search(r"<design>\s*(.*?)\s*</design>", design_text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return design_text.strip()

    @staticmethod
    def _extract_named_block(design_body: str, heading: str) -> str:
        pattern = re.compile(
            rf"##\s*{re.escape(heading)}\s*(.*?)(?=\n##\s+[A-Z]|\Z)",
            re.DOTALL,
        )
        match = pattern.search(design_body)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _extract_shot_blocks(design_body: str) -> list[tuple[int, str, str]]:
        pattern = re.compile(
            r"###\s*Shot\s+(\d+)\s*:\s*(.*?)(?=\n###\s*Shot|\n##\s*Review|\Z)",
            re.DOTALL,
        )
        blocks: list[tuple[int, str, str]] = []
        for match in pattern.finditer(design_body):
            shot_num = int(match.group(1))
            body = match.group(2).strip()
            first_line, _, remainder = body.partition("\n")
            shot_title = first_line.strip()
            shot_body = f"{first_line}\n{remainder}".strip()
            blocks.append((shot_num, shot_title, shot_body))
        return blocks

    @staticmethod
    def _extract_inline_value(text: str, pattern: str) -> str:
        match = re.search(pattern, text, re.MULTILINE)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _extract_multiline_value(text: str, pattern: str) -> str:
        match = re.search(pattern, text, re.MULTILINE)
        return match.group(1).strip() if match else ""

    def _resolve_layout_family(self, raw_value: str | None) -> str:
        normalized = str(raw_value or "").strip().lower()
        if "two_column" in normalized or "left_graph_right_formula" in normalized:
            return "two_column"
        if (
            "center_stage" in normalized
            or "center_focus_side_note" in normalized
            or "top_statement_bottom_derivation" in normalized
        ):
            return "center_stage"
        if "center" in normalized and "column" not in normalized:
            return "center_stage"
        if "column" in normalized or "left_" in normalized or "right_" in normalized:
            return "two_column"
        return self._normalize_layout_family(self.layout_hint)

    def _normalize_layout_family(self, raw_value: str | None) -> str:
        normalized = str(raw_value or "").strip().lower()
        if normalized in ALLOWED_LAYOUT_FAMILIES:
            return normalized
        return DEFAULT_LAYOUT_FAMILY

    @staticmethod
    def _normalize_render_quality(raw_value: str) -> str:
        normalized = str(raw_value or "").strip().lower()
        if normalized in {"l", "m", "h"}:
            return normalized
        return "l"

    def _build_section_design(
        self,
        section: Section,
        previous_section: Section | None,
    ) -> str:
        goal_block = self.design_goal or (
            "- what the viewer should understand\n"
            "- the main obstacle\n"
            "- the visual strategy"
        )
        layout_block = self.design_layout or "- main content stays inside the upper stage area"
        object_rules_block = self.design_object_rules or "- clean temporary objects aggressively"
        review_block = self.design_review or "- overlap check\n- lifecycle check\n- focus check\n- pacing check"
        continuity_bridge = (
            f"延续上一段“{previous_section.title}”的叙事，"
            f"上一段结束状态是：{previous_section.end_state or previous_section.start_state or '已建立核心概念'}。"
            if previous_section is not None
            else "这是开场段，需要先建立问题与视觉锚点。"
        )
        shot_body = section.raw_shot.strip()
        if SUBTITLE_SAFE_ZONE_NOTE not in shot_body:
            shot_body = f"{shot_body}\nnote {SUBTITLE_SAFE_ZONE_NOTE}".strip()

        return (
            "<design>\n"
            "# Design\n\n"
            "## Goal\n"
            f"{goal_block}\n\n"
            "## Layout\n"
            f"- locked layout family: {section.layout_family}\n"
            "- subtitle safe zone: bottom_reserved_for_dom_subtitles\n"
            "- keep the main equation / graph / diagram above y=-2.6\n"
            f"{layout_block}\n\n"
            "## Object Rules\n"
            f"{object_rules_block}\n"
            f"- continuity bridge: {continuity_bridge}\n"
            "- typography, color accents, and pacing must stay consistent across sections\n\n"
            "## Shot Plan\n"
            f"### Shot {section.section_index + 1}: {section.title}\n"
            f"{shot_body}\n"
            f"- continuity note: {continuity_bridge}\n"
            f"- subtitle safe zone: {SUBTITLE_SAFE_ZONE_NOTE}\n\n"
            "## Review\n"
            f"{review_block}\n"
            "- layout-family check: stay inside the locked family only\n"
            "- subtitle-safe-zone check: pass only if the bottom subtitle band is empty of critical visuals\n"
            "</design>\n"
        )

    def _previous_section(self, section_id: str) -> Section | None:
        for index, section in enumerate(self.sections):
            if section.id == section_id and index > 0:
                return self.sections[index - 1]
        return None

    # ── Stage 2: Code Generation ───────────────────────────────

    def generate_all_code(self, design_text: str) -> str:
        """Legacy compatibility path: generate one full Manim script from the design."""
        code_file = self.output_dir / "manimcat_full_code.py"

        if code_file.exists():
            logger.info("Found cached ManimCat code, loading...")
            full_code = code_file.read_text(encoding="utf-8")
        else:
            full_code = generate_code_from_design(
                concept=self.learning_topic,
                scene_design=design_text,
                layout_family=self.design_layout_family,
                section_duration=self.section_duration_seconds,
                api_func=self._request_api_and_track_tokens,
                max_tokens=self.max_code_token_length,
            )
            code_file.write_text(full_code, encoding="utf-8")

        for section in self.sections:
            self.section_codes[section.id] = full_code

        logger.info("Code generated: %d chars", len(full_code))
        return full_code

    def generate_section_code(
        self,
        section: Section,
        design_text: str | None = None,
    ) -> str:
        """Generate runnable Manim code for a single section."""
        if design_text and not section.design_text:
            self.design_text = design_text
            previous = self._previous_section(section.id)
            section.design_text = self._build_section_design(section, previous)
        if not section.design_text:
            section.design_text = self._build_section_design(
                section,
                self._previous_section(section.id),
            )

        section_code_dir = self.output_dir / "section_code"
        section_code_dir.mkdir(parents=True, exist_ok=True)
        code_file = section_code_dir / f"{section.id}.py"

        if code_file.exists():
            logger.info("Found cached section code, loading... section=%s", section.id)
            code = code_file.read_text(encoding="utf-8")
        else:
            code = generate_code_from_design(
                concept=self.learning_topic,
                scene_design=section.design_text,
                layout_family=section.layout_family,
                section_duration=self.section_duration_seconds,
                api_func=self._request_api_and_track_tokens,
                max_tokens=self.section_codegen_max_tokens,
                max_completion_tokens=self.section_codegen_max_completion_tokens,
            )
            code = self._normalize_code_for_scene(
                code,
                self._section_scene_name(section.id),
            )
            code_file.write_text(code, encoding="utf-8")

        self.section_codes[section.id] = code
        logger.info(
            "Section code generated section=%s chars=%d layout=%s",
            section.id,
            len(code),
            section.layout_family,
        )
        return code

    # ── Rendering ───────────────────────────────────────────────

    def render_full_video_with_sections(self, full_code: str) -> Dict[str, str]:
        """Legacy compatibility path: render the full code once and split saved sections."""
        from .code_retry import (
            apply_patch_set,
            extract_error_message,
            extract_error_snippet,
            parse_patch_response,
        )

        current_code = self._normalize_full_code(full_code)
        success, stderr = self._render_main_scene(current_code)
        if success:
            return dict(self.section_videos)

        last_error = stderr or "Unknown bulk render failure"
        logger.warning(
            "Bulk render failed on initial attempt: %s",
            extract_error_message(last_error),
        )

        for attempt in range(1, self.patch_retry_max_retries + 1):
            snippet = extract_error_snippet(last_error, current_code)
            raw_patch = self._request_patch_repair(
                current_code,
                extract_error_message(last_error),
                attempt,
                snippet,
            )
            patch_set = parse_patch_response(raw_patch)
            if not patch_set.patches:
                logger.warning("Patch retry %d: no valid patches", attempt)
                continue

            patched_code = apply_patch_set(current_code, patch_set)
            if patched_code == current_code:
                logger.warning("Patch retry %d: no code changes", attempt)
                continue

            current_code = patched_code
            success, stderr = self._render_main_scene(current_code)
            if success:
                logger.info("Bulk render recovered after %d patch retries", attempt)
                return dict(self.section_videos)

            last_error = stderr or last_error
            logger.warning(
                "Patch retry %d still failing: %s",
                attempt,
                extract_error_message(last_error),
            )

        error = ValueError(
            f"Bulk render failed after {self.patch_retry_max_retries + 1} attempts: "
            f"{extract_error_message(last_error)}"
        )
        setattr(error, "code", current_code)
        setattr(error, "stderr", last_error)
        setattr(error, "stdout", "")
        raise error

    def render_section(self, section: Section) -> str:
        """Render a single section and return its transparent video path."""
        from .code_retry import (
            apply_patch_set,
            extract_error_message,
            extract_error_snippet,
            parse_patch_response,
        )

        if section.id not in self.section_codes:
            self.generate_section_code(section)

        scene_name = self._section_scene_name(section.id)
        current_code = self._normalize_code_for_scene(
            self.section_codes[section.id],
            scene_name,
        )
        success, stderr, rendered_path = self._render_single_scene(
            current_code,
            scene_name=scene_name,
            section_id=section.id,
        )
        if success and rendered_path is not None:
            self.section_codes[section.id] = current_code
            self.section_videos[section.id] = str(rendered_path)
            return str(rendered_path)

        last_error = stderr or "Unknown section render failure"

        for attempt in range(1, self.patch_retry_max_retries + 1):
            self._notify_section_status(
                section_id=section.id,
                status="fixing",
                attemptNo=attempt,
                maxFixAttempts=self.patch_retry_max_retries,
            )
            snippet = extract_error_snippet(last_error, current_code)
            raw_patch = self._request_patch_repair(
                current_code,
                extract_error_message(last_error),
                attempt,
                snippet,
            )
            patch_set = parse_patch_response(raw_patch)
            if not patch_set.patches:
                logger.warning(
                    "Section patch retry %d: no valid patches section=%s",
                    attempt,
                    section.id,
                )
                continue

            patched_code = apply_patch_set(current_code, patch_set)
            if patched_code == current_code:
                logger.warning(
                    "Section patch retry %d: no code changes section=%s",
                    attempt,
                    section.id,
                )
                continue

            current_code = self._normalize_code_for_scene(patched_code, scene_name)
            success, stderr, rendered_path = self._render_single_scene(
                current_code,
                scene_name=scene_name,
                section_id=section.id,
            )
            if success and rendered_path is not None:
                self.section_codes[section.id] = current_code
                self.section_videos[section.id] = str(rendered_path)
                logger.info(
                    "Section render recovered after %d patch retries section=%s",
                    attempt,
                    section.id,
                )
                return str(rendered_path)

            last_error = stderr or last_error

        try:
            fallback_title = str(getattr(section, "title", "") or "").strip()
            if fallback_title:
                fallback_title = fallback_title[:80]
            else:
                fallback_title = section.id

            fallback_reason = extract_error_message(last_error)[:200]
            fallback_lines = [
                str(line).strip()[:80]
                for line in (getattr(section, "lecture_lines", []) or [])[:6]
                if str(line).strip()
            ]

            fallback_code = "\n".join(
                [
                    "from manim import *",
                    "",
                    f"TITLE = {json.dumps(fallback_title, ensure_ascii=False)}",
                    f"REASON = {json.dumps(fallback_reason, ensure_ascii=False)}",
                    f"LINES = {json.dumps(fallback_lines, ensure_ascii=False)}",
                    "",
                    f"class {scene_name}(Scene):",
                    "    def construct(self):",
                    "        header = Text(TITLE, font_size=40)",
                    "        notice = Text(",
                    "            \"Render failed. Using placeholder clip.\",",
                    "            font_size=28,",
                    "            color=YELLOW,",
                    "        )",
                    "        reason = Text(REASON, font_size=20, color=GRAY)",
                    "        reason.set_opacity(0.75)",
                    "        items = VGroup(",
                    "            *[Text(line, font_size=26) for line in LINES]",
                    "        )",
                    "        if len(items) > 0:",
                    "            items.arrange(DOWN, aligned_edge=LEFT, buff=0.2)",
                    "        content = VGroup(header, notice, reason)",
                    "        if len(items) > 0:",
                    "            content.add(items)",
                    "        content.arrange(DOWN, buff=0.35)",
                    "        content.move_to(ORIGIN)",
                    "        self.add(content)",
                    "        self.wait(1.0)",
                    "",
                ]
            )
            fallback_code = self._normalize_code_for_scene(fallback_code, scene_name)
            success, stderr, rendered_path = self._render_single_scene(
                fallback_code,
                scene_name=scene_name,
                section_id=section.id,
            )
            if success and rendered_path is not None:
                self.section_codes[section.id] = fallback_code
                self.section_videos[section.id] = str(rendered_path)
                logger.warning(
                    "Section render degraded to placeholder section=%s reason=%s",
                    section.id,
                    fallback_reason,
                )
                return str(rendered_path)
        except Exception:
            logger.warning(
                "Section placeholder render failed section=%s",
                section.id,
                exc_info=True,
            )

        error = ValueError(
            f"Section render failed after {self.patch_retry_max_retries + 1} attempts: "
            f"{extract_error_message(last_error)}"
        )
        setattr(error, "code", current_code)
        setattr(error, "stderr", last_error)
        setattr(error, "stdout", "")
        raise error

    def _normalize_code_for_scene(self, code: str, scene_name: str) -> str:
        normalized = extract_code_from_response(code)
        normalized = clean_manim_code(normalized).code.strip()
        normalized = re.sub(r"^```(?:python)?\s*", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s*```$", "", normalized)
        if not re.search(rf"class\s+{re.escape(scene_name)}\s*\(", normalized):
            normalized = re.sub(
                r"class\s+\w+\s*\(([^)]*Scene[^)]*)\)\s*:",
                f"class {scene_name}(\\1):",
                normalized,
                count=1,
            )
        return normalized.strip() + "\n"

    def _normalize_full_code(self, code: str) -> str:
        return self._normalize_code_for_scene(code, "MainScene")

    def _write_full_code_file(self, code: str) -> Path:
        code_path = self.output_dir / "manimcat_full_code.py"
        code_path.write_text(code, encoding="utf-8")
        return code_path

    def _render_main_scene(
        self, code: str, scene_name: str = "MainScene"
    ) -> tuple[bool, str]:
        """Render the full bulk scene via local manim and export section videos."""
        self.section_videos = {}
        self.full_scene_video = None
        media_dir = self.output_dir / "media"
        if media_dir.exists():
            shutil.rmtree(media_dir)

        normalized = self._normalize_full_code(code)
        scene_file = self._write_full_code_file(normalized)

        manim_cmd = [
            "manim",
            f"-q{self.render_quality}",
            "--transparent",
            "--format",
            VIDEO_OUTPUT_FORMAT,
            "--save_sections",
            scene_file.name,
            scene_name,
        ]
        result = subprocess.run(
            manim_cmd,
            capture_output=True,
            text=True,
            cwd=self.output_dir,
        )

        if result.returncode != 0:
            return False, result.stderr or result.stdout

        section_videos = self._load_saved_section_videos(scene_name)
        if not section_videos:
            return False, "Bulk render succeeded but no section videos exported"

        self.section_videos = section_videos
        full_scene_video = self._find_rendered_scene_video(
            scene_name,
            media_root=media_dir,
        )
        if full_scene_video is not None:
            self.full_scene_video = str(full_scene_video)
        return True, ""

    def _render_single_scene(
        self,
        code: str,
        *,
        scene_name: str,
        section_id: str,
    ) -> tuple[bool, str, Path | None]:
        """Render one scene into a dedicated work dir and return a stable output path."""
        run_dir = self.output_dir / "section_runs" / section_id
        if run_dir.exists():
            shutil.rmtree(run_dir)
        run_dir.mkdir(parents=True, exist_ok=True)

        scene_file = run_dir / f"{section_id}.py"
        scene_file.write_text(code, encoding="utf-8")

        manim_cmd = [
            "manim",
            f"-q{self.render_quality}",
            "--transparent",
            "--format",
            VIDEO_OUTPUT_FORMAT,
            scene_file.name,
            scene_name,
        ]
        result = subprocess.run(
            manim_cmd,
            capture_output=True,
            text=True,
            cwd=run_dir,
        )
        if result.returncode != 0:
            return False, result.stderr or result.stdout, None

        rendered_video = self._find_rendered_scene_video(
            scene_name,
            media_root=run_dir / "media",
        )
        if rendered_video is None:
            return (
                False,
                "Section render succeeded but no output video was produced",
                None,
            )

        stable_dir = self.output_dir / "section_videos"
        stable_dir.mkdir(parents=True, exist_ok=True)
        stable_path = stable_dir / f"{section_id}.{VIDEO_OUTPUT_FORMAT}"
        shutil.copy2(rendered_video, stable_path)
        return True, "", stable_path

    def _find_rendered_scene_video(
        self,
        scene_name: str,
        *,
        media_root: Path | None = None,
    ) -> Path | None:
        root = media_root or (self.output_dir / "media")
        if not root.exists():
            return None
        candidates = [
            path
            for path in root.rglob(f"{scene_name}.{VIDEO_OUTPUT_FORMAT}")
            if "sections" not in path.parts and "partial_movie_files" not in path.parts
        ]
        return max(candidates, key=lambda p: p.stat().st_mtime) if candidates else None

    def _load_saved_section_videos(self, scene_name: str) -> Dict[str, str]:
        media_dir = self.output_dir / "media"
        if not media_dir.exists():
            return {}

        expected_ids = {s.id for s in self.sections}
        for index_path in sorted(
            media_dir.rglob(f"{scene_name}.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        ):
            try:
                payload = json.loads(index_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue

            found: Dict[str, str] = {}
            for item in payload if isinstance(payload, list) else []:
                sid = str(item.get("name") or "").strip()
                video_name = str(item.get("video") or "").strip()
                if (
                    not sid
                    or not video_name
                    or (expected_ids and sid not in expected_ids)
                ):
                    continue
                video_path = index_path.parent / video_name
                if video_path.exists():
                    found[sid] = str(video_path)
            if found:
                return found
        return {}

    def _section_scene_name(self, section_id: str) -> str:
        suffix = "".join(
            part.capitalize()
            for part in re.split(r"[^a-zA-Z0-9]+", section_id)
            if part
        )
        return f"SectionScene{suffix or 'Main'}"

    def _request_patch_repair(
        self, code: str, error_message: str, attempt: int, code_snippet: str | None
    ) -> str:
        """Request SEARCH/REPLACE patch from LLM for code fix."""
        from .gpt_request import get_bridge

        system_prompt = load_and_render(
            "code_retry_system.md",
            {
                "apiIndexModule": build_api_index_module(),
                "sharedSpecification": SHARED_SPECIFICATION,
            },
        )
        user_prompt = load_and_render(
            "code_retry_user.md",
            {
                "concept": self.learning_topic,
                "attempt": str(attempt),
                "errorMessage": error_message,
                "code": code,
                "codeSnippet": code_snippet or "",
            },
        )

        request_api = self.API
        try:
            request_api = get_bridge().text_api("manim_fix")
        except (RuntimeError, AttributeError):
            logger.warning(
                "manim_fix bridge unavailable, using default API", exc_info=True
            )

        response = request_api(
            f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}",
            max_tokens=self.max_code_token_length,
        )
        if isinstance(response, tuple):
            response = response[0]

        try:
            return response.choices[0].message.content
        except (AttributeError, IndexError, TypeError):
            return str(response)

    # ── Section status callback ─────────────────────────────────

    def _notify_section_status(
        self, *, section_id: str, status: str, **payload: Any
    ) -> None:
        """Report section-level status to the orchestrator."""
        if self.section_status_callback is None:
            return
        try:
            self.section_status_callback(
                {"sectionId": section_id, "status": status, **payload}
            )
        except (TypeError, RuntimeError):
            logger.debug(
                "section status callback failed for %s", section_id, exc_info=True
            )
