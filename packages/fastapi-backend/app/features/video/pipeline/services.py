"""Legacy compatibility façade for video pipeline services."""

from __future__ import annotations

import ast
import asyncio
import base64
import json
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from app.core.config import get_settings
from app.features.video.pipeline.constants import (
    DEFAULT_FIXED_SCENE_CLASS,
    VIDEO_OUTPUT_FORMAT,
)
from app.features.video.pipeline.engine.code_cleaner import extract_code_from_response
from app.features.video.pipeline.models import (
    ArtifactPayload,
    ArtifactType,
    AudioSegment,
    ComposeResult,
    FixResult,
    ManimCodeResult,
    Scene,
    SolutionStep,
    Storyboard,
    TTSResult,
    UnderstandingResult,
    UploadResult,
    VideoArtifactGraph,
    VoiceConfig,
)
from app.features.video.pipeline.orchestration.assets import LocalAssetStore
from app.features.video.pipeline.orchestration.runtime import VideoRuntimeStateStore

from .script_templates import build_default_fix_script, build_default_manim_script


def _get_text(payload: Any) -> str:
    if isinstance(payload, dict):
        return str(payload.get("content") or payload.get("text") or "")
    return str(getattr(payload, "content", None) or getattr(payload, "text", "") or "")


def _get_provider_id(provider: Any) -> str:
    return str(getattr(provider, "provider_id", "") or "")


def _get_provider_settings(provider: Any) -> dict[str, Any]:
    config = getattr(provider, "config", None)
    settings = getattr(config, "settings", None)
    return dict(settings or {})


def _parse_jsonish(text: str) -> dict[str, Any]:
    normalized = re.sub(
        r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE
    ).strip()
    decoder = json.JSONDecoder()

    candidates: list[str] = []
    if normalized:
        candidates.append(normalized)

    fenced_match = re.search(
        r"```(?:json|javascript|js|python|txt|text)?\s*\n?([\s\S]*?)```",
        normalized,
        re.IGNORECASE,
    )
    if fenced_match:
        fenced_payload = fenced_match.group(1).strip()
        if fenced_payload:
            candidates.append(fenced_payload)

    extracted_payload = extract_code_from_response(normalized)
    if extracted_payload and extracted_payload not in candidates:
        candidates.append(extracted_payload)

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            return parsed

        for index, char in enumerate(candidate):
            if char not in "{[":
                continue
            try:
                parsed, _ = decoder.raw_decode(candidate[index:])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed

    try:
        return json.loads(normalized)
    except json.JSONDecodeError:
        return json.loads(extract_code_from_response(normalized))


def _try_parse_jsonish(text: str) -> dict[str, Any] | None:
    try:
        return _parse_jsonish(text)
    except Exception:  # noqa: BLE001
        return None


def _build_understanding_prompt(
    *,
    source_payload: dict[str, Any],
    user_profile: dict[str, Any],
) -> str:
    return "\n".join(
        [
            "你是学生在等待教学视频生成时，最先看到的讲题老师。",
            "你的目标是通过启发式提问（苏格拉底式），引导学生主动思考。不要直接“剧透”完整解法和关键辅助线，而是通过抛出认知冲突或阶梯性问题，让学生自己产生顿悟。",
            "请严格返回一个 JSON 对象，不要输出任何额外解释、Markdown、代码块标题或前后缀。",
            "写作风格要求：",
            "- 像老师在学生身边讲题，语气自然、耐心、有人味，多用启发性提问（如“有没有想过…”、“如果是你，第一步会看哪…”）。",
            "- 帮学生剥开题目复杂的表象，指出矛盾点或核心条件，然后把“直接给结论”变成“给出探索方向”。",
            "- 可以使用必要的 Markdown 或 LaTeX 公式（行内公式使用 $，独立公式使用 $$），但公式后要顺手用白话解释，不要只扔符号。",
            "- 不要写成论文摘要、证明提纲、竞赛讲义或直接剧透答案的流水账。",
            "- 避免生硬表达，比如“本题探讨……”“构造辅助条件”“应用某定理即可”；禁止直接说“作辅助线XX”、“代入公式XX求解”。",
            "字段要求：",
            "- topicSummary: 用与题目相同的语言给出 4-6 句老师式快速引导，中文题目默认输出简体中文。第一句点出题目的表象或学生的常见畏难点，接着抛出一个核心的观察视角或疑问，引导学生关注最关键的破题线索；必要时可包含少量公式。",
            "- knowledgePoints: 2-5 个真正面向学生的知识点短语，禁止技术术语堆砌、英文占位或空泛标签。",
            "- solutionSteps: 2-4 个引导步骤（注意：这里是引导思考的步骤，不是解题计算步骤），每步包含 stepId/title/explanation。title 用启发式的简短行动标签（如“观察特殊点”、“倒推试试看”）；explanation 用 1-3 句口语化的提问或点拨，引导学生往某个方向想，而不是直接把这一步的结论喂给他们。",
            "- difficulty: easy | medium | hard。",
            "- subject: math | physics | chemistry | biology | general。",
            "返回示例：",
            '{"topicSummary":"这道题给了一张包含很多数据的图像，很多同学一上来就想设未知数代坐标，往往容易算错符号且陷入复杂计算。我们先不急着动笔，仔细观察一下图象：它穿过了哪几个能直接读出数据的关键点？图象的倾斜方向又在暗示我们参数是正还是负？只要你看懂了图象想告诉你的秘密，后面写出解析式其实就是水到渠成的事。","knowledgePoints":["斜率","截距","数形结合"],"solutionSteps":[{"stepId":"step_1","title":"先看图象找关键","explanation":"图上有几个点是可以直接读出坐标的，特别是它和坐标轴的交点。你能先找出它们，并判断一下整体的增减趋势吗？"},{"stepId":"step_2","title":"把特征翻译成代数","explanation":"现在你手边有了变化趋势和特殊点，回想一下，一次函数的代数式是怎么把这些图形特征‘装’进去的？尝试自己拼出表达式，写完记得用原图检验一下正负号哦。"}],"difficulty":"easy","subject":"math"}',
            "输入数据如下：",
            json.dumps(
                {
                    "sourcePayload": source_payload,
                    "userProfile": user_profile,
                },
                ensure_ascii=False,
            ),
        ]
    )


def _build_understanding_repair_prompt(
    *,
    source_payload: dict[str, Any],
    user_profile: dict[str, Any],
    previous_output: str,
    issues: list[str],
) -> str:
    return "\n".join(
        [
            "你上一轮返回的理解摘要不合格，需要重新输出。",
            "这次仍然只能返回一个 JSON 对象，不要输出任何解释、Markdown 标题、代码块或前后缀。",
            "需要修复的问题：",
            *[f"- {issue}" for issue in issues],
            "补充要求：",
            "- topicSummary 不能只是重复题面，必须先把题目在问什么、主线怎么走、为什么这样做讲明白。",
            "- 如果 knowledgePoints 或 solutionSteps 之前为空，这次必须补出真正能给学生看的内容。",
            "- 不要出现英文占位、分镜标题、脚本术语或流水线术语。",
            "输入数据如下：",
            json.dumps(
                {
                    "sourcePayload": source_payload,
                    "userProfile": user_profile,
                },
                ensure_ascii=False,
            ),
            "上一轮模型输出如下：",
            previous_output.strip() or "(empty)",
        ]
    )


def _contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def _read_image_as_base64(image_ref: str) -> tuple[str, str] | None:
    """从 local:// 图片引用读取文件并返回 (base64, mime_type)。"""
    if not image_ref or not image_ref.startswith("local://"):
        return None
    relative_path = image_ref.removeprefix("local://")
    settings = get_settings()
    # 与 LocalImageStorage 写入根一致；历史上误用了 video_asset_root 导致
    # understanding 阶段 vision 永远读不到用户上传的图，静默退化为纯文本。
    base_dir = Path(
        getattr(settings, "video_image_storage_root", "data/uploads/video")
    )
    full_path = base_dir / relative_path
    if not full_path.exists():
        return None
    ext = full_path.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    image_bytes = full_path.read_bytes()
    return base64.b64encode(image_bytes).decode("ascii"), mime_map.get(
        ext, "image/jpeg"
    )


def _normalize_compare_text(text: str) -> str:
    return re.sub(r"[\W_]+", "", text, flags=re.UNICODE).casefold()


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _extract_source_text(source_payload: dict[str, Any]) -> str:
    priority_keys = (
        "text",
        "question",
        "prompt",
        "title",
        "content",
        "ocrText",
        "ocr_text",
        "query",
    )
    for key in priority_keys:
        value = source_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    fallback_candidates = [
        value.strip()
        for value in source_payload.values()
        if isinstance(value, str) and value.strip()
    ]
    return max(fallback_candidates, key=len, default="")


def _looks_like_source_echo(text: str, source_text: str) -> bool:
    normalized_text = _normalize_compare_text(text)
    normalized_source = _normalize_compare_text(source_text)
    if not normalized_text or not normalized_source:
        return False
    if normalized_text == normalized_source:
        return True
    return (
        normalized_source in normalized_text
        and len(normalized_text) <= len(normalized_source) + 16
    )


def _sanitize_knowledge_points(points: Sequence[Any], *, source_text: str) -> list[str]:
    prefers_cjk = _contains_cjk(source_text)
    cleaned: list[str] = []
    seen: set[str] = set()

    for raw_point in points:
        point = _clean_text(raw_point)
        if not point or len(point) > 32:
            continue
        if _looks_like_source_echo(point, source_text):
            continue
        if prefers_cjk and not _contains_cjk(point):
            continue
        fingerprint = _normalize_compare_text(point)
        if not fingerprint or fingerprint in seen:
            continue
        seen.add(fingerprint)
        cleaned.append(point)

    return cleaned[:5]


def _sanitize_solution_steps(
    steps: Sequence[SolutionStep], *, source_text: str
) -> list[SolutionStep]:
    prefers_cjk = _contains_cjk(source_text)
    cleaned: list[SolutionStep] = []

    for index, step in enumerate(steps, start=1):
        title = _clean_text(step.title) or f"步骤 {index}"
        explanation = _clean_text(step.explanation)
        if not explanation:
            continue
        if _looks_like_source_echo(explanation, source_text) and len(explanation) < 40:
            continue
        if prefers_cjk and not (_contains_cjk(title) or _contains_cjk(explanation)):
            continue
        cleaned.append(
            SolutionStep(
                step_id=step.step_id or f"step_{index}",
                title=title,
                explanation=explanation,
            )
        )

    return cleaned[:4]


def _build_summary_from_solution_steps(
    steps: Sequence[SolutionStep], *, source_text: str
) -> str:
    snippets = [
        _clean_text(step.explanation).rstrip("。；;.!? ")
        for step in steps[:2]
        if _clean_text(step.explanation)
    ]
    if not snippets:
        return ""

    if _contains_cjk(source_text):
        return (
            "先别急着只记结论，可以先按这条主线理解："
            + "；".join(snippets)
            + "。先把这层思路抓住，后面的视频会更容易看懂。"
        )

    return (
        "Before memorizing the final result, follow this thread first: "
        + "; ".join(snippets)
        + ". Once this flow is clear, the later video will be easier to follow."
    )


def _summary_is_usable(summary: str, *, source_text: str) -> bool:
    cleaned = _clean_text(summary)
    if len(cleaned) < 24:
        return False
    if _looks_like_source_echo(cleaned, source_text):
        return False
    if _contains_cjk(source_text) and not _contains_cjk(cleaned):
        return False
    return True


def _build_understanding_result(
    payload: dict[str, Any],
    *,
    provider_used: str,
    source_text: str,
) -> UnderstandingResult:
    raw_steps = [
        _normalize_solution_step(step, index)
        for index, step in enumerate(
            payload.get("solutionSteps") or payload.get("solution_steps") or [],
            start=1,
        )
    ]
    solution_steps = _sanitize_solution_steps(raw_steps, source_text=source_text)
    knowledge_points = _sanitize_knowledge_points(
        payload.get("knowledgePoints") or payload.get("knowledge_points") or [],
        source_text=source_text,
    )
    if not knowledge_points:
        knowledge_points = _sanitize_knowledge_points(
            [step.title for step in solution_steps],
            source_text=source_text,
        )

    topic_summary = _clean_text(
        payload.get("topicSummary") or payload.get("topic_summary") or ""
    )
    if not _summary_is_usable(topic_summary, source_text=source_text):
        topic_summary = _build_summary_from_solution_steps(
            solution_steps, source_text=source_text
        )

    return UnderstandingResult(
        topic_summary=topic_summary,
        knowledge_points=knowledge_points,
        solution_steps=solution_steps,
        difficulty=str(payload.get("difficulty") or "medium"),
        subject=str(payload.get("subject") or "general"),
        provider_used=provider_used,
    )


def _collect_understanding_issues(
    result: UnderstandingResult, *, source_text: str
) -> list[str]:
    issues: list[str] = []
    summary_ok = _summary_is_usable(result.topic_summary, source_text=source_text)
    if not summary_ok:
        issues.append("topicSummary 为空、过短，或只是重复题面。")
    if not summary_ok and not result.knowledge_points:
        issues.append("knowledgePoints 为空，或者掉成了题目语言不匹配的占位词。")
    if not summary_ok and not result.solution_steps:
        issues.append("solutionSteps 为空，无法支撑后续讲解。")
    return issues


def _normalize_solution_step(raw: Any, index: int) -> SolutionStep:
    data = raw if isinstance(raw, dict) else {}
    raw_step = data.get("step")
    explicit_step_id = data.get("stepId") or data.get("step_id")
    step_id = (
        str(explicit_step_id)
        if explicit_step_id is not None
        else f"step_{raw_step}"
        if raw_step is not None
        else f"step_{index}"
    )
    title = str(data.get("title") or f"步骤 {index}")
    explanation = str(data.get("explanation") or data.get("action") or title)
    return SolutionStep(step_id=step_id, title=title, explanation=explanation)


def _normalize_scene(raw: dict[str, Any], index: int) -> Scene:
    scene_id = str(raw.get("sceneId") or raw.get("scene_id") or f"scene_{index}")
    title = str(raw.get("title") or f"步骤 {index}")
    narration = str(
        raw.get("narration")
        or raw.get("voiceover")
        or raw.get("voiceText")
        or raw.get("voice_text")
        or title
    )
    visual_description = str(
        raw.get("visualDescription")
        or raw.get("visual_description")
        or raw.get("content")
        or raw.get("description")
        or raw.get("imageDesc")
        or raw.get("image_desc")
        or narration
    )
    duration_hint = int(raw.get("durationHint") or raw.get("duration_hint") or 0)
    order = int(raw.get("order") or index)
    voice_text = str(raw.get("voiceText") or raw.get("voice_text") or narration)
    image_desc = str(
        raw.get("imageDesc") or raw.get("image_desc") or visual_description
    )
    return Scene(
        scene_id=scene_id,
        title=title,
        narration=narration,
        visual_description=visual_description,
        duration_hint=max(duration_hint, 0),
        order=order,
        voice_text=voice_text,
        image_desc=image_desc,
    )


def _scale_scene_durations(scenes: list[Scene], target_duration: int) -> None:
    if not scenes:
        return
    raw_total = sum(max(scene.duration_hint, 0) for scene in scenes)
    if raw_total <= 0:
        base = max(target_duration // len(scenes), 1)
        remainder = max(target_duration - base * len(scenes), 0)
        for index, scene in enumerate(scenes):
            scene.duration_hint = base + (1 if index < remainder else 0)
        return

    scaled: list[int] = []
    running_total = 0
    for scene in scenes[:-1]:
        value = max(1, round(target_duration * scene.duration_hint / raw_total))
        scaled.append(value)
        running_total += value
    scaled.append(max(1, target_duration - running_total))
    for scene, duration in zip(scenes, scaled, strict=True):
        scene.duration_hint = duration


def _is_valid_fragment(code: str) -> bool:
    try:
        ast.parse(code)
    except SyntaxError:
        return False
    return True


def _ensure_scene_inheritance(script: str) -> str:
    if "class " not in script:
        return (
            f"class {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n    pass\n\n{script.lstrip()}"
        )

    pattern = re.compile(r"^(\s*class\s+\w+)\s*:\s*$", re.MULTILINE)

    def _replace(match: re.Match[str]) -> str:
        return f"{match.group(1)}(Scene):"

    replaced = pattern.sub(_replace, script, count=1)
    if replaced == script and "(Scene)" not in script and "Scene" not in script:
        return (
            f"class {DEFAULT_FIXED_SCENE_CLASS}(Scene):\n    pass\n\n{script.lstrip()}"
        )
    return replaced


def _write_placeholder_wav(path: Path) -> None:
    path.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt ")


def _decode_audio_payload(response: Any) -> tuple[bytes, str]:
    metadata = getattr(response, "metadata", None) or {}
    if isinstance(metadata, dict) and metadata.get("audioBase64"):
        audio_format = str(metadata.get("audioFormat") or "mp3").lower()
        return base64.b64decode(str(metadata["audioBase64"])), audio_format
    return b"RIFF\x24\x00\x00\x00WAVEfmt ", "wav"


@dataclass(slots=True)
class UnderstandingService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore

    async def execute(
        self, *, source_payload: dict[str, Any], user_profile: dict[str, Any]
    ) -> UnderstandingResult:
        source_text = _extract_source_text(source_payload)
        prompt = _build_understanding_prompt(
            source_payload=source_payload,
            user_profile=user_profile,
        )
        image_data = _read_image_as_base64(str(source_payload.get("imageRef") or ""))
        if image_data:
            image_b64, mime_type = image_data
            response = await self.failover_service.generate_vision(
                self.providers,
                prompt,
                image_base64=image_b64,
                image_media_type=mime_type,
            )
        else:
            response = await self.failover_service.generate(self.providers, prompt)
        provider_used = str(
            getattr(response, "provider", "") or _get_provider_id(self.providers[0])
            if self.providers
            else ""
        )
        raw_output = _get_text(response)
        payload = _try_parse_jsonish(raw_output)
        result = (
            _build_understanding_result(
                payload,
                provider_used=provider_used,
                source_text=source_text,
            )
            if payload is not None
            else UnderstandingResult(
                topic_summary="",
                knowledge_points=[],
                solution_steps=[],
                difficulty="medium",
                subject="general",
                provider_used=provider_used,
            )
        )

        issues = (
            ["返回内容不是合法 JSON 对象。"]
            if payload is None
            else _collect_understanding_issues(
                result,
                source_text=source_text,
            )
        )
        if issues:
            repair_prompt = _build_understanding_repair_prompt(
                source_payload=source_payload,
                user_profile=user_profile,
                previous_output=raw_output,
                issues=issues,
            )
            if image_data:
                repair_response = await self.failover_service.generate_vision(
                    self.providers,
                    repair_prompt,
                    image_base64=image_b64,
                    image_media_type=mime_type,
                    ignore_cached_unhealthy=True,
                )
            else:
                repair_response = await self.failover_service.generate(
                    self.providers,
                    repair_prompt,
                    ignore_cached_unhealthy=True,
                )
            repair_provider_used = str(
                getattr(repair_response, "provider", "")
                or _get_provider_id(self.providers[0])
                if self.providers
                else ""
            )
            repair_payload = _try_parse_jsonish(_get_text(repair_response))
            if repair_payload is None:
                raise ValueError("understanding repair response is not valid JSON")
            result = _build_understanding_result(
                repair_payload,
                provider_used=repair_provider_used,
                source_text=source_text,
            )

        self.runtime.save_model("understanding", result)
        return result


@dataclass(slots=True)
class StoryboardService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    async def execute(self, *, understanding: UnderstandingResult) -> Storyboard:
        active_settings = self.settings or get_settings()
        target_duration = int(
            getattr(active_settings, "video_target_duration_seconds", 120) or 120
        )
        prompt = json.dumps(
            {"understanding": understanding.model_dump(mode="json", by_alias=True)},
            ensure_ascii=False,
        )
        response = await self.failover_service.generate(self.providers, prompt)
        payload = _parse_jsonish(_get_text(response))
        scenes = [
            _normalize_scene(raw, index)
            for index, raw in enumerate(payload.get("scenes") or [], start=1)
        ]
        _scale_scene_durations(scenes, target_duration)
        result = Storyboard(
            scenes=scenes,
            total_duration=sum(scene.duration_hint for scene in scenes),
            target_duration=target_duration,
            provider_used=str(
                getattr(response, "provider", "") or _get_provider_id(self.providers[0])
                if self.providers
                else ""
            ),
        )
        self.runtime.save_model("storyboard", result)
        return result


@dataclass(slots=True)
class RuleBasedFixer:
    def fix(self, *, script_content: str, error_log: str) -> FixResult:
        fixed_script = build_default_fix_script(
            _ensure_scene_inheritance(script_content)
        )
        return FixResult(
            fixed=True,
            fixed_script=fixed_script,
            strategy="rule",
            error_type=(error_log.split(":", 1)[0] or "rule").strip(),
        )


@dataclass(slots=True)
class LLMBasedFixer:
    providers: Sequence[Any]
    failover_service: Any

    async def fix(
        self, *, storyboard: Storyboard, script_content: str, error_log: str
    ) -> FixResult:
        prompt = json.dumps(
            {
                "storyboard": storyboard.model_dump(mode="json", by_alias=True),
                "scriptContent": script_content,
                "errorLog": error_log,
            },
            ensure_ascii=False,
        )
        try:
            response = await self.failover_service.generate(self.providers, prompt)
            repaired = build_default_fix_script(_get_text(response))
            return FixResult(
                fixed=True,
                fixed_script=repaired,
                strategy="llm",
                error_type=(error_log.split(":", 1)[0] or "llm").strip(),
            )
        except Exception:  # noqa: BLE001
            return RuleBasedFixer().fix(
                script_content=script_content, error_log=error_log
            )


@dataclass(slots=True)
class ManimGenerationService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    async def execute(self, *, storyboard: Storyboard) -> ManimCodeResult:
        active_settings = self.settings or get_settings()
        scene_threshold = int(
            getattr(active_settings, "video_manim_scene_by_scene_max_scenes", 2) or 2
        )
        use_scene_by_scene = len(storyboard.scenes) >= scene_threshold

        if use_scene_by_scene:
            for index, scene in enumerate(storyboard.scenes, start=1):
                prompt = json.dumps(
                    {
                        "mode": "scene-by-scene",
                        "scene": scene.model_dump(mode="json", by_alias=True),
                    },
                    ensure_ascii=False,
                )
                response = await self.failover_service.generate(self.providers, prompt)
                code = extract_code_from_response(_get_text(response))
                if not _is_valid_fragment(code):
                    fallback_response = await self.failover_service.generate(
                        self.providers,
                        json.dumps(
                            {
                                "mode": "fallback",
                                "storyboard": storyboard.model_dump(
                                    mode="json", by_alias=True
                                ),
                            },
                            ensure_ascii=False,
                        ),
                        ignore_cached_unhealthy=True,
                    )
                    fallback_script = build_default_fix_script(
                        _get_text(fallback_response)
                    )
                    result = ManimCodeResult(
                        script_content=fallback_script,
                        scene_mapping=[],
                        provider_used=str(
                            getattr(fallback_response, "provider", "")
                            or _get_provider_id(self.providers[0])
                            if self.providers
                            else ""
                        ),
                    )
                    self.runtime.save_model("manim_code", result)
                    return result

            result = ManimCodeResult(
                script_content=build_default_manim_script(storyboard),
                scene_mapping=[],
                provider_used="scene-by-scene",
            )
            self.runtime.save_model("manim_code", result)
            return result

        response = await self.failover_service.generate(
            self.providers,
            json.dumps(
                {"storyboard": storyboard.model_dump(mode="json", by_alias=True)},
                ensure_ascii=False,
            ),
        )
        result = ManimCodeResult(
            script_content=build_default_fix_script(_get_text(response)),
            scene_mapping=[],
            provider_used=str(
                getattr(response, "provider", "") or _get_provider_id(self.providers[0])
                if self.providers
                else ""
            ),
        )
        self.runtime.save_model("manim_code", result)
        return result


@dataclass(slots=True)
class ComposeService:
    settings: Any
    runtime: VideoRuntimeStateStore

    def build_cover_command(self, output_path: str, cover_path: str) -> list[str]:
        return [
            "ffmpeg",
            "-y",
            "-ss",
            "1",
            "-i",
            output_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            cover_path,
        ]


@dataclass(slots=True)
class TTSService:
    providers: Sequence[Any]
    failover_service: Any
    runtime: VideoRuntimeStateStore
    settings: Any | None = None

    def _select_providers(self, voice_preference: dict[str, Any] | None) -> list[Any]:
        if not voice_preference:
            return list(self.providers)
        desired = str(
            voice_preference.get("voiceCode")
            or voice_preference.get("voice_code")
            or ""
        )
        matched = [
            provider
            for provider in self.providers
            if _get_provider_settings(provider).get("voice_code") == desired
        ]
        return matched or list(self.providers)

    def _build_voice_config(self, provider: Any) -> VoiceConfig:
        settings = _get_provider_settings(provider)
        return VoiceConfig(
            voice_id=str(settings.get("voice_code") or _get_provider_id(provider)),
            sample_rate=int(settings.get("sample_rate") or 44100),
            format=str(settings.get("format") or "mp3"),
        )

    @staticmethod
    def _can_call_providers_directly(providers: Sequence[Any]) -> bool:
        return bool(providers) and all(
            callable(getattr(provider, "synthesize", None)) for provider in providers
        )

    async def execute(
        self,
        *,
        task_id: str,
        storyboard: Storyboard,
        voice_preference: dict[str, Any] | None = None,
    ) -> TTSResult:
        provider_chain = self._select_providers(voice_preference)
        if provider_chain:
            selected_provider = provider_chain[0]
            selected_settings = _get_provider_settings(selected_provider)
            self.runtime.save_value(
                "tts_selected_voice",
                {
                    "voiceCode": selected_settings.get(
                        "voice_code", _get_provider_id(selected_provider)
                    ),
                    "resourceCode": selected_settings.get("resource_code"),
                    "resourceName": selected_settings.get("resource_name"),
                },
            )
        else:
            selected_provider = None

        work_dir = Path(tempfile.mkdtemp(prefix=f"video_{task_id}_tts_"))
        audio_segments: list[AudioSegment] = []
        provider_used: list[str] = []
        fallback_happened = False

        for index, scene in enumerate(storyboard.scenes, start=1):
            text = scene.voice_text or scene.narration
            if self._can_call_providers_directly(provider_chain):
                response = None
                provider_id = ""
                last_error: Exception | None = None
                for provider in provider_chain:
                    try:
                        response = await provider.synthesize(
                            text,
                            voice_config=self._build_voice_config(provider),
                        )
                        provider_id = str(
                            getattr(response, "provider", "")
                            or _get_provider_id(provider)
                        )
                        break
                    except Exception as exc:  # noqa: BLE001
                        last_error = exc
                if response is None:
                    raise last_error or RuntimeError("all TTS providers failed")
            else:
                response = await self.failover_service.synthesize(
                    provider_chain,
                    text,
                    voice_config=self._build_voice_config(
                        selected_provider or provider_chain[0]
                    )
                    if provider_chain
                    else None,
                )
                provider_id = str(
                    getattr(response, "provider", "")
                    or _get_provider_id(provider_chain[0])
                    if provider_chain
                    else ""
                )
            provider_used.append(provider_id)
            if provider_chain and provider_id != _get_provider_id(provider_chain[0]):
                fallback_happened = True

            audio_bytes, audio_format = _decode_audio_payload(response)
            audio_path = work_dir / f"{scene.scene_id}.{audio_format}"
            if audio_format == "wav":
                _write_placeholder_wav(audio_path)
            else:
                audio_path.write_bytes(audio_bytes)
            audio_segments.append(
                AudioSegment(
                    scene_id=scene.scene_id,
                    audio_path=str(audio_path),
                    duration=max(1, scene.duration_hint or 1),
                    format=audio_format,
                )
            )

        result = TTSResult(
            audio_segments=audio_segments,
            total_duration=sum(segment.duration for segment in audio_segments),
            provider_used=provider_used,
            failover_occurred=fallback_happened,
        )
        self.runtime.save_model("tts_result", result)
        return result


@dataclass(slots=True)
class UploadService:
    asset_store: LocalAssetStore
    settings: Any
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        task_id: str,
        compose_result: ComposeResult,
        on_retry=None,
    ) -> UploadResult:
        retry_attempts = max(
            int(getattr(self.settings, "video_upload_retry_attempts", 0) or 0), 0
        )
        total_attempts = retry_attempts + 1

        for attempt in range(1, total_attempts + 1):
            try:
                video_asset = self.asset_store.copy_file(
                    compose_result.video_path,
                    f"video/{task_id}/output.{VIDEO_OUTPUT_FORMAT}",
                )
                cover_asset = self.asset_store.copy_file(
                    compose_result.cover_path, f"video/{task_id}/cover.jpg"
                )
                result = UploadResult(
                    video_url=video_asset.public_url,
                    cover_url=cover_asset.public_url,
                )
                self.runtime.save_model("upload_result", result)
                return result
            except Exception as exc:  # noqa: BLE001
                if attempt == total_attempts:
                    raise
                if on_retry is not None:
                    await on_retry(attempt, retry_attempts, exc)
                await asyncio.sleep(attempt)

        raise RuntimeError("unreachable")


@dataclass(slots=True)
class ArtifactWritebackService:
    asset_store: LocalAssetStore

    def execute(
        self,
        *,
        task_id: str,
        understanding: UnderstandingResult,
        storyboard: Storyboard,
        tts_result: Any,
        manim_code: ManimCodeResult,
    ) -> tuple[VideoArtifactGraph, str]:
        timeline = []
        narration = []
        cursor = 0
        for scene in storyboard.scenes:
            start_time = cursor
            end_time = cursor + max(1, scene.duration_hint or 1)
            cursor = end_time
            timeline.append(
                {
                    "sceneId": scene.scene_id,
                    "title": scene.title,
                    "startTime": start_time,
                    "endTime": end_time,
                }
            )
            narration.append(
                {
                    "sceneId": scene.scene_id,
                    "text": scene.voice_text or scene.narration,
                    "startTime": start_time,
                    "endTime": end_time,
                }
            )

        graph = VideoArtifactGraph(
            session_id=task_id,
            artifacts=[
                ArtifactPayload(
                    artifact_type=ArtifactType.TIMELINE, data={"scenes": timeline}
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.STORYBOARD,
                    data=storyboard.model_dump(mode="json", by_alias=True),
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.NARRATION, data={"segments": narration}
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.KNOWLEDGE_POINTS,
                    data={"knowledgePoints": understanding.knowledge_points},
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.SOLUTION_STEPS,
                    data={
                        "solutionSteps": [
                            step.model_dump(mode="json", by_alias=True)
                            for step in understanding.solution_steps
                        ]
                    },
                ),
                ArtifactPayload(
                    artifact_type=ArtifactType.MANIM_CODE,
                    data=manim_code.model_dump(mode="json", by_alias=True),
                ),
            ],
        )
        asset = self.asset_store.write_json(
            f"video/{task_id}/artifact-graph.json",
            graph.model_dump(mode="json", by_alias=True),
        )
        return graph, asset.public_url


def _cleanup_pipeline_temp_dirs(*paths: str) -> None:
    roots: set[Path] = set()
    for raw_path in paths:
        path = Path(raw_path)
        candidate = path if path.is_dir() else path.parent
        while candidate != candidate.parent:
            if candidate.name.startswith("video_"):
                roots.add(candidate)
                break
            candidate = candidate.parent

    for root in roots:
        shutil.rmtree(root, ignore_errors=True)


__all__ = [
    "ArtifactWritebackService",
    "ComposeService",
    "LLMBasedFixer",
    "ManimGenerationService",
    "RuleBasedFixer",
    "StoryboardService",
    "TTSService",
    "UnderstandingService",
    "UploadService",
    "_cleanup_pipeline_temp_dirs",
]
