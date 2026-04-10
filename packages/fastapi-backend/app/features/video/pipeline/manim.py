"""Manim 代码生成与修复服务。

采用逐场景增量生成策略（Plan D 强化版）：
1. 对每个分镜场景，携带完整前文代码上下文调用 LLM 生成场景代码。
2. 每段代码经过 AST 参数注入 + 静态分析检查。
3. 增量拼接为完整的 Manim 脚本。
4. 失败时回退到单次全量生成或默认模板。
"""

from __future__ import annotations

import ast
import asyncio
import re
import textwrap
from dataclasses import dataclass
from typing import Any, Sequence

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger("app.features.video.pipeline.manim")
from app.features.video.pipeline._helpers import extract_code
from app.features.video.pipeline.auto_fix import ast_fix_code, check_layout, format_layout_issues, stat_check_fix
from app.features.video.pipeline.code_render.renderer import CodeRenderer
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.manim_runtime_prelude import ensure_manim_runtime_prelude
from app.features.video.pipeline.models import (
    FixResult,
    ManimCodeResult,
    SceneCodeMapping,
    SolveResult,
    Storyboard,
    VideoStage,
)
from app.features.video.pipeline.prompts.code_gen_prompts import (
    build_code_gen_system_prompt,
    build_scene_code_prompt,
)
from app.features.video.pipeline.prompts.layout_fix_prompts import build_layout_fix_prompt
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.script_templates import (
    build_default_fix_script,
    build_default_manim_script,
)
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService


_WAIT_CALL_PATTERN = re.compile(r"self\.wait\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)")
_RUN_TIME_PATTERN = re.compile(r"run_time\s*=\s*([0-9]+(?:\.[0-9]+)?)")


def _estimate_scene_code_duration_seconds(scene_code: str) -> float:
    """粗估场景代码已显式声明的动画时长。"""
    total_duration = sum(float(match.group(1)) for match in _WAIT_CALL_PATTERN.finditer(scene_code))
    total_duration += sum(float(match.group(1)) for match in _RUN_TIME_PATTERN.finditer(scene_code))

    for raw_line in scene_code.splitlines():
        line = raw_line.strip()
        if not line or "run_time" in line:
            continue
        if "self.add_elements(" in line or "self.add_element(" in line:
            total_duration += 0.9
        elif "self.play(" in line:
            total_duration += 1.0

    return total_duration


def _compress_scene_waits_to_target(scene_code: str, *, target_duration: int) -> str:
    """在超时明显时，优先压缩场景中的静态 wait 时长。"""
    if target_duration <= 0:
        return scene_code

    wait_matches = list(_WAIT_CALL_PATTERN.finditer(scene_code))
    if not wait_matches:
        return scene_code

    estimated_duration = _estimate_scene_code_duration_seconds(scene_code)
    overflow_seconds = estimated_duration - float(target_duration)
    if overflow_seconds <= 0.5:
        return scene_code

    original_waits = [float(match.group(1)) for match in wait_matches]
    reducible_waits = [max(wait_seconds - 0.2, 0.0) for wait_seconds in original_waits]
    total_reducible = sum(reducible_waits)
    if total_reducible <= 0.0:
        return scene_code

    reduction_ratio = min(overflow_seconds / total_reducible, 1.0)
    replacement_values = [
        round(wait_seconds - (reducible * reduction_ratio), 3)
        for wait_seconds, reducible in zip(original_waits, reducible_waits, strict=False)
    ]
    replacement_iter = iter(replacement_values)

    def _replace(match: re.Match[str]) -> str:
        next_value = next(replacement_iter)
        normalized_value = int(next_value) if float(next_value).is_integer() else next_value
        return f"self.wait({normalized_value})"

    return _WAIT_CALL_PATTERN.sub(_replace, scene_code)


def _is_valid_python_snippet(source: str) -> bool:
    """判断场景代码片段是否仍是可解析的 Python 语句块。"""
    try:
        ast.parse(source)
    except SyntaxError:
        return False
    return True


def _build_solve_context(solve_result: SolveResult | None) -> str:
    """构建注入代码生成 prompt 的参考答案上下文。"""
    if solve_result is None:
        return ""
    steps_text = "\n".join(
        f"  {step.title}：{step.explanation}" for step in solve_result.solution_steps[:5]
    )
    return (
        f"\n## 参考答案（确保代码中的数学内容与此一致）\n"
        f"答案：{solve_result.reference_answer}\n"
        f"解题步骤：\n{steps_text}\n"
    )


@dataclass(slots=True)
class ManimGenerationService:
    """Manim 脚本生成服务。

    统一走逐场景增量生成路径，每个场景传递完整前文代码上下文。
    失败后回退到单次全量生成。
    """

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore
    settings: Settings

    async def execute(
        self,
        *,
        storyboard: Storyboard,
        solve_result: SolveResult | None = None,
        emit_switch=None,
    ) -> ManimCodeResult:
        """执行 Manim 脚本生成，返回 ManimCodeResult。"""
        try:
            result = await self._generate_scene_by_scene(
                storyboard=storyboard,
                solve_result=solve_result,
                emit_switch=emit_switch,
            )
            if result is not None:
                return result
        except Exception:  # noqa: BLE001
            logger.warning("逐场景增量生成失败，回退到单次全量生成", exc_info=True)

        return await self._generate_single_pass(
            storyboard=storyboard,
            emit_switch=emit_switch,
            ignore_cached_unhealthy=True,
        )

    async def _generate_scene_by_scene(
        self,
        *,
        storyboard: Storyboard,
        solve_result: SolveResult | None = None,
        emit_switch=None,
    ) -> ManimCodeResult | None:
        """逐场景增量生成 Manim 代码。

        对每个场景：
        1. 构建带完整前文代码上下文的 prompt。
        2. LLM 生成当前场景代码。
        3. AST 自动参数注入。
        4. 静态分析检查修复。
        5. 增量拼接到总代码。
        """
        background_color = storyboard.video_config.background_color
        solve_context = _build_solve_context(solve_result)
        system_prompt = build_code_gen_system_prompt(
            background_color=background_color,
        )
        if solve_context:
            system_prompt = f"{system_prompt}\n{solve_context}"

        renderer = CodeRenderer()
        prev_code = ""
        scene_codes: list[tuple[Any, str]] = []

        for index, scene in enumerate(storyboard.scenes, start=1):
            image_desc = scene.image_desc or scene.visual_description

            user_prompt = build_scene_code_prompt(
                scene_title=scene.title,
                scene_voice_text=scene.voice_text or scene.narration,
                scene_image_desc=image_desc,
                scene_duration_hint=scene.duration_hint,
                current_code=prev_code if prev_code else "（这是第一个场景）",
            )
            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            try:
                provider_result = await asyncio.wait_for(
                    self.failover_service.generate(
                        self.providers,
                        full_prompt,
                        emit_switch=emit_switch,
                    ),
                    timeout=60.0,
                )
            except (ProviderAllFailedError, TimeoutError):
                logger.warning("场景 %s 的 LLM 生成失败或超时", scene.scene_id)
                return None

            logger.debug("[Manim] 场景%d LLM响应 (前400字): %s", index, provider_result.content[:400])
            scene_code = self._normalize_scene_code(
                scene=scene,
                raw_content=provider_result.content,
            )
            if scene_code is None:
                logger.warning("场景 %s 的增量代码不可用，回退到单次全量生成", scene.scene_id)
                return None

            scene_codes.append((scene, scene_code))
            prev_code = f"{prev_code}\n{scene_code}" if prev_code else scene_code

        if not scene_codes:
            return None

        return self._build_scene_script_result(
            storyboard=storyboard,
            scene_codes=scene_codes,
            provider_used="scene-by-scene",
            renderer=renderer,
        )

    def _normalize_scene_code(
        self,
        *,
        scene: Any,
        raw_content: str,
    ) -> str | None:
        """清洗单场景代码片段，保证后续本地装配安全。"""
        scene_code = extract_code(raw_content) or ""
        if not scene_code.strip():
            return None

        scene_code = scene_code.replace("ShowCreation", "Create")
        scene_code = textwrap.dedent(scene_code)
        scene_code = ast_fix_code(scene_code)
        scene_code = stat_check_fix(scene_code)

        # 布局静态验证（对标 manim4ai static_check，渲染前拦截越界/重叠）
        layout_issues = check_layout(scene_code)
        if layout_issues:
            issues_text = format_layout_issues(layout_issues)
            has_errors = any(i.severity == "error" for i in layout_issues)
            if has_errors:
                logger.warning("[布局检查] 发现 %d 个问题:\n%s", len(layout_issues), issues_text)
            else:
                logger.info("[布局检查] %d 个警告:\n%s", len(layout_issues), issues_text)

        scene_code = _compress_scene_waits_to_target(
            scene_code,
            target_duration=scene.duration_hint,
        )
        if not _is_valid_python_snippet(scene_code):
            return None
        return scene_code

    def _build_scene_script_result(
        self,
        *,
        storyboard: Storyboard,
        scene_codes: list[tuple[Any, str]],
        provider_used: str,
        renderer: CodeRenderer,
    ) -> ManimCodeResult:
        """将场景片段本地装配为完整脚本并构建结果对象。"""
        mappings: list[SceneCodeMapping] = []
        accumulated_code = ""
        for scene, scene_code in scene_codes:
            if accumulated_code:
                accumulated_code = renderer.render_scene_increment(
                    prev_code=accumulated_code,
                    current_scene_code=scene_code,
                )
            else:
                accumulated_code = scene_code

            line_count = accumulated_code.count("\n") + 1
            mappings.append(
                SceneCodeMapping(
                    scene_id=scene.scene_id,
                    title=scene.title,
                    start_line=max(1, line_count - scene_code.count("\n")),
                    end_line=line_count,
                )
            )

        video_config = storyboard.video_config.model_dump()
        scenes_data = []
        total_scenes = len(scene_codes)
        for index, (scene, scene_code) in enumerate(scene_codes, start=1):
            estimated_scene_duration = _estimate_scene_code_duration_seconds(scene_code)
            transition_buffer = 0.4 if index < total_scenes else 0.0
            scenes_data.append({
                "scene_id": scene.scene_id,
                "scene_code": scene_code,
                "scene_duration_hint": scene.duration_hint,
                "scene_hold_duration": round(
                    max(float(scene.duration_hint) - estimated_scene_duration - transition_buffer, 0.0),
                    3,
                ),
                "voiceText": scene.voice_text or scene.narration,
                "voiceRole": scene.voice_role,
            })

        full_script = renderer.render_full_script(
            scenes=scenes_data,
            video_config=video_config,
        )
        full_script = ensure_manim_runtime_prelude(full_script)

        result = ManimCodeResult(
            script_content=full_script,
            scene_mapping=mappings,
            scenes_data=scenes_data,
            video_config=video_config,
            provider_used=provider_used,
        )
        self.runtime.save_model("manim_code", result)
        logger.info(
            "[Manim完成] scenes=%d strategy=%s code_len=%d",
            len(scene_codes),
            provider_used,
            len(full_script),
        )
        return result

    async def _generate_single_pass(
        self,
        *,
        storyboard: Storyboard,
        emit_switch=None,
        ignore_cached_unhealthy: bool = False,
    ) -> ManimCodeResult:
        """单次全量生成 Manim 脚本。"""
        prompt = (
            "请根据 storyboard 输出可执行的 Manim Python 脚本。\n"
            f"{storyboard.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
                ignore_cached_unhealthy=ignore_cached_unhealthy,
            )
        except ProviderAllFailedError as exc:
            raise VideoPipelineError(
                stage=VideoStage.MANIM_GEN,
                error_code=VideoTaskErrorCode.VIDEO_MANIM_GEN_FAILED,
                message=str(exc),
            ) from exc

        script_content = extract_code(provider_result.content) or build_default_manim_script(storyboard)
        if "class " not in script_content:
            script_content = build_default_manim_script(storyboard)

        script_content = ast_fix_code(script_content)
        script_content = stat_check_fix(script_content)

        # 布局静态验证
        layout_issues = check_layout(script_content)
        if layout_issues:
            logger.warning("[布局检查-全量] %d 个问题", len(layout_issues))

        script_content = ensure_manim_runtime_prelude(script_content)

        mappings: list[SceneCodeMapping] = []
        current_line = 5
        for scene in storyboard.scenes:
            mappings.append(
                SceneCodeMapping(
                    scene_id=scene.scene_id,
                    title=scene.title,
                    start_line=current_line,
                    end_line=current_line + 5,
                )
            )
            current_line += 7

        result = ManimCodeResult(
            script_content=script_content,
            scene_mapping=mappings,
            provider_used=provider_result.provider,
        )
        self.runtime.save_model("manim_code", result)
        logger.info("[Manim完成] scenes=%d strategy=single-pass code_len=%d", len(storyboard.scenes), len(script_content))
        return result


class RuleBasedFixer:
    """基于规则的 Manim 脚本修复器。"""

    def fix(self, *, script_content: str, error_log: str) -> FixResult:
        """尝试用内置规则修复脚本错误。"""
        fixed_script = build_default_fix_script(script_content)
        success = fixed_script != script_content or "syntax" in error_log.lower()
        return FixResult(
            fixed=success,
            fixed_script=fixed_script if success else None,
            strategy="rule",
            error_type=error_log[:120] or "render_error",
            notes="Applied built-in Manim script normalization rules.",
        )


@dataclass(slots=True)
class LLMBasedFixer:
    """基于 LLM 的 Manim 脚本修复器。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService

    async def fix(
        self,
        *,
        storyboard: Storyboard,
        script_content: str,
        error_log: str,
        emit_switch=None,
    ) -> FixResult:
        """调用 LLM 修复 Manim 脚本错误。"""
        prompt = (
            "请修复下面的 Manim 脚本并仅返回代码。\n"
            f"错误日志：{error_log}\n"
            f"原始脚本：{script_content}\n"
            f"分镜：{storyboard.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
            )
        except ProviderAllFailedError:
            return FixResult(
                fixed=False,
                strategy="llm",
                error_type=error_log[:120] or "llm_fix_failed",
                notes="LLM fix provider chain exhausted.",
            )

        fixed_script = extract_code(provider_result.content) or build_default_manim_script(storyboard)

        fixed_script = ast_fix_code(fixed_script)
        fixed_script = stat_check_fix(fixed_script)
        fixed_script = ensure_manim_runtime_prelude(fixed_script)

        return FixResult(
            fixed=bool(fixed_script.strip()),
            fixed_script=fixed_script,
            strategy="llm",
            error_type=error_log[:120] or "llm_fix",
            notes=f"Provider used: {provider_result.provider}",
        )
