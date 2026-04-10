"""视频流水线 Manim 代码自动修复模块。

实现 5 层代码修复流水线，从参考项目适配而来：
1. ``ast_fix_code`` -- 基于正则的参数注入（中文/CJK 字体、CTex 模板）。
2. ``stat_check_fix`` -- 基于 AST 的静态分析，检测参数拼写错误与不存在的方法。
3. ``check_layout`` / ``format_layout_issues`` -- 布局静态验证（对标 manim4ai）。
4. ``ai_fix_code`` -- 基于 LLM 的智能代码修复。
5. ``render_fix`` -- 渲染时错误修复，含可视化验证。
"""

from __future__ import annotations

from app.features.video.pipeline.auto_fix.ai_fix import ai_fix_code
from app.features.video.pipeline.auto_fix.ast_fix import ast_fix_code
from app.features.video.pipeline.auto_fix.layout_check import check_layout, format_layout_issues
from app.features.video.pipeline.auto_fix.render_fix import render_fix
from app.features.video.pipeline.auto_fix.stat_check import stat_check_fix

__all__ = [
    "ai_fix_code",
    "ast_fix_code",
    "check_layout",
    "format_layout_issues",
    "render_fix",
    "stat_check_fix",
]
