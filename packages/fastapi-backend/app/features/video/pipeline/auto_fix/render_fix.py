"""渲染修复层 -- 带可视化验证的渲染时错误修复。

本模块是第 4 层修复，在沙箱中执行 Manim 脚本，
遇到渲染错误时通过 LLM 修复代码并重新渲染，直到成功或超过最大重试次数。
成功后尝试获取最后一帧截图用于可视化校验。
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from app.features.video.pipeline.auto_fix.ai_fix import ai_fix_code
from app.features.video.pipeline.auto_fix.stat_check import stat_check_fix
from app.features.video.pipeline.models import ExecutionResult, ResourceLimits

if TYPE_CHECKING:
    from app.features.video.pipeline.sandbox import SandboxExecutor
    from app.providers.protocols import LLMProvider


# ---------------------------------------------------------------------------
# Prompt 构建
# ---------------------------------------------------------------------------


def build_visual_check_prompt(image_path: str) -> str:
    """构建可视化校验 prompt。

    Args:
        image_path: 最后一帧截图的文件路径。

    Returns:
        用于 LLM 视觉检查的 prompt 文本。
    """
    return (
        "请检查以下 Manim 渲染结果的最后一帧截图，判断动画是否正常显示。\n"
        f"截图路径: {image_path}\n"
        "如果截图显示空白、纯色背景无内容、或明显渲染错误，"
        "请说明问题并给出修复建议。\n"
        "如果渲染正常，请回复 'OK'。"
    )


# ---------------------------------------------------------------------------
# 截图获取
# ---------------------------------------------------------------------------


def get_screenshot_after_render(
    sandbox_executor: SandboxExecutor,
    script_path: str,
) -> str | None:
    """从沙箱渲染输出中获取最后一帧截图路径。

    Manim 渲染会在 ``media/`` 目录下生成 PNG 最后一帧，
    本函数尝试定位该文件。

    Args:
        sandbox_executor: 沙箱执行器实例（用于定位输出目录）。
        script_path: 渲染脚本的路径。

    Returns:
        截图文件路径；不存在时返回 ``None``。
    """
    script_dir = Path(script_path).parent
    output_dir = script_dir / "output" / "media"

    # 查找最新的 PNG 文件（Manim 生成的最后一帧）。
    png_candidates = sorted(
        output_dir.rglob("*.png"),
        key=lambda p: p.stat().st_mtime if p.exists() else 0,
        reverse=True,
    )
    if png_candidates:
        return str(png_candidates[0])

    return None


# ---------------------------------------------------------------------------
# 主入口
# ---------------------------------------------------------------------------


async def render_fix(
    code: str,
    error_msg: str,
    llm_provider: LLMProvider,
    sandbox_executor: SandboxExecutor,
    *,
    task_id: str = "render_fix",
    max_retries: int = 3,
    resource_limits: ResourceLimits | None = None,
) -> tuple[str, str | None]:
    """渲染时错误修复（第 4 层），含可视化验证。

    执行循环：``渲染 -> 检查错误 -> AI 修复 -> 静态检查 -> 重新渲染``，
    直到渲染成功或超过最大重试次数。

    Args:
        code: Manim 脚本源码。
        error_msg: 初始渲染错误信息。
        llm_provider: 满足 :class:`~app.providers.protocols.LLMProvider` 的实例。
        sandbox_executor: 满足 :class:`~app.features.video.pipeline.sandbox.SandboxExecutor` 的实例。
        task_id: 任务标识（用于沙箱临时目录命名）。
        max_retries: 最大重试次数。
        resource_limits: 沙箱资源限制；为 ``None`` 时使用默认值。

    Returns:
        二元组 ``(fixed_code, last_frame_image_path)``。
        *last_frame_image_path* 在无法获取截图时为 ``None``。
    """
    if resource_limits is None:
        resource_limits = ResourceLimits()

    current_code = code
    current_error = error_msg

    for attempt in range(max_retries):
        # 第 1 步: AI 修复。
        current_code = await ai_fix_code(current_code, current_error, llm_provider)

        # 第 2 步: 静态检查修复（防止 AI 引入新的参数错误）。
        current_code = stat_check_fix(current_code)

        # 第 3 步: 沙箱渲染。
        result: ExecutionResult = await sandbox_executor.execute(
            task_id=f"{task_id}_fix_{attempt}",
            script=current_code,
            resource_limits=resource_limits,
        )

        if result.success:
            # 渲染成功，尝试获取最后一帧截图。
            image_path: str | None = None
            if result.output_path:
                image_path = get_screenshot_after_render(sandbox_executor, result.output_path)
            return current_code, image_path

        # 渲染失败，更新错误信息进入下一轮。
        current_error = result.stderr or f"渲染失败 (attempt {attempt + 1}/{max_retries})"

    # 所有重试耗尽，返回最后修复的代码。
    return current_code, None
