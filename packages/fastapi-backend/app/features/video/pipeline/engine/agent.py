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

from ..prompts import *  # noqa: F403
from ..prompts.manimcat.api_codebook import SHARED_SPECIFICATION, build_api_index_module
from ..prompts.manimcat.prompt_loader import load_and_render
from .c2v_utils import *  # noqa: F403
from .code_cleaner import (
    clean_manim_code,
    extract_code_from_response,
    extract_design_from_response,
)
from .external_assets import process_storyboard_with_assets
from .gpt_request import *  # noqa: F403
from .scope_refine import *  # noqa: F403

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
class VideoFeedback:
    section_id: str
    video_path: str
    has_issues: bool
    suggested_improvements: List[str]
    raw_response: Optional[str] = None


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
    def __init__(
        self,
        idx,
        knowledge_point,
        folder="CASES",
        cfg: Optional[RunConfig] = None,
    ):
        """1. Global parameter"""
        self.learning_topic = knowledge_point
        self.idx = idx
        self.cfg = cfg

        self.use_feedback = cfg.use_feedback
        self.use_assets = cfg.use_assets
        self.API = cfg.api
        self.feedback_rounds = cfg.feedback_rounds
        self.iconfinder_api_key = cfg.iconfinder_api_key
        self.max_code_token_length = cfg.max_code_token_length
        self.max_fix_bug_tries = cfg.max_fix_bug_tries
        self.max_regenerate_tries = cfg.max_regenerate_tries
        self.max_feedback_gen_code_tries = cfg.max_feedback_gen_code_tries
        self.max_mllm_fix_bugs_tries = cfg.max_mllm_fix_bugs_tries
        self.layout_hint = getattr(cfg, "layout_hint", None)
        self.static_guard_max_passes = max(
            1, int(getattr(cfg, "static_guard_max_passes", 3))
        )
        self.patch_retry_max_retries = max(
            0, int(getattr(cfg, "patch_retry_max_retries", 3))
        )

        """2. Path for output"""
        self.folder = folder
        self.output_dir = get_output_dir(
            idx=idx, knowledge_point=self.learning_topic, base_dir=folder
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.assets_dir = (
            Path(*self.output_dir.parts[: self.output_dir.parts.index("CASES")])
            / "assets"
            / "icon"
        )
        self.assets_dir.mkdir(exist_ok=True)

        """3. ScopeRefine & Anchor Visual"""
        self.scope_refine_fixer = ScopeRefineFixer(self.API, self.max_code_token_length)
        self.extractor = GridPositionExtractor()

        """4. External Database"""
        knowledge_ref_mapping_path = (
            Path(*self.output_dir.parts[: self.output_dir.parts.index("CASES")])
            / "json_files"
            / "long_video_ref_mapping.json"
        )
        with open(knowledge_ref_mapping_path) as f:
            self.KNOWLEDGE2PATH = json.load(f)
        self.knowledge_ref_img_folder = (
            Path(*self.output_dir.parts[: self.output_dir.parts.index("CASES")])
            / "assets"
            / "reference"
        )
        self.GRID_IMG_PATH = self.knowledge_ref_img_folder / "GRID.png"

        """5. Data structure"""
        self.outline = None
        self.enhanced_storyboard = None
        self.sections = []
        self.section_codes = {}
        self.section_videos = {}
        self.render_results = {}
        self.render_summary = {}
        self.section_status_callback: Optional[Callable[[Dict[str, Any]], None]] = None
        self.video_feedbacks = {}
        self.full_scene_video: Optional[str] = None

        """6. For Efficiency"""
        self.token_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }

    def _request_api_and_track_tokens(self, prompt, max_tokens=10000):
        """packages API requests and automatically accumulates token usage"""
        response, usage = self.API(prompt, max_tokens=max_tokens)
        if usage:
            self.token_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
            self.token_usage["completion_tokens"] += usage.get("completion_tokens", 0)
            self.token_usage["total_tokens"] += usage.get("total_tokens", 0)
        return response

    def _request_video_api_and_track_tokens(self, prompt, video_path):
        """Wraps video API requests and accumulates token usage automatically"""
        response, usage = request_gemini_video_img(
            prompt=prompt, video_path=video_path, image_path=self.GRID_IMG_PATH
        )

        if usage:
            self.token_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
            self.token_usage["completion_tokens"] += usage.get("completion_tokens", 0)
            self.token_usage["total_tokens"] += usage.get("total_tokens", 0)
        return response

    def get_serializable_state(self):
        """返回可以序列化保存的Agent状态"""
        return {
            "idx": self.idx,
            "knowledge_point": self.learning_topic,
            "folder": self.folder,
            "cfg": self.cfg,
        }

    # ============================================================
    # ManimCat-style methods: reduce LLM calls from ~77 to 2-4
    # ============================================================

    def generate_design(self, duration_minutes: int = 5) -> tuple:
        """ManimCat-style: single LLM call to generate concept design + storyboard.

        Replaces generate_outline() + generate_storyboard() (2 calls → 1 call).
        Uses ManimCat's concept-designer prompt for engineering-grade storyboard.
        """
        design_file = self.output_dir / "manimcat_design.txt"
        section_count = max(3, min(20, duration_minutes * 2))
        section_duration = int((duration_minutes * 60) / section_count)

        if design_file.exists():
            logger.info("Found cached ManimCat design, loading...")
            design_text = design_file.read_text(encoding="utf-8")
        else:
            import hashlib

            seed = hashlib.md5(self.learning_topic.encode()).hexdigest()[:8]

            system_prompt = load_and_render("concept_designer_system.md")
            user_prompt = load_and_render(
                "concept_designer_user.md",
                {
                    "concept": self.learning_topic,
                    "seed": seed,
                    "outputMode": "video",
                    "duration": str(duration_minutes),
                    "sectionCount": str(section_count),
                    "sectionDuration": str(section_duration),
                    "layoutHint": self.layout_hint
                    or "choose the best layout for this concept",
                },
            )

            logger.info(
                "Generating ManimCat design (%d sections, %d min)...",
                section_count,
                duration_minutes,
            )
            response = self._request_api_and_track_tokens(
                f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}",
                max_tokens=12000,
            )
            if response is None:
                raise ValueError("Design generation LLM call failed")

            try:
                content = response.candidates[0].content.parts[0].text
            except Exception:
                try:
                    content = response.choices[0].message.content
                except Exception:
                    content = str(response)

            design_text = extract_design_from_response(content)
            design_file.write_text(design_text, encoding="utf-8")

        # Parse design into sections for downstream compatibility
        sections = self._parse_design_to_sections(design_text)
        self.sections = sections

        # Also create outline for backward compatibility
        self.outline = TeachingOutline(
            topic=self.learning_topic,
            target_audience="students",
            sections=[
                {"id": s.id, "title": s.title, "content": s.title} for s in sections
            ],
        )
        logger.info("== ManimCat design generated: %d sections", len(sections))
        return design_text, sections

    def _parse_design_to_sections(self, design_text: str) -> list:
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
            logger.warning("No shots parsed from design, creating fallback section")
            sections = [
                Section(
                    id="section_1",
                    title=self.learning_topic,
                    lecture_lines=[self.learning_topic],
                    animations=["Main animation"],
                )
            ]

        return sections

    def generate_all_code(self, design_text: str) -> str:
        """ManimCat-style: single LLM call to generate ALL section code at once.

        Replaces per-section generate_section_code() (N calls → 1 call).
        Uses ManimCat's code-generation prompt with API codebook injection.
        """
        code_file = self.output_dir / "manimcat_full_code.py"

        if code_file.exists():
            logger.info("Found cached ManimCat code, loading...")
            full_code = code_file.read_text(encoding="utf-8")
        else:
            import hashlib

            seed = hashlib.md5(
                f"{self.learning_topic}-{design_text[:20]}".encode()
            ).hexdigest()[:8]

            api_module = build_api_index_module()
            system_prompt = load_and_render(
                "code_generation_system.md",
                {
                    "apiIndexModule": api_module,
                    "sharedSpecification": SHARED_SPECIFICATION,
                },
            )
            user_prompt = load_and_render(
                "code_generation_user.md",
                {
                    "sceneDesign": design_text,
                    "concept": self.learning_topic,
                    "seed": seed,
                    "outputMode": "video",
                    "isVideo": True,
                },
            )

            logger.info("Generating ManimCat full code (all sections in one call)...")
            response = self._request_api_and_track_tokens(
                f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}",
                max_tokens=self.max_code_token_length,
            )
            if response is None:
                raise ValueError("Code generation LLM call failed")

            try:
                content = response.candidates[0].content.parts[0].text
            except Exception:
                try:
                    content = response.choices[0].message.content
                except Exception:
                    content = str(response)

            full_code = extract_code_from_response(content)
            clean_result = clean_manim_code(full_code)
            full_code = clean_result.code
            code_file.write_text(full_code, encoding="utf-8")

        # Store code for each section (split by next_section markers)
        self._split_code_to_sections(full_code)
        logger.info("== ManimCat code generated: %d chars", len(full_code))
        return full_code

    def _split_code_to_sections(self, full_code: str):
        """Split full code into per-section snippets for TTS alignment."""
        for section in self.sections:
            self.section_codes[section.id] = full_code

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
                "Bulk static guard left %d diagnostics after %d passes",
                len(guard_result.diagnostics),
                guard_result.passes_used,
            )
        scene_file = self._write_full_code_file(guard_result.code)

        docker_cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{self.output_dir}:/workspace",
            "manimcommunity/manim:stable",
            "bash",
            "-c",
            f"cd /workspace && manim -ql --save_sections {scene_file.name} {scene_name}",
        ]
        try:
            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except FileNotFoundError:
            logger.warning(
                "Docker not available for bulk render, falling back to local manim"
            )
            result = subprocess.run(
                ["manim", "-ql", "--save_sections", scene_file.name, scene_name],
                capture_output=True,
                text=True,
                cwd=self.output_dir,
                timeout=300,
            )

        if result.returncode != 0:
            return False, result.stderr or result.stdout

        section_videos = self._load_saved_section_videos(scene_name)
        if not section_videos:
            return (
                False,
                "Bulk render succeeded but Manim did not export any section videos",
            )

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
        if not candidates:
            return None
        return max(candidates, key=lambda path: path.stat().st_mtime)

    def _load_saved_section_videos(self, scene_name: str) -> Dict[str, str]:
        media_dir = self.output_dir / "media"
        if not media_dir.exists():
            return {}

        expected_section_ids = {section.id for section in self.sections}
        index_candidates = sorted(
            media_dir.rglob(f"{scene_name}.json"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        for index_path in index_candidates:
            try:
                payload = json.loads(index_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue

            section_videos: Dict[str, str] = {}
            for item in payload if isinstance(payload, list) else []:
                section_id = str(item.get("name") or "").strip()
                video_name = str(item.get("video") or "").strip()
                if (
                    not section_id
                    or not video_name
                    or (expected_section_ids and section_id not in expected_section_ids)
                ):
                    continue
                video_path = index_path.parent / video_name
                if video_path.exists():
                    section_videos[section_id] = str(video_path)

            if section_videos:
                return section_videos
        return {}

    def _request_patch_repair(
        self,
        code: str,
        error_message: str,
        attempt: int,
        code_snippet: str | None,
    ) -> str:
        """Request a minimal SEARCH/REPLACE patch from the manim_fix stage."""
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
        except Exception:
            logger.warning(
                "manim_fix bridge unavailable, falling back to default generation API",
                exc_info=True,
            )

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

    def render_full_video_with_sections(self, full_code: str) -> Dict[str, str]:
        """Render the ManimCat bulk code once and recover with minimal patches."""
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
            "%s bulk render failed on initial attempt: %s",
            self.learning_topic,
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
                logger.warning(
                    "Bulk render patch retry %d returned no valid SEARCH/REPLACE patches",
                    attempt,
                )
                continue

            patched_code = apply_patch_set(current_code, patch_set)
            if patched_code == current_code:
                logger.warning(
                    "Bulk render patch retry %d produced no code changes",
                    attempt,
                )
                continue

            current_code = patched_code
            success, stderr = self._render_main_scene(current_code)
            if success:
                logger.info(
                    "%s bulk render recovered after %d patch retries",
                    self.learning_topic,
                    attempt,
                )
                return dict(self.section_videos)

            last_error = stderr or last_error
            logger.warning(
                "Bulk render patch retry %d still failing: %s",
                attempt,
                extract_error_message(last_error),
            )

        raise ValueError(
            "Bulk render failed after "
            f"{self.patch_retry_max_retries + 1} attempts: "
            f"{extract_error_message(last_error)}"
        )

    def generate_outline(self) -> TeachingOutline:
        outline_file = self.output_dir / "outline.json"

        if outline_file.exists():
            logger.info("...")
            with open(outline_file, "r", encoding="utf-8") as f:
                outline_data = json.load(f)
        else:
            """Step 1: Generate teaching outline from topic"""
            refer_img_path = (
                self.knowledge_ref_img_folder / img_name
                if (img_name := self.KNOWLEDGE2PATH.get(self.learning_topic))
                is not None
                else None
            )
            prompt1 = get_prompt1_outline(
                knowledge_point=self.learning_topic, reference_image_path=refer_img_path
            )

            logger.info("Generating Outline...")

            for attempt in range(1, self.max_regenerate_tries + 1):
                api_func = (
                    self._request_api_and_track_tokens
                    if refer_img_path
                    else self._request_api_and_track_tokens
                )
                response = api_func(prompt1, max_tokens=self.max_code_token_length)
                if response is None:
                    logger.warning("Attempt %s failed, retrying...", attempt)
                    if attempt == self.max_regenerate_tries:
                        raise ValueError("API requests failed multiple times")
                    continue
                try:
                    content = response.candidates[0].content.parts[0].text
                except Exception:
                    try:
                        content = response.choices[0].message.content
                    except Exception:
                        content = str(response)
                if content is None:
                    logger.warning("LLM returned null content on attempt %s", attempt)
                    if attempt == self.max_regenerate_tries:
                        raise ValueError("LLM returned null content multiple times")
                    continue
                content = extract_json_from_markdown(content)
                try:
                    outline_data = json.loads(content)
                    with open(
                        self.output_dir / "outline.json", "w", encoding="utf-8"
                    ) as f:
                        json.dump(outline_data, f, ensure_ascii=False, indent=2)
                    break
                except json.JSONDecodeError:
                    logger.warning(
                        "Outline format invalid on attempt %s, retrying...", attempt
                    )
                    if attempt == self.max_regenerate_tries:
                        raise ValueError(
                            "Outline format invalid multiple times, check prompt or API response"
                        )

        self.outline = TeachingOutline(
            topic=outline_data["topic"],
            target_audience=outline_data["target_audience"],
            sections=outline_data["sections"],
        )
        logger.info("== Outline generated: %s", self.outline.topic)
        return self.outline

    def generate_storyboard(self) -> List[Section]:
        """Step 2: Generate teaching storyboard from outline (optionally with asset enhancement)"""
        if not self.outline:
            raise ValueError("Outline not generated, please generate outline first")

        storyboard_file = self.output_dir / "storyboard.json"
        enhanced_storyboard_file = self.output_dir / "storyboard_with_assets.json"

        if enhanced_storyboard_file.exists():
            logger.info("Found enhanced storyboard, loading...")
            with open(enhanced_storyboard_file, "r", encoding="utf-8") as f:
                self.enhanced_storyboard = json.load(f)
        elif storyboard_file.exists():
            logger.info("Found storyboard, loading...")
            with open(storyboard_file, "r", encoding="utf-8") as f:
                storyboard_data = json.load(f)
            if self.use_assets:
                self.enhanced_storyboard = self._enhance_storyboard_with_assets(
                    storyboard_data
                )
            else:
                self.enhanced_storyboard = storyboard_data
        else:
            logger.info("Generating storyboard...")
            refer_img_path = (
                self.knowledge_ref_img_folder / img_name
                if (img_name := self.KNOWLEDGE2PATH.get(self.learning_topic))
                is not None
                else None
            )

            prompt2 = get_prompt2_storyboard(
                outline=json.dumps(self.outline.__dict__, ensure_ascii=False, indent=2),
                reference_image_path=refer_img_path,
            )

            for attempt in range(1, self.max_regenerate_tries + 1):
                api_func = self._request_api_and_track_tokens
                response = api_func(prompt2, max_tokens=self.max_code_token_length)
                if response is None:
                    logger.warning(
                        "Outline format invalid on attempt %s, retrying...", attempt
                    )
                    if attempt == self.max_regenerate_tries:
                        raise ValueError("API requests failed multiple times")
                    continue

                try:
                    content = response.candidates[0].content.parts[0].text
                except Exception:
                    try:
                        content = response.choices[0].message.content
                    except Exception:
                        content = str(response)

                try:
                    json_str = extract_json_from_markdown(content)
                    storyboard_data = json.loads(json_str)

                    # Save original storyboard
                    with open(storyboard_file, "w", encoding="utf-8") as f:
                        json.dump(storyboard_data, f, ensure_ascii=False, indent=2)

                    # Enhance storyboard (add assets)
                    if self.use_assets:
                        self.enhanced_storyboard = self._enhance_storyboard_with_assets(
                            storyboard_data
                        )
                    else:
                        self.enhanced_storyboard = storyboard_data
                    break

                except json.JSONDecodeError:
                    logger.warning(
                        "Storyboard format invalid on attempt %s, retrying...", attempt
                    )
                    if attempt == self.max_regenerate_tries:
                        raise ValueError(
                            "Storyboard format invalid multiple times, check prompt or API response"
                        )

        # Parse into Section objects (using enhanced storyboard)
        self.sections = []
        for section_data in self.enhanced_storyboard["sections"]:
            section = Section(
                id=section_data["id"],
                title=section_data["title"],
                lecture_lines=section_data.get("lecture_lines", []),
                animations=section_data["animations"],
            )
            self.sections.append(section)

        logger.info(
            "== Storyboard processed, %s sections generated", len(self.sections)
        )
        return self.sections

    def _enhance_storyboard_with_assets(self, storyboard_data: dict) -> dict:
        """Enhance storyboard: smart analysis and download assets"""
        logger.info("Enhancing storyboard: smart analysis and download assets...")

        try:
            enhanced_storyboard = process_storyboard_with_assets(
                storyboard=storyboard_data,
                api_function=self.API,
                assets_dir=str(self.assets_dir),
                iconfinder_api_key=self.iconfinder_api_key,
            )
            enhanced_storyboard_file = self.output_dir / "storyboard_with_assets.json"
            with open(enhanced_storyboard_file, "w", encoding="utf-8") as f:
                json.dump(enhanced_storyboard, f, ensure_ascii=False, indent=2)
            logger.info("Storyboard enhanced with assets")
            return enhanced_storyboard

        except Exception as e:
            logger.warning("Asset download failed, using original storyboard: %s", e)
            return storyboard_data

    def generate_section_code(
        self, section: Section, attempt: int = 1, feedback_improvements=None
    ) -> str:
        """Generate Manim code for a single section"""
        code_file = self.output_dir / f"{section.id}.py"

        if attempt == 1 and code_file.exists() and not feedback_improvements:
            logger.info("Found existing code for %s, reading...", section.id)
            with open(code_file, "r", encoding="utf-8") as f:
                code = f.read()
                self.section_codes[section.id] = code
                return code
        regenerate_note = ""
        if attempt > 1:
            regenerate_note = get_regenerate_note(
                attempt, MAX_REGENERATE_TRIES=self.max_regenerate_tries
            )

        # Add MLLM feedback and improvement suggestions
        if feedback_improvements:
            current_code = self.section_codes.get(section.id, "")
            try:
                modifier = GridCodeModifier(current_code)
                modified_code = modifier.parse_feedback_and_modify(
                    feedback_improvements
                )
                with open(code_file, "w", encoding="utf-8") as f:
                    f.write(modified_code)

                self.section_codes[section.id] = modified_code
                return modified_code
            except Exception as e:
                logger.warning(
                    "GridCodeModifier failed, falling back to original code: %s", e
                )
                code_gen_prompt = get_feedback_improve_code(
                    feedback=get_feedback_list_prefix(feedback_improvements),
                    code=current_code,
                )

        else:
            code_gen_prompt = get_prompt3_code(
                regenerate_note=regenerate_note, section=section, base_class=base_class
            )

        response = self._request_api_and_track_tokens(
            code_gen_prompt, max_tokens=self.max_code_token_length
        )
        if response is None:
            logger.error("Failed to generate code for %s via API call.", section.id)
            return ""

        try:
            code = response.candidates[0].content.parts[0].text
        except Exception:
            try:
                code = response.choices[0].message.content
            except Exception:
                code = str(response)
        if "```python" in code:
            code = code.split("```python")[1].split("```")[0].strip()
        elif "```" in code:
            code = code.split("```")[1].strip()

        # Replace base class
        code = replace_base_class(code, base_class)

        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)

        self.section_codes[section.id] = code
        return code

    def debug_and_fix_code(self, section_id: str, max_fix_attempts: int = 3) -> bool:
        """Enhanced debug and fix code method"""
        if section_id not in self.section_codes:
            return False

        for fix_attempt in range(max_fix_attempts):
            self._notify_section_status(
                section_id=section_id,
                status="fixing",
                attemptNo=fix_attempt + 1,
                maxFixAttempts=max_fix_attempts,
            )
            logger.info(
                "%s Debugging %s (attempt %s/%s)",
                self.learning_topic,
                section_id,
                fix_attempt + 1,
                max_fix_attempts,
            )

            try:
                scene_name = f"{section_id.title().replace('_', '')}Scene"
                code_file = f"{section_id}.py"

                # Docker render (has LaTeX for MathTex support)
                # Falls back to local manim if Docker unavailable
                docker_cmd = [
                    "docker",
                    "run",
                    "--rm",
                    "-v",
                    f"{self.output_dir}:/workspace",
                    "manimcommunity/manim:stable",
                    "bash",
                    "-c",
                    f"cd /workspace && manim -ql {code_file} {scene_name}",
                ]
                try:
                    result = subprocess.run(
                        docker_cmd,
                        capture_output=True,
                        text=True,
                        timeout=180,
                    )
                except FileNotFoundError:
                    # Docker not installed — fall back to local manim
                    logger.warning("Docker not available, falling back to local manim")
                    result = subprocess.run(
                        ["manim", "-ql", str(code_file), scene_name],
                        capture_output=True,
                        text=True,
                        cwd=self.output_dir,
                        timeout=180,
                    )

                if result.returncode == 0:
                    video_patterns = [
                        self.output_dir
                        / "media"
                        / "videos"
                        / f"{code_file.replace('.py', '')}"
                        / "480p15"
                        / f"{scene_name}.mp4",
                        self.output_dir
                        / "media"
                        / "videos"
                        / "480p15"
                        / f"{scene_name}.mp4",
                    ]

                    for video_path in video_patterns:
                        if video_path.exists():
                            self.section_videos[section_id] = str(video_path)
                            logger.info(
                                "%s %s finished", self.learning_topic, section_id
                            )
                            return True

                current_code = self.section_codes[section_id]
                fixed_code = self.scope_refine_fixer.fix_code_smart(
                    section_id, current_code, result.stderr, self.output_dir
                )

                if fixed_code:
                    self.section_codes[section_id] = fixed_code
                    with open(self.output_dir / code_file, "w", encoding="utf-8") as f:
                        f.write(fixed_code)
                else:
                    break

            except subprocess.TimeoutExpired:
                logger.error("%s %s timed out", self.learning_topic, section_id)
                break
            except Exception as e:
                logger.error(
                    "%s %s failed with exception: %s",
                    self.learning_topic,
                    section_id,
                    e,
                )
                break

        return False

    def _notify_section_status(
        self, *, section_id: str, status: str, **payload: Any
    ) -> None:
        """向外部协调器回传 section 级别的运行信号。"""
        if self.section_status_callback is None:
            return
        try:
            self.section_status_callback(
                {
                    "sectionId": section_id,
                    "status": status,
                    **payload,
                }
            )
        except Exception:
            logger.debug(
                "section status callback failed for %s", section_id, exc_info=True
            )

    def get_mllm_feedback(
        self, section: Section, video_path: str, round_number: int = 1
    ) -> VideoFeedback:
        logger.info(
            "%s Using MLLM to analyze video (%s/%s): %s",
            self.learning_topic,
            round_number,
            self.feedback_rounds,
            section.id,
        )

        current_code = self.section_codes[section.id]
        positions = self.extractor.extract_grid_positions(current_code)
        position_table = self.extractor.generate_position_table(positions)
        analysis_prompt = get_prompt4_layout_feedback(
            section=section, position_table=position_table
        )

        def _parse_layout(feedback_content):
            has_layout_issues, suggested_improvements = False, []
            try:
                data = json.loads(feedback_content)
                lay = data.get("layout", {})
                has_layout_issues = bool(lay.get("has_issues", False))
                for it in lay.get("improvements", []) or []:
                    if isinstance(it, dict):
                        prob = str(it.get("problem", "")).strip()
                        sol = str(it.get("solution", "")).strip()
                        if prob or sol:
                            suggested_improvements.append(
                                f"[LAYOUT] Problem: {prob}; Solution: {sol}"
                            )

            except json.JSONDecodeError:
                logger.warning(
                    "%s JSON parse failed, fallback to keyword analysis",
                    self.learning_topic,
                )

                for m in re.finditer(
                    r"Problem:\s*(.*?);\s*Solution:\s*(.*?)(?=\n|$)",
                    feedback_content,
                    flags=re.IGNORECASE | re.DOTALL,
                ):
                    suggested_improvements.append(
                        f"[LAYOUT] Problem: {m.group(1).strip()}; Solution: {m.group(2).strip()}"
                    )

                if not suggested_improvements:
                    for sol in re.findall(
                        r"Solution\s*:\s*(.+)", feedback_content, flags=re.IGNORECASE
                    ):
                        suggested_improvements.append(
                            f"[LAYOUT] Problem: ; Solution: {sol.strip()}"
                        )

            return has_layout_issues, suggested_improvements

        try:
            if os.path.isfile(self.GRID_IMG_PATH):
                response = request_gemini_video_img(
                    prompt=analysis_prompt,
                    video_path=video_path,
                    image_path=self.GRID_IMG_PATH,
                )
            else:
                logger.warning(
                    "%s GRID.png not found (%s), using video-only feedback",
                    self.learning_topic,
                    self.GRID_IMG_PATH,
                )
                response = request_gemini_with_video(
                    prompt=analysis_prompt,
                    video_path=video_path,
                )
            feedback_content = extract_answer_from_response(response)
            has_layout_issues, suggested_improvements = _parse_layout(feedback_content)
            feedback = VideoFeedback(
                section_id=section.id,
                video_path=video_path,
                has_issues=has_layout_issues,
                suggested_improvements=suggested_improvements,
                raw_response=feedback_content,
            )
            self.video_feedbacks[f"{section.id}_round{round_number}"] = feedback
            return feedback

        except Exception as e:
            logger.error("%s MLLM analysis failed: %s", self.learning_topic, str(e))
            return VideoFeedback(
                section_id=section.id,
                video_path=video_path,
                has_issues=False,
                suggested_improvements=[],
                raw_response=f"Error: {str(e)}",
            )

    def optimize_with_feedback(self, section: Section, feedback: VideoFeedback) -> bool:
        """Optimize the code based on feedback from the MLLM"""
        if not feedback.has_issues or not feedback.suggested_improvements:
            logger.info("%s %s no optimization needed", self.learning_topic, section.id)
            return True

        # === Step 1: back up original code ===
        original_code_content = self.section_codes[section.id]

        for attempt in range(self.max_feedback_gen_code_tries):
            logger.info(
                "%s MLLM feedback optimization %s code, attempt %s/%s",
                self.learning_topic,
                section.id,
                attempt + 1,
                self.max_feedback_gen_code_tries,
            )

            # === Step 2: back up original code and apply improvements ===
            if attempt > 0:
                self.section_codes[section.id] = original_code_content

            # === Step 3: re-generate code with feedback ===
            self.generate_section_code(
                section=section,
                attempt=attempt + 1,
                feedback_improvements=feedback.suggested_improvements,
            )
            success = self.debug_and_fix_code(
                section.id, max_fix_attempts=self.max_mllm_fix_bugs_tries
            )
            if success:
                optimized_output_dir = self.output_dir / "optimized_videos"
                optimized_output_dir.mkdir(exist_ok=True)
                optimized_video_path = (
                    optimized_output_dir / f"{section.id}_optimized.mp4"
                )

                if section.id in self.section_videos:
                    original_video_path = Path(self.section_videos[section.id])
                    if original_video_path.exists():
                        original_video_path.rename(optimized_video_path)
                        self.section_videos[section.id] = str(optimized_video_path)
                        logger.info(
                            "%s %s optimized video saved: %s",
                            self.learning_topic,
                            section.id,
                            optimized_video_path,
                        )
                    else:
                        logger.warning(
                            "%s %s original video file not found: %s",
                            self.learning_topic,
                            section.id,
                            original_video_path,
                        )
                else:
                    logger.warning(
                        "%s %s no optimized video path found",
                        self.learning_topic,
                        section.id,
                    )
                return True
            else:
                logger.error(
                    "%s %s MLLM optimization failed, attempt %s/%s",
                    self.learning_topic,
                    section.id,
                    attempt + 1,
                    self.max_feedback_gen_code_tries,
                )

        return False

    def render_section(self, section: Section) -> bool:
        section_id = section.id

        try:
            success = False
            for regenerate_attempt in range(self.max_regenerate_tries):
                try:
                    if regenerate_attempt > 0:
                        self.generate_section_code(
                            section, attempt=regenerate_attempt + 1
                        )
                    success = self.debug_and_fix_code(
                        section_id, max_fix_attempts=self.max_fix_bug_tries
                    )
                    if success:
                        break
                    else:
                        pass
                except Exception as e:
                    logger.warning(
                        "%s attempt %s raised exception: %s",
                        section_id,
                        regenerate_attempt + 1,
                        str(e),
                    )
                    continue
            if not success:
                logger.error(
                    "%s %s all failed, skipping section",
                    self.learning_topic,
                    section_id,
                )
                return False

            # MLLM feedback — DISABLED by ManimCat optimization
            # ManimCat achieves high quality without feedback loops.
            # The two-stage AI (design → code) + API codebook + static guard
            # produce better results than N rounds of MLLM feedback.
            # Keeping the code paths intact for future re-enablement if needed.
            if False and self.use_feedback:
                try:
                    for round in range(self.feedback_rounds):
                        current_video = self.section_videos.get(section_id)
                        if not current_video:
                            logger.error(
                                "%s %s no video available for MLLM feedback",
                                self.learning_topic,
                                section_id,
                            )
                            return success
                        try:
                            feedback = self.get_mllm_feedback(
                                section, current_video, round_number=round + 1
                            )

                            optimization_success = self.optimize_with_feedback(
                                section, feedback
                            )
                            if optimization_success:
                                pass
                            else:
                                logger.warning(
                                    "%s %s round %s MLLM feedback optimization failed, using current version",
                                    self.learning_topic,
                                    section_id,
                                    round + 1,
                                )
                        except Exception as e:
                            logger.warning(
                                "%s %s round %s MLLM feedback processing exception: %s",
                                self.learning_topic,
                                section_id,
                                round + 1,
                                str(e),
                            )
                            continue

                except Exception as e:
                    logger.warning(
                        "%s %s MLLM feedback processing exception: %s",
                        self.learning_topic,
                        section_id,
                        str(e),
                    )

            return success

        except Exception as e:
            logger.error(
                "%s %s render process exception: %s",
                self.learning_topic,
                section_id,
                str(e),
            )
            return False
