"""逐场景渲染验证与修复服务。

参考 manim-to-video-claw 的 render_fix_code.py 逻辑：
1. 渲染完整脚本。
2. 若失败，R1 分析错误根因。
3. V3 根据分析修复代码。
4. 重试渲染（最多 max_verify_attempts 次）。
5. 全部失败后抛出 VideoPipelineError。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from app.core.logging import get_logger
from app.features.video.pipeline._helpers import extract_code, extract_json_object
from app.features.video.pipeline.auto_fix import ast_fix_code, stat_check_fix
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.manim_runtime_prelude import ensure_manim_runtime_prelude
from app.features.video.pipeline.models import (
    ExecutionResult,
    FixLogEntry,
    ManimCodeResult,
    ResourceLimits,
    VideoStage,
)
from app.features.video.pipeline.prompts.render_verify_prompts import (
    build_render_verify_analyze_prompt,
    build_render_verify_fix_prompt,
)
from app.features.video.pipeline.runtime import VideoRuntimeStateStore
from app.features.video.pipeline.sandbox import SandboxExecutor, ScriptSecurityViolation
from app.providers.failover import ProviderAllFailedError, ProviderFailoverService

logger = get_logger("app.features.video.pipeline.render_verify")


@dataclass(slots=True)
class RenderVerifyService:
    """逐场景渲染验证与修复服务。

    使用两阶段 LLM 协作修复：
    - analyze_providers (R1): 深度推理，分析错误根因。
    - fix_providers (V3): 快速生成，根据分析修复代码。
    """

    analyze_providers: Sequence[Any]
    fix_providers: Sequence[Any]
    failover_service: ProviderFailoverService
    sandbox_executor: SandboxExecutor
    runtime: VideoRuntimeStateStore
    max_verify_attempts: int = 4

    async def execute(
        self,
        *,
        task_id: str,
        manim_code: ManimCodeResult,
        resource_limits: ResourceLimits,
        emit_progress=None,
        emit_event=None,
    ) -> tuple[ExecutionResult, ManimCodeResult]:
        """执行渲染验证循环。

        Returns:
            (render_result, final_manim_code) — 成功的渲染结果与最终代码。

        Raises:
            VideoPipelineError: 所有修复尝试耗尽后仍失败。
        """
        current_code = manim_code
        last_error = ""
        fix_history: list[str] = []

        for attempt in range(self.max_verify_attempts + 1):
            attempt_no = attempt + 1
            if emit_event is not None:
                await emit_event(
                    "render_start",
                    attempt_no=attempt_no,
                    message="正在渲染动画" if attempt == 0 else f"正在重新渲染动画（第 {attempt_no} 次）",
                )
            render_result = await self._render(task_id, current_code.script_content, resource_limits)

            if render_result.success:
                self.runtime.save_value("render_output", {"outputPath": render_result.output_path})
                logger.info(
                    "[RenderVerify] 渲染成功 attempt=%d code_len=%d",
                    attempt,
                    len(current_code.script_content),
                )
                if emit_event is not None:
                    await emit_event("render_success", attempt_no=attempt_no, message="动画渲染完成")
                return render_result, current_code

            last_error = render_result.stderr or render_result.error_type or "render_error"
            logger.warning(
                "[RenderVerify] 渲染失败 attempt=%d error=%s",
                attempt,
                last_error[:200],
            )

            if attempt >= self.max_verify_attempts:
                if emit_event is not None:
                    await emit_event(
                        "fix_exhausted",
                        attempt_no=max(attempt_no, 1),
                        message="自动修复次数已耗尽",
                    )
                break

            if emit_progress is not None:
                ratio = (attempt + 1) / max(self.max_verify_attempts, 1)
                await emit_progress(ratio, f"渲染修复中（第 {attempt + 1} 次）")
            if emit_event is not None:
                await emit_event(
                    "fix_start",
                    attempt_no=attempt_no,
                    message=f"开始第 {attempt_no} 次自动修复",
                )

            # --- 两阶段 LLM 修复 ---
            fixed_script = await self._analyze_and_fix(
                script_content=current_code.script_content,
                error_log=last_error,
                attempt_no=attempt + 1,
                fix_history=fix_history,
            )

            if fixed_script is None:
                # LLM 修复失败，退化到规则修复
                fixed_script = self._rule_fix(current_code.script_content)

            fixed_script = ensure_manim_runtime_prelude(fixed_script)
            current_code = current_code.model_copy(update={"script_content": fixed_script})
            self.runtime.save_model("manim_code", current_code)
            if emit_event is not None:
                await emit_event(
                    "fix_applied",
                    attempt_no=attempt_no,
                    message=f"第 {attempt_no} 次修复完成，重新进入渲染",
                )

        raise VideoPipelineError(
            stage=VideoStage.RENDER_VERIFY,
            error_code=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
            message=f"渲染验证循环耗尽 ({self.max_verify_attempts} 次): {last_error[:200]}",
        )

    async def _render(
        self,
        task_id: str,
        script_content: str,
        resource_limits: ResourceLimits,
    ) -> ExecutionResult:
        """在沙箱中执行渲染。"""
        try:
            return await self.sandbox_executor.execute(
                task_id=task_id,
                script=script_content,
                resource_limits=resource_limits,
            )
        except ScriptSecurityViolation as exc:
            return ExecutionResult(
                success=False,
                stderr=str(exc),
                exit_code=1,
                duration_seconds=0.0,
                error_type=exc.error_code.value,
            )

    async def _analyze_and_fix(
        self,
        *,
        script_content: str,
        error_log: str,
        attempt_no: int,
        fix_history: list[str],
    ) -> str | None:
        """两阶段 LLM 修复：R1 分析 → V3 修复。"""
        # Stage 1: R1 深度分析（携带对话历史）
        analysis = await self._analyze_error(
            script_content=script_content,
            error_log=error_log,
            fix_history=fix_history,
        )
        self.runtime.append_fix_log(
            FixLogEntry(
                attempt_no=attempt_no,
                strategy="llm",
                error_type="render_verify_analyze",
                success=bool(analysis),
                message=f"R1 分析: {(analysis or 'failed')[:120]}",
            ).model_dump(mode="json", by_alias=True)
        )

        if not analysis:
            return None

        # 记录本轮修复历史供下一轮 R1 使用
        fix_history.append(
            f"第{attempt_no}轮分析: {analysis[:300]}\n渲染错误: {error_log[:300]}"
        )

        # Stage 2: V3 代码修复（携带原始 error_log）
        fixed = await self._fix_code(
            script_content=script_content,
            error_analysis=analysis,
            error_log=error_log,
        )
        self.runtime.append_fix_log(
            FixLogEntry(
                attempt_no=attempt_no,
                strategy="llm",
                error_type="render_verify_fix",
                success=bool(fixed),
                message=f"V3 修复: {'success' if fixed else 'failed'}",
            ).model_dump(mode="json", by_alias=True)
        )

        return fixed

    async def _analyze_error(
        self,
        *,
        script_content: str,
        error_log: str,
        fix_history: list[str] | None = None,
    ) -> str | None:
        """R1 分析渲染错误根因（携带对话历史）。"""
        prompt = build_render_verify_analyze_prompt(
            error_log=error_log,
            script_content=script_content,
            fix_history=fix_history or [],
        )
        try:
            result = await self.failover_service.generate(
                self.analyze_providers,
                prompt,
            )
        except ProviderAllFailedError:
            logger.warning("[RenderVerify] R1 分析 provider 全部失败")
            return None

        parsed = extract_json_object(result.content)
        if parsed and parsed.get("rootCause"):
            return (
                f"错误类别: {parsed.get('errorCategory', '未知')}\n"
                f"根因: {parsed['rootCause']}\n"
                f"影响行: {parsed.get('affectedLines', '未知')}\n"
                f"修复建议: {parsed.get('fixSuggestion', '')}"
            )

        # JSON 解析失败，取原文前 800 字作为分析
        raw = result.content.strip()
        return raw[:800] if raw else None

    async def _fix_code(
        self,
        *,
        script_content: str,
        error_analysis: str,
        error_log: str = "",
    ) -> str | None:
        """V3 根据分析修复代码。"""
        prompt = build_render_verify_fix_prompt(
            error_analysis=error_analysis,
            script_content=script_content,
            error_log=error_log,
        )
        try:
            result = await self.failover_service.generate(
                self.fix_providers,
                prompt,
            )
        except ProviderAllFailedError:
            logger.warning("[RenderVerify] V3 修复 provider 全部失败")
            return None

        fixed_script = extract_code(result.content)
        if not fixed_script or "class " not in fixed_script:
            return None

        fixed_script = ast_fix_code(fixed_script)
        fixed_script = stat_check_fix(fixed_script)
        return fixed_script

    @staticmethod
    def _rule_fix(script_content: str) -> str:
        """规则层兜底修复。"""
        fixed = ast_fix_code(script_content)
        fixed = stat_check_fix(fixed)
        return fixed
