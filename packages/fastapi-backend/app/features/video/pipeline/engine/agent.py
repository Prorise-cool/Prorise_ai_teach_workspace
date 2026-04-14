import argparse
import json
import logging
import math
import random
import re
import subprocess
import time
from concurrent.futures import (
    FIRST_COMPLETED,
    ProcessPoolExecutor,
    ThreadPoolExecutor,
    as_completed,
    wait,
)
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from ..prompts import *  # noqa: F403
from .c2v_utils import *  # noqa: F403
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
                cmd = ["manim", "-ql", str(code_file), scene_name]

                result = subprocess.run(
                    cmd,
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

    def _notify_section_status(self, *, section_id: str, status: str, **payload: Any) -> None:
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
            logger.debug("section status callback failed for %s", section_id, exc_info=True)

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

    def generate_codes(self) -> Dict[str, str]:
        if not self.sections:
            raise ValueError(
                f"{self.learning_topic} Please generate teaching sections first"
            )

        def task(section):
            try:
                self.generate_section_code(section, attempt=1)
                return section.id, None
            except Exception as e:
                return section.id, e

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                executor.submit(task, section): section for section in self.sections
            }
            for future in as_completed(futures):
                section_id, err = future.result()
                if err:
                    logger.error(
                        "%s %s code generation failed: %s",
                        self.learning_topic,
                        section_id,
                        err,
                    )

        return self.section_codes

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

            # MLLM feedback
            if self.use_feedback:
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

    def render_section_worker(self, section_data) -> Tuple[str, bool, Optional[str]]:
        section_id = "unknown"
        try:
            section, agent_class, kwargs = section_data
            section_id = section.id
            agent = agent_class(**kwargs)
            success = agent.render_section(section)
            video_path = agent.section_videos.get(section.id) if success else None
            return section_id, success, video_path

        except Exception as e:
            logger.error(
                "%s %s render process exception: %s",
                self.learning_topic,
                section_id,
                str(e),
            )
            return section_id, False, None

    def render_all_sections(
        self,
        max_workers: int = 2,
        *,
        per_section_timeout: float = 600,
        overall_timeout: float | None = None,
        success_ratio: float = RENDER_SUCCESS_RATIO,
        success_grace_seconds: float = RENDER_COMPLETION_GRACE_SECONDS,
    ) -> Dict[str, str]:
        logger.info(
            "Start parallel rendering of all section videos (up to %s threads)...",
            max_workers,
        )

        total = len(self.sections)
        if total == 0:
            self.render_results = {}
            return {}

        max_workers = max(1, min(max_workers, total))
        required_successes = required_render_successes(total, success_ratio)
        logger.info(
            "Render quality gate target: %s/%s sections (%.0f%%), grace window %.1fs",
            required_successes,
            total,
            success_ratio * 100,
            success_grace_seconds,
        )

        results: Dict[str, str] = {}
        future_to_section: dict[object, str] = {}
        submitted_count = 0
        early_stop_reason: str | None = None
        grace_deadline: float | None = None
        overall_timeout_seconds = (
            float(overall_timeout)
            if overall_timeout is not None
            else float(per_section_timeout) * total
        )
        overall_deadline = time.monotonic() + max(1.0, overall_timeout_seconds)
        section_iter = iter(self.sections)
        executor = ThreadPoolExecutor(max_workers=max_workers)

        def submit_next_section() -> bool:
            nonlocal submitted_count
            try:
                section = next(section_iter)
            except StopIteration:
                return False
            future = executor.submit(self.render_section, section)
            future_to_section[future] = section.id
            submitted_count += 1
            return True

        try:
            for _ in range(max_workers):
                if not submit_next_section():
                    break

            while future_to_section:
                now = time.monotonic()
                if now >= overall_deadline:
                    early_stop_reason = "overall-render-deadline-reached"
                    logger.warning(
                        "Render deadline reached with %s/%s successful sections; "
                        "proceeding with available videos",
                        len(results),
                        total,
                    )
                    break

                wait_timeout = min(1.0, max(0.0, overall_deadline - now))
                if grace_deadline is not None:
                    wait_timeout = min(
                        wait_timeout,
                        max(0.0, grace_deadline - now),
                    )

                done, _ = wait(
                    set(future_to_section.keys()),
                    timeout=wait_timeout,
                    return_when=FIRST_COMPLETED,
                )
                if not done:
                    continue

                for future in done:
                    section_id = future_to_section.pop(future)
                    try:
                        success = future.result()
                        if success and section_id in self.section_videos:
                            results[section_id] = self.section_videos[section_id]
                            logger.info(
                                "%s video rendered successfully: %s",
                                section_id,
                                results[section_id],
                            )
                        else:
                            logger.warning("%s video rendering failed", section_id)
                    except Exception as e:
                        logger.error(
                            "%s video rendering process error: %s", section_id, str(e)
                        )

                while len(future_to_section) < max_workers:
                    if not submit_next_section():
                        break

                if (
                    grace_deadline is None
                    and len(results) >= required_successes
                    and submitted_count >= total
                    and future_to_section
                ):
                    grace_deadline = min(
                        overall_deadline,
                        time.monotonic() + max(0.0, success_grace_seconds),
                    )
                    logger.info(
                        "Render success threshold reached (%s/%s) after submitting all sections. "
                        "Entering %.1fs grace window before merge",
                        len(results),
                        total,
                        max(0.0, grace_deadline - time.monotonic()),
                    )

                if grace_deadline is not None and time.monotonic() >= grace_deadline:
                    early_stop_reason = "quality-gate-grace-expired"
                    logger.info(
                        "Render grace window expired after reaching quality gate; "
                        "stop waiting with %s running sections",
                        len(future_to_section),
                    )
                    break
        finally:
            if future_to_section:
                outstanding_sections = list(future_to_section.values())
                logger.warning(
                    "Render wait stopped early reason=%s outstanding_sections=%s",
                    early_stop_reason or "manual-stop",
                    outstanding_sections,
                )
                for future in future_to_section:
                    future.cancel()
                executor.shutdown(wait=False, cancel_futures=True)
            else:
                executor.shutdown(wait=True, cancel_futures=True)

        logger.info("\n📊 Render Results:")
        successful_count = len(results)
        failed_count = total - successful_count
        logger.info("   Total Sections: %s", total)
        logger.info("   Successful: %s", successful_count)
        logger.info("   Incomplete: %s", failed_count)

        # 质量门禁：成功率不够时，对失败的 section 再来一轮
        if total > 0 and failed_count > 0 and successful_count / total < success_ratio:
            failed_sections = [
                s for s in self.sections if s.id not in results
            ]
            logger.warning(
                "Render success rate %d/%d (%.0f%%) below %.0f%%, retrying %d failed sections...",
                successful_count,
                total,
                successful_count / total * 100,
                success_ratio * 100,
                len(failed_sections),
            )
            for section in failed_sections:
                try:
                    self.generate_section_code(section, attempt=2)
                    success = self.debug_and_fix_code(
                        section.id, max_fix_attempts=self.max_fix_bug_tries
                    )
                    if success and section.id in self.section_videos:
                        results[section.id] = self.section_videos[section.id]
                        successful_count += 1
                        failed_count -= 1
                        logger.info("Retry succeeded for %s", section.id)
                except Exception as e:
                    logger.error("Retry failed for %s: %s", section.id, e)

            logger.info(
                "After retry: %d/%d succeeded (%.0f%%)",
                successful_count, total, successful_count / total * 100,
            )

        # 最终门禁：重试后仍不够就失败
        if total > 0 and successful_count / total < success_ratio:
            raise ValueError(
                f"Render quality gate failed after retry: {successful_count}/{total} sections "
                f"({successful_count / total:.0%}), minimum {success_ratio:.0%} required"
            )

        self.render_results = dict(results)
        self.render_summary = {
            "totalSections": total,
            "successfulSections": successful_count,
            "incompleteSections": failed_count,
            "requiredSuccesses": required_successes,
            "allSectionsRendered": successful_count == total,
            "completionMode": "full" if successful_count == total else "degraded",
            "stopReason": early_stop_reason,
        }
        return results

    def merge_videos(
        self,
        output_filename: str = None,
        *,
        video_map: Optional[Dict[str, str]] = None,
    ) -> str:
        """Step 5: Merge all section videos"""
        video_sources = (
            video_map
            or getattr(self, "render_results", None)
            or self.section_videos
        )
        if not video_sources:
            raise ValueError("No video files available to merge")

        if output_filename is None:
            safe_name = topic_to_safe_name(self.learning_topic)
            output_filename = f"{safe_name}.mp4"

        output_path = self.output_dir / output_filename

        logger.info("Start merging section videos...")

        video_list_file = self.output_dir / "video_list.txt"
        with open(video_list_file, "w", encoding="utf-8") as f:
            for section_id in sorted(video_sources.keys()):
                video_path = video_sources[section_id].replace(
                    f"{self.output_dir}/", ""
                )
                f.write(f"file '{video_path}'\n")

        # ffmpeg
        try:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    str(video_list_file),
                    "-c",
                    "copy",
                    str(output_path),
                ],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                return str(output_path)
            else:
                logger.error("Failed to merge section videos: %s", result.stderr)
                return None
        except Exception as e:
            logger.error("Failed to merge section videos: %s", e)
            return None

    def GENERATE_VIDEO(self) -> str:
        """Generate complete video with MLLM feedback optimization"""
        try:
            self.generate_outline()
            self.generate_storyboard()
            self.generate_codes()
            rendered_sections = self.render_all_sections()
            final_video = self.merge_videos(video_map=rendered_sections)
            if final_video:
                logger.info("Video generated success: %s", final_video)
                return final_video
            else:
                logger.error("%s  failed", self.learning_topic)
                return None
        except Exception as e:
            logger.error("Video generation failed: %s", e)
            return None


def process_knowledge_point(idx, kp, folder_path: Path, cfg: RunConfig):
    logger.info("\n🚀 Processing knowledge topic: %s", kp)
    start_time = time.time()

    agent = TeachingVideoAgent(
        idx=idx,
        knowledge_point=kp,
        folder=folder_path,
        cfg=cfg,
    )
    video_path = agent.GENERATE_VIDEO()

    duration_minutes = (time.time() - start_time) / 60
    total_tokens = agent.token_usage["total_tokens"]

    logger.info(
        "Knowledge topic '%s' processed. Cost Time: %.2f minutes, Tokens used: %s",
        kp,
        duration_minutes,
        total_tokens,
    )
    return kp, video_path, duration_minutes, total_tokens


def process_batch(batch_data, cfg: RunConfig):
    """Process a batch of knowledge points (serial within a batch)"""
    batch_idx, kp_batch, folder_path = batch_data
    results = []
    logger.info(
        "Batch %s starts processing %s knowledge points", batch_idx + 1, len(kp_batch)
    )

    for local_idx, (idx, kp) in enumerate(kp_batch):
        try:
            if local_idx > 0:
                delay = random.uniform(3, 6)
                logger.info(
                    "Batch %s waits %.1fs before processing %s...",
                    batch_idx + 1,
                    delay,
                    kp,
                )
                time.sleep(delay)
            results.append(process_knowledge_point(idx, kp, folder_path, cfg))
        except Exception as e:
            logger.error("Batch %s processing %s failed: %s", batch_idx + 1, kp, e)
            results.append((kp, None, 0, 0))
    return batch_idx, results


def run_Code2Video(
    knowledge_points: List[str],
    folder_path: Path,
    parallel=True,
    batch_size=3,
    max_workers=8,
    cfg: RunConfig = RunConfig(),
):
    all_results = []

    if parallel:
        batches = []
        for i in range(0, len(knowledge_points), batch_size):
            batch = [
                (i + j, kp) for j, kp in enumerate(knowledge_points[i : i + batch_size])
            ]
            batches.append((i // batch_size, batch, folder_path))

        logger.info(
            "Parallel batch processing mode: %s batches, each with %s knowledge points, %s concurrent batches",
            len(batches),
            batch_size,
            max_workers,
        )
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(process_batch, batch, cfg): batch for batch in batches
            }
            for future in as_completed(futures):
                try:
                    batch_idx, batch_results = future.result()
                    all_results.extend(batch_results)
                    logger.info("Batch %s completed", batch_idx + 1)
                except Exception as e:
                    logger.error("Batch %s processing failed: %s", batch_idx + 1, e)
    else:
        logger.info("Serial processing mode")
        for idx, kp in enumerate(knowledge_points):
            try:
                all_results.append(process_knowledge_point(idx, kp, folder_path, cfg))
            except Exception as e:
                logger.error("Serial processing %s failed: %s", kp, e)
                all_results.append((kp, None, 0, 0))

    successful_runs = [r for r in all_results if r[1] is not None]
    total_runs = len(all_results)
    if not successful_runs:
        logger.info("\nAll knowledge points failed, cannot calculate average.")
        return

    total_duration = sum(r[2] for r in successful_runs)
    total_tokens_consumed = sum(r[3] for r in successful_runs)
    num_successful = len(successful_runs)

    logger.info("=" * 50)
    logger.info("   Total knowledge points: %s", total_runs)
    logger.info(
        "   Successfully processed: %s (%.1f%)",
        num_successful,
        num_successful / total_runs * 100,
    )
    logger.info(
        "   Average duration [min]: %.2f minutes/knowledge point",
        total_duration / num_successful,
    )
    logger.info(
        "   Average token consumption: %,.0f tokens/knowledge point",
        total_tokens_consumed / num_successful,
    )
    logger.info("=" * 50)


def get_api_and_output(API_name):
    mapping = {
        "gpt-41": (request_gpt41_token, "Chatgpt41"),
        "claude": (request_claude_token, "CLAUDE"),
        "gpt-5": (request_gpt5_token, "Chatgpt5"),
        "gpt-4o": (request_gpt4o_token, "Chatgpt4o"),
        "gpt-o4mini": (request_o4mini_token, "Chatgpto4mini"),
        "Gemini": (request_gemini_token, "Gemini"),
    }
    try:
        return mapping[API_name]
    except KeyError:
        raise ValueError("Invalid API model name")


def build_and_parse_args():
    parser = argparse.ArgumentParser()
    # Core hyperparameters
    parser.add_argument(
        "--API",
        type=str,
        choices=["gpt-41", "claude", "gpt-5", "gpt-4o", "gpt-o4mini", "Gemini"],
        default="gpt-41",
    )
    parser.add_argument(
        "--folder_prefix",
        type=str,
        default="TEST",
    )
    parser.add_argument(
        "--knowledge_file", type=str, default="long_video_topics_list.json"
    )
    parser.add_argument("--iconfinder_api_key", type=str, default="")

    # Basically invariant parameters
    parser.add_argument("--use_feedback", action="store_true", default=False)
    parser.add_argument("--no_feedback", action="store_false", dest="use_feedback")
    parser.add_argument("--use_assets", action="store_true", default=False)
    parser.add_argument("--no_assets", action="store_false", dest="use_assets")

    parser.add_argument(
        "--max_code_token_length",
        type=int,
        help="max # token for generating code",
        default=10000,
    )
    parser.add_argument(
        "--max_fix_bug_tries",
        type=int,
        help="max # tries for SR to fix bug",
        default=10,
    )
    parser.add_argument(
        "--max_regenerate_tries", type=int, help="max # tries to regenerate", default=10
    )
    parser.add_argument(
        "--max_feedback_gen_code_tries",
        type=int,
        help="max # tries for Critic",
        default=3,
    )
    parser.add_argument(
        "--max_mllm_fix_bugs_tries",
        type=int,
        help="max # tries for Critic to fix bug",
        default=3,
    )
    parser.add_argument("--feedback_rounds", type=int, default=2)

    parser.add_argument("--parallel", action="store_true", default=False)
    parser.add_argument("--no_parallel", action="store_false", dest="parallel")
    parser.add_argument("--parallel_group_num", type=int, default=3)
    parser.add_argument(
        "--max_concepts",
        type=int,
        help="Limit # concepts for a quick run, -1 for all",
        default=-1,
    )
    parser.add_argument(
        "--knowledge_point",
        type=str,
        help="if knowledge_file not given, can ignore",
        default=None,
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = build_and_parse_args()

    api, folder_name = get_api_and_output(args.API)
    folder = (
        Path(__file__).resolve().parent
        / "CASES"
        / f"{args.folder_prefix}_{folder_name}"
    )

    _CFG_PATH = pathlib.Path(__file__).with_name("api_config.json")
    with _CFG_PATH.open("r", encoding="utf-8") as _f:
        _CFG = json.load(_f)
    iconfinder_cfg = _CFG.get("iconfinder", {})
    args.iconfinder_api_key = iconfinder_cfg.get("api_key")
    if args.iconfinder_api_key:
        print(f"Iconfinder API Key: {args.iconfinder_api_key}")
    else:
        print(
            "WARNING: Iconfinder API key not found in config file. Using default (None)."
        )

    if args.knowledge_point:
        print(f"🔄 Single knowledge point mode: {args.knowledge_point}")
        knowledge_points = [args.knowledge_point]
        args.parallel_group_num = 1
    elif args.knowledge_file:
        with open(
            Path(__file__).resolve().parent / "json_files" / args.knowledge_file,
            "r",
            encoding="utf-8",
        ) as f:
            knowledge_points = json.load(f)
            if args.max_concepts is not None:
                knowledge_points = knowledge_points[: args.max_concepts]
    else:
        raise ValueError("Must provide --knowledge_point | --knowledge_file")

    cfg = RunConfig(
        api=api,
        iconfinder_api_key=args.iconfinder_api_key,
        use_feedback=args.use_feedback,
        use_assets=args.use_assets,
        max_code_token_length=args.max_code_token_length,
        max_fix_bug_tries=args.max_fix_bug_tries,
        max_regenerate_tries=args.max_regenerate_tries,
        max_feedback_gen_code_tries=args.max_feedback_gen_code_tries,
        max_mllm_fix_bugs_tries=args.max_mllm_fix_bugs_tries,
        feedback_rounds=args.feedback_rounds,
    )

    run_Code2Video(
        knowledge_points,
        folder,
        parallel=args.parallel,
        batch_size=max(1, int(len(knowledge_points) / args.parallel_group_num)),
        max_workers=get_optimal_workers(),
        cfg=cfg,
    )
