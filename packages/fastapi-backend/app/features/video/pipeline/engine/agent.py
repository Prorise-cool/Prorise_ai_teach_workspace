"""Code2Video 核心引擎——agent + LLM 通信 + 代码修复。

ManimCat-aligned TeachingVideoAgent:
- Two-stage generation: design → code (GAP-1)
- Delegates to scene_designer + code_generator
- Bulk rendering with patch retry
- Dead methods removed: generate_outline, generate_storyboard,
  generate_section_code, get_mllm_feedback, optimize_with_feedback
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ..prompts.manimcat.api_codebook import build_api_index_module, SHARED_SPECIFICATION
from ..prompts.manimcat.prompt_loader import load_and_render
from .c2v_utils import get_output_dir, topic_to_safe_name
from .code_cleaner import clean_manim_code, extract_code_from_response, extract_design_from_response
from .code_generator import generate_code_from_design
from .scene_designer import generate_scene_design

logger = logging.getLogger(__name__)

RENDER_SUCCESS_RATIO = 0.6
RENDER_COMPLETION_GRACE_SECONDS = 45.0


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
    patch_retry_max_retries: int = 3


class TeachingVideoAgent:
    """ManimCat-aligned video generation agent.

    Two-stage pipeline:
      1. generate_design() → structured scene design
      2. generate_all_code() → complete Manim code
      3. render_full_video_with_sections() → render + patch retry
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
        self.cfg = cfg

        self.API = cfg.api
        self.max_code_token_length = cfg.max_code_token_length
        self.max_fix_bug_tries = cfg.max_fix_bug_tries
        self.layout_hint = getattr(cfg, "layout_hint", None)
        self.static_guard_max_passes = max(
            1, int(getattr(cfg, "static_guard_max_passes", 3))
        )
        self.patch_retry_max_retries = max(
            0, int(getattr(cfg, "patch_retry_max_retries", 3))
        )

        # Output paths
        self.folder = folder
        self.output_dir = get_output_dir(
            idx=idx, knowledge_point=self.learning_topic, base_dir=folder
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Data structures
        self.outline = None
        self.sections: list[Section] = []
        self.section_codes: dict[str, str] = {}
        self.section_videos: dict[str, str] = {}
        self.render_results: dict[str, Any] = {}
        self.render_summary: dict[str, Any] = {}
        self.section_status_callback: Optional[Callable[[Dict[str, Any]], None]] = None
        self.full_scene_video: Optional[str] = None

        # Token tracking
        self.token_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

    def _request_api_and_track_tokens(self, prompt, max_tokens=10000):
        """Wrap API requests and accumulate token usage."""
        response, usage = self.API(prompt, max_tokens=max_tokens)
        if usage:
            self.token_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
            self.token_usage["completion_tokens"] += usage.get("completion_tokens", 0)
            self.token_usage["total_tokens"] += usage.get("total_tokens", 0)
        return response

    def get_serializable_state(self):
        """Return serializable Agent state."""
        return {
            "idx": self.idx,
            "knowledge_point": self.learning_topic,
            "folder": self.folder,
            "cfg": self.cfg,
        }

    # ── Stage 1: Scene Design (delegates to scene_designer) ─────

    def generate_design(self, duration_minutes: int = 5) -> tuple:
        """Generate structured scene design via ManimCat two-stage pipeline.

        Stage 1: concept → structured design with sections.
        Uses scene_designer.generate_scene_design() for GAP-4/5/6/7 closures.
        """
        design_file = self.output_dir / "manimcat_design.txt"

        if design_file.exists():
            logger.info("Found cached ManimCat design, loading...")
            design_text = design_file.read_text(encoding="utf-8")
        else:
            design_text = generate_scene_design(
                concept=self.learning_topic,
                duration_minutes=duration_minutes,
                layout_hint=self.layout_hint,
                api_func=self._request_api_and_track_tokens,
                max_tokens=self.max_code_token_length,
            )
            design_file.write_text(design_text, encoding="utf-8")

        # Parse design into sections
        sections = self._parse_design_to_sections(design_text)
        self.sections = sections

        # Backward compat outline
        self.outline = TeachingOutline(
            topic=self.learning_topic,
            target_audience="students",
            sections=[{"id": s.id, "title": s.title, "content": s.title} for s in sections],
        )
        logger.info("Scene design generated: %d sections", len(sections))
        return design_text, sections

    def _parse_design_to_sections(self, design_text: str) -> list[Section]:
        """Parse ManimCat <design> text into Section objects."""
        sections = []
        shot_pattern = re.compile(
            r"###\s*Shot\s+(\d+)\s*:\s*(.*?)(?=\n###\s*Shot|\n##\s|\Z)", re.DOTALL
        )

        for match in shot_pattern.finditer(design_text):
            shot_num = int(match.group(1))
            shot_title = match.group(2).strip().split("\n")[0].strip()
            shot_body = match.group(0)

            narration_match = re.search(r'narration_hint\s*:\s*"([^"]*)"', shot_body)
            narration = narration_match.group(1) if narration_match else shot_title

            sections.append(
                Section(
                    id=f"section_{shot_num}",
                    title=shot_title,
                    lecture_lines=[narration],
                    animations=[f"Shot {shot_num} animation"],
                )
            )

        if not sections:
            sections = [
                Section(
                    id="section_1",
                    title=self.learning_topic,
                    lecture_lines=[self.learning_topic],
                    animations=["Main animation"],
                )
            ]
        return sections

    # ── Stage 2: Code Generation (delegates to code_generator) ──

    def generate_all_code(self, design_text: str) -> str:
        """Generate all Manim code from design via ManimCat two-stage pipeline.

        Stage 2: design → complete Manim code.
        Uses code_generator.generate_code_from_design().
        """
        code_file = self.output_dir / "manimcat_full_code.py"

        if code_file.exists():
            logger.info("Found cached ManimCat code, loading...")
            full_code = code_file.read_text(encoding="utf-8")
        else:
            full_code = generate_code_from_design(
                concept=self.learning_topic,
                scene_design=design_text,
                api_func=self._request_api_and_track_tokens,
                max_tokens=self.max_code_token_length,
            )
            code_file.write_text(full_code, encoding="utf-8")

        # Store code for each section
        for section in self.sections:
            self.section_codes[section.id] = full_code

        logger.info("Code generated: %d chars", len(full_code))
        return full_code

    # ── Rendering ───────────────────────────────────────────────

    def render_full_video_with_sections(self, full_code: str) -> Dict[str, str]:
        """Render bulk code once, recover with SEARCH/REPLACE patches."""
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
            logger.warning("Patch retry %d still failing: %s", attempt, extract_error_message(last_error))

        raise ValueError(
            f"Bulk render failed after {self.patch_retry_max_retries + 1} attempts: "
            f"{extract_error_message(last_error)}"
        )

    def _normalize_full_code(self, code: str) -> str:
        """Normalize full-scene code before guard / render."""
        normalized = extract_code_from_response(code)
        normalized = clean_manim_code(normalized).code.strip()
        normalized = re.sub(r"^```(?:python)?\s*", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s*```$", "", normalized)

        if not re.search(r"class\s+MainScene\s*\(", normalized):
            normalized = re.sub(
                r"class\s+\w+\s*\(([^)]*Scene[^)]*)\)\s*:",
                r"class MainScene(\1):",
                normalized,
                count=1,
            )
        return normalized.strip() + "\n"

    def _write_full_code_file(self, code: str) -> Path:
        code_path = self.output_dir / "manimcat_full_code.py"
        code_path.write_text(code, encoding="utf-8")
        return code_path

    def _render_main_scene(self, code: str, scene_name: str = "MainScene") -> tuple[bool, str]:
        """Render the full bulk scene once and export section videos."""
        from .static_guard import run_guard_loop

        self.section_videos = {}
        self.full_scene_video = None
        media_dir = self.output_dir / "media"
        if media_dir.exists():
            shutil.rmtree(media_dir)

        normalized = self._normalize_full_code(code)
        guard_result = asyncio.run(
            run_guard_loop(normalized, max_passes=self.static_guard_max_passes)
        )
        if not guard_result.passed:
            logger.warning(
                "Static guard left %d diagnostics after %d passes",
                len(guard_result.diagnostics),
                guard_result.passes_used,
            )
        scene_file = self._write_full_code_file(guard_result.code)

        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{self.output_dir}:/workspace",
            "manimcommunity/manim:stable",
            "bash", "-c",
            f"cd /workspace && manim -ql --save_sections {scene_file.name} {scene_name}",
        ]
        try:
            result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=300)
        except FileNotFoundError:
            logger.warning("Docker not available, falling back to local manim")
            result = subprocess.run(
                ["manim", "-ql", "--save_sections", scene_file.name, scene_name],
                capture_output=True, text=True, cwd=self.output_dir, timeout=300,
            )

        if result.returncode != 0:
            return False, result.stderr or result.stdout

        section_videos = self._load_saved_section_videos(scene_name)
        if not section_videos:
            return False, "Bulk render succeeded but no section videos exported"

        self.section_videos = section_videos
        full_scene_video = self._find_rendered_scene_video(scene_name)
        if full_scene_video is not None:
            self.full_scene_video = str(full_scene_video)
        return True, ""

    def _find_rendered_scene_video(self, scene_name: str) -> Path | None:
        media_dir = self.output_dir / "media"
        if not media_dir.exists():
            return None
        candidates = [
            path
            for path in media_dir.rglob(f"{scene_name}.mp4")
            if "sections" not in path.parts and "partial_movie_files" not in path.parts
        ]
        return max(candidates, key=lambda p: p.stat().st_mtime) if candidates else None

    def _load_saved_section_videos(self, scene_name: str) -> Dict[str, str]:
        media_dir = self.output_dir / "media"
        if not media_dir.exists():
            return {}

        expected_ids = {s.id for s in self.sections}
        for index_path in sorted(media_dir.rglob(f"{scene_name}.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                payload = json.loads(index_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue

            found: Dict[str, str] = {}
            for item in payload if isinstance(payload, list) else []:
                sid = str(item.get("name") or "").strip()
                video_name = str(item.get("video") or "").strip()
                if not sid or not video_name or (expected_ids and sid not in expected_ids):
                    continue
                video_path = index_path.parent / video_name
                if video_path.exists():
                    found[sid] = str(video_path)
            if found:
                return found
        return {}

    def _request_patch_repair(
        self, code: str, error_message: str, attempt: int, code_snippet: str | None
    ) -> str:
        """Request SEARCH/REPLACE patch from LLM for code fix."""
        from .gpt_request import get_bridge

        system_prompt = load_and_render(
            "code_retry_system.md",
            {"apiIndexModule": build_api_index_module(), "sharedSpecification": SHARED_SPECIFICATION},
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
        except Exception:
            logger.warning("manim_fix bridge unavailable, using default API", exc_info=True)

        response = request_api(
            f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}",
            max_tokens=self.max_code_token_length,
        )
        if isinstance(response, tuple):
            response = response[0]

        try:
            return response.choices[0].message.content
        except Exception:
            return str(response)

    # ── Section status callback ─────────────────────────────────

    def _notify_section_status(self, *, section_id: str, status: str, **payload: Any) -> None:
        """Report section-level status to the orchestrator."""
        if self.section_status_callback is None:
            return
        try:
            self.section_status_callback({"sectionId": section_id, "status": status, **payload})
        except Exception:
            logger.debug("section status callback failed for %s", section_id, exc_info=True)
