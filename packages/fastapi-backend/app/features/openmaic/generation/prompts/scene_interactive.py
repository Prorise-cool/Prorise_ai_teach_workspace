"""互动场景内容生成提示词.

Ported from OpenMAIC /lib/prompts/templates/interactive-content style.
"""

from __future__ import annotations

INTERACTIVE_CONTENT_SYSTEM_PROMPT = """你是一位专业的教育技术专家，擅长创建互动学习体验。
生成自包含的HTML/CSS/JS互动可视化，在iframe中运行。

## 技术要求
1. 单个HTML文件，内嵌CSS和JavaScript
2. 无需外部依赖（除CDN链接外）
3. 响应式设计，适配800×600容器
4. 移动端触控友好

## 可使用的CDN库
- D3.js: https://cdn.jsdelivr.net/npm/d3@7
- Three.js: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js
- Chart.js: https://cdn.jsdelivr.net/npm/chart.js
- Matter.js (物理): https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js
- p5.js: https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js
- KaTeX (数学): https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js

## 互动元素设计原则
1. 有清晰的互动控件（滑块、按钮、拖拽等）
2. 实时反馈和可视化更新
3. 有说明文字和标签
4. 包含重置/重新开始功能
5. 颜色配色专业、可读性强

## 输出格式
```json
{
  "html": "完整的HTML内容（包含<!DOCTYPE html>...）",
  "css": null,
  "js": null
}
```

注意：css和js字段设为null，所有代码内嵌在html字段中。
直接输出JSON，不要markdown代码块。
"""


def build_interactive_content_user_prompt(
    outline_title: str,
    outline_description: str,
    key_points: list[str],
    widget_type: str | None,
    widget_outline: dict | None,
    interactive_config: dict | None,
    language_directive: str,
) -> str:
    """Build user prompt for interactive content generation."""
    key_points_text = "\n".join(f"- {kp}" for kp in key_points) if key_points else "（根据场景描述）"

    widget_info = ""
    if widget_type and widget_outline:
        widget_info = f"""
## 部件配置
- **类型**：{widget_type}
- **配置**：{widget_outline}
"""
    elif interactive_config:
        widget_info = f"""
## 互动配置
- **概念**：{interactive_config.get('conceptName', outline_title)}
- **概述**：{interactive_config.get('conceptOverview', outline_description)}
- **设计思路**：{interactive_config.get('designIdea', '')}
- **学科**：{interactive_config.get('subject', '')}
"""

    return f"""请为以下互动场景生成自包含的HTML互动可视化。

## 语言指令
{language_directive}

## 场景信息
- **标题**：{outline_title}
- **描述**：{outline_description}
- **关键要点**：
{key_points_text}
{widget_info}

## 要求
1. 生成完整的自包含HTML文件
2. 互动元素直观易用
3. 用指定语言显示所有文字说明
4. 视觉效果专业、教育价值高

直接输出JSON对象，html字段包含完整HTML代码。
"""
