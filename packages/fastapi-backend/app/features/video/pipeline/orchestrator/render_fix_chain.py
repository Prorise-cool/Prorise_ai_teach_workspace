"""渲染修复链混入。"""

from __future__ import annotations

from app.core.logging import get_logger
from app.features.video.pipeline.auto_fix import ast_fix_code, stat_check_fix
from app.features.video.pipeline.errors import VideoPipelineError, VideoTaskErrorCode
from app.features.video.pipeline.manim import LLMBasedFixer, RuleBasedFixer
from app.features.video.pipeline.manim_runtime_prelude import ensure_manim_runtime_prelude
from app.features.video.pipeline.models import (
    FixLogEntry,
    ManimCodeResult,
    ResourceLimits,
    VideoStage,
)
from app.features.video.pipeline.sandbox import ScriptSecurityViolation
from app.shared.task_framework.base import BaseTask
from app.shared.task_framework.status import coerce_task_error_code

logger = get_logger("app.features.video.pipeline")


class RenderFixChainMixin:
    """渲染 + 四层自动修复循环。"""

    async def _run_render_with_fix_chain(
        self,
        task: BaseTask,
        runtime,  # VideoRuntimeStateStore
        *,
        storyboard,  # Storyboard
        manim_code: ManimCodeResult,
        rule_fixer: RuleBasedFixer,
        llm_fixer: LLMBasedFixer,
    ) -> tuple:  # tuple[ExecutionResult, ManimCodeResult]
        """执行渲染 + 四层自动修复循环。

        四层修复管道：
        1. AST 参数注入（自动补全中文渲染参数）
        2. 静态分析检查（参数拼写错误、方法存在性）
        3. 规则修复 + LLM 智能修复
        4. 重新渲染验证
        """
        resource_limits = ResourceLimits(
            cpu_count=self.settings.video_sandbox_cpu_count,
            memory_mb=self.settings.video_sandbox_memory_mb,
            timeout_seconds=self.settings.video_sandbox_timeout_seconds,
            tmp_size_mb=self.settings.video_sandbox_tmp_size_mb,
        )
        current_code = manim_code
        max_attempts = max(self.settings.video_fix_max_attempts, 0)
        attempt_no = 0

        while True:
            await self._emit_stage(task, VideoStage.RENDER, 0.0, "正在渲染动画")
            render_result = await self._execute_render(task.context.task_id, current_code.script_content, resource_limits)
            if render_result.success:
                runtime.save_value("render_output", {"outputPath": render_result.output_path})
                await self._emit_stage(task, VideoStage.RENDER, 1.0, "动画渲染完成")
                return render_result, current_code

            if attempt_no >= max_attempts:
                await self._emit_fix_event(
                    task,
                    attempt_no=max(attempt_no, 1),
                    fix_event="fix_exhausted",
                    message="自动修复次数已耗尽",
                )
                error_code = coerce_task_error_code(
                    render_result.error_type,
                    fallback=VideoTaskErrorCode.VIDEO_RENDER_FAILED,
                )
                raise VideoPipelineError(
                    stage=VideoStage.RENDER,
                    error_code=error_code,
                    message=render_result.stderr or "render failed",
                )

            attempt_no += 1
            await self._emit_fix_event(
                task,
                attempt_no=attempt_no,
                fix_event="fix_attempt_start",
                message=f"开始第 {attempt_no} 次自动修复（四层管道）",
            )

            error_log = render_result.stderr or render_result.error_type or "render_error"
            fixed_script = current_code.script_content

            # Layer 1: AST 参数注入。
            fixed_script = ast_fix_code(fixed_script)
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type="ast_fix",
                    success=True,
                    message="Layer 1: AST 参数注入完成",
                ).model_dump(mode="json", by_alias=True)
            )

            # Layer 2: 静态分析检查。
            fixed_script = stat_check_fix(fixed_script)
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type="stat_check",
                    success=True,
                    message="Layer 2: 静态分析检查完成",
                ).model_dump(mode="json", by_alias=True)
            )

            # Layer 3a: 规则修复。
            rule_fix = rule_fixer.fix(
                script_content=fixed_script,
                error_log=error_log,
            )
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="rule",
                    error_type=rule_fix.error_type,
                    success=rule_fix.fixed,
                    message=rule_fix.notes or "rule fix",
                ).model_dump(mode="json", by_alias=True)
            )
            if rule_fix.fixed and rule_fix.fixed_script:
                fixed_script = rule_fix.fixed_script

            # Layer 3b: LLM 智能修复。
            llm_fix = await llm_fixer.fix(
                storyboard=storyboard,
                script_content=fixed_script,
                error_log=error_log,
                emit_switch=self._build_switch_emitter(task, VideoStage.MANIM_FIX, 0.6),
            )
            runtime.append_fix_log(
                FixLogEntry(
                    attempt_no=attempt_no,
                    strategy="llm",
                    error_type=llm_fix.error_type,
                    success=llm_fix.fixed,
                    message=llm_fix.notes or "llm fix",
                ).model_dump(mode="json", by_alias=True)
            )
            if llm_fix.fixed and llm_fix.fixed_script:
                fixed_script = llm_fix.fixed_script

            # Layer 4: 更新代码并重新渲染（循环回到 while 顶部）。
            fixed_script = ensure_manim_runtime_prelude(fixed_script)
            current_code = current_code.model_copy(update={"script_content": fixed_script})
            runtime.save_model("manim_code", current_code)
            await self._emit_fix_event(
                task,
                attempt_no=attempt_no,
                fix_event="fix_attempt_success",
                message="四层修复完成，重新进入渲染",
            )

    async def _execute_render(
        self,
        task_id: str,
        script_content: str,
        resource_limits: ResourceLimits,
    ):
        """在沙箱中执行 Manim 渲染。"""
        from app.features.video.pipeline.models import ExecutionResult

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
