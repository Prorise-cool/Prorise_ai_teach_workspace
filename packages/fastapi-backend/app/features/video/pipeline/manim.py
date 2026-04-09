"""Manim 代码生成与修复服务。

包含:
- ``ManimGenerationService``: 根据分镜生成 Manim Python 脚本。
- ``RuleBasedFixer``: 基于规则的脚本修复器。
- ``LLMBasedFixer``: 基于 LLM 的脚本修复器。
三者紧密耦合，共同完成"生成 → 渲染 → 修复"循环。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from app.features.video.pipeline._helpers import extract_code, first_non_empty
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.models import (
    FixResult,
    ManimCodeResult,
    SceneCodeMapping,
    Storyboard,
    VideoStage,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.script_templates import build_default_fix_script, build_default_manim_script
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService


@dataclass(slots=True)
class ManimGenerationService:
    """Manim 脚本生成服务，调用 LLM 根据分镜生成可执行的 Manim 代码。"""

    providers: Sequence[Any]
    failover_service: ProviderFailoverService
    runtime: VideoRuntimeStateStore

    async def execute(
        self,
        *,
        storyboard: Storyboard,
        emit_switch=None,
    ) -> ManimCodeResult:
        """执行 Manim 脚本生成，返回 ``ManimCodeResult``。"""
        prompt = (
            "请根据 storyboard 输出可执行的 Manim Python 脚本。\n"
            f"{storyboard.model_dump_json(by_alias=True)}"
        )
        try:
            provider_result = await self.failover_service.generate(
                self.providers,
                prompt,
                emit_switch=emit_switch,
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
            error_type=first_non_empty([error_log], fallback="render_error"),
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
        return FixResult(
            fixed=bool(fixed_script.strip()),
            fixed_script=fixed_script,
            strategy="llm",
            error_type=error_log[:120] or "llm_fix",
            notes=f"Provider used: {provider_result.provider}",
        )
