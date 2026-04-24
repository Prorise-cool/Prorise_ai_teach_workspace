"""Simulation widget HTML 生成提示词。

照搬 OpenMAIC ``simulation-content/{system,user}.md``，中文化、压缩冗余。
"""
from __future__ import annotations

from typing import Any

from ._postmessage import POSTMESSAGE_LISTENER_SNIPPET

SIMULATION_SYSTEM_PROMPT = f"""# 模拟 Widget HTML 生成器

生成一份**自包含 HTML** 文档，实现可交互的模拟 widget。

## 结构要求

1. 标准 HTML5 结构
2. 内嵌 widget 配置：`<script type="application/json" id="widget-config">...</script>`
3. 控件面板（变量滑块）
4. Canvas 或 SVG 可视化
5. 移动端响应式布局
6. postMessage 监听器（必须）

## Widget 配置 Schema

```json
{{
  "type": "simulation",
  "concept": "projectile_motion",
  "description": "...",
  "variables": [
    {{ "name": "angle", "label": "Launch Angle", "min": 0, "max": 90, "default": 45, "unit": "°" }}
  ],
  "presets": [
    {{ "name": "命中目标", "variables": {{ "angle": 30, "velocity": 25 }} }}
  ]
}}
```

## 关键设计要求

### 1. 移动布局（不遮挡）
- 控件面板**不得**在移动端遮挡 canvas
- 使用 `flex-col md:flex-row`：移动端控件在上、canvas 在下
- canvas 区域 `min-h-[300px]`

### 2. Reset 按钮（必须真的重置）
- 独立的 reset 函数，重置**所有**状态变量（位置、速度、时间等）
- 状态机清晰：`running` / `paused` / `ended` 分开追踪

### 3. 按钮状态管理
- 按钮文字要反映点击后将发生的事：「启动」/「暂停」/「继续」/「重新开始」
- 一个按钮不能只靠文字判断要做什么

### 4. 触摸友好
- 按钮最小 44×44px
- Slider 拇指最小 24px
- `touch-action: manipulation` 防止双击缩放

### 5. 明显的动画反馈
- 点击「启动」后必须有**肉眼可见**的动画：对象移动、旋转、颜色变化
- 不要只改数字，要让用户直观看到模拟在运行

### 6. 数据展示
- 实时数值用等宽字体
- 单位一致

### 7. 性能
- 用 `requestAnimationFrame`
- 每帧 clear canvas
- 不要在渲染循环里 new 对象

## 对象定位（避开 UI 遮挡）

```javascript
const TOP_MARGIN = 100;
const BOTTOM_MARGIN = 200;
const playableHeight = canvas.height - TOP_MARGIN - BOTTOM_MARGIN;
const objectY = groundY - BOTTOM_MARGIN - (value / maxValue) * playableHeight;
```

{POSTMESSAGE_LISTENER_SNIPPET}

## 质量检查（输出前确认）

- [ ] 移动端控件不遮挡 canvas（320px 宽度下验证）
- [ ] Reset 按钮回到**精确**初始状态
- [ ] 按钮文字与行为一致
- [ ] 触点至少 44px
- [ ] Canvas 窗口 resize 正确响应
- [ ] 状态机清晰（running/paused/ended）
- [ ] 只有**一份** `<!DOCTYPE html>`
- [ ] 对象有可见动画
"""


def build_simulation_user_prompt(
    title: str,
    description: str,
    key_points: list[str],
    widget_outline: dict[str, Any],
    language: str = "zh-CN",
) -> str:
    concept = widget_outline.get("concept", title)
    key_variables = widget_outline.get("keyVariables", []) or widget_outline.get("variables", [])
    kp = "\n".join(f"- {p}" for p in (key_points or []))
    vars_text = "\n".join(f"- {v}" for v in key_variables) or "- 自动推断 2-4 个可调参数"

    return f"""为以下概念生成模拟 widget：{concept}

## 概念概述

{description}

## 关键点

{kp}

## 待暴露变量

{vars_text}

## 语言

{language}

---

生成一份完整的可交互 HTML 模拟，包含这些必须特性：

### 结构
1. 内嵌 JSON 配置
2. 各变量的滑块控件面板
3. Canvas 可视化
4. 常用场景预设按钮

### 移动响应（关键）
1. 控件面板**不得**在移动端遮挡 canvas
2. 使用 `flex-col md:flex-row` 布局
3. 触控友好（44px 最小触点）

### 按钮逻辑（关键）
1. 主按钮正确处理所有状态：启动 / 暂停 / 重新开始
2. Reset 必须重置**所有**状态变量

### Canvas
1. 窗口 resize 自动适应
2. 清晰的可视化（含网格或参考线）
3. 实时数据显示

### 交互
1. 滑块实时更新
2. 预设应用并重置模拟
3. 键盘快捷键（空格切换播放，R 重置）
4. 移动端触控手势

### 视觉
1. 明显的运行状态指示
2. 结束时清晰反馈
3. 高对比配色
"""
