"""Diagram widget HTML 生成提示词。

照搬 OpenMAIC ``diagram-content/{system,user}.md``，中文化。
"""
from __future__ import annotations

from typing import Any

from ._postmessage import POSTMESSAGE_LISTENER_SNIPPET

DIAGRAM_SYSTEM_PROMPT = f"""# 互动图示 Widget 生成器

生成一份自包含 HTML，实现可连接节点的交互式图示。

## 数据 Schema

```json
{{
  "nodes": [
    {{ "id": "n1", "label": "标签", "icon": "🎯", "details": "说明" }}
  ],
  "edges": [
    {{ "from": "n1", "to": "n2", "label": "next" }}
  ],
  "revealOrder": ["n1", "n2"]
}}
```

## 核心要求

1. **SVG 驱动**，配置内嵌 `<script type="application/json" id="widget-config">`
2. **首节点加载可见**（不允许空屏）
3. **高对比**：深色背景 + 浅色节点（或相反），边 label 浅色
4. **边连接到节点边缘**（考虑节点尺寸 + 箭头偏移）
5. 移动端侧栏可折叠，不遮挡图示
6. 点击节点不因 hover transform 抖动
7. 所有节点连通，不允许孤儿

## 边连接实现参考

```javascript
const NODE_WIDTH = 180, NODE_HEIGHT = 70, ARROW_OFFSET = 10;
function getEdgePoints(from, to) {{
  const dx = to.x - from.x, dy = to.y - from.y;
  let sx, sy, ex, ey;
  if (Math.abs(dy) > Math.abs(dx)) {{
    sx = from.x;
    sy = dy > 0 ? from.y + NODE_HEIGHT/2 : from.y - NODE_HEIGHT/2;
    ex = to.x;
    ey = dy > 0 ? to.y - NODE_HEIGHT/2 - ARROW_OFFSET : to.y + NODE_HEIGHT/2 + ARROW_OFFSET;
  }} else {{
    sx = dx > 0 ? from.x + NODE_WIDTH/2 : from.x - NODE_WIDTH/2;
    sy = from.y;
    ex = dx > 0 ? to.x - NODE_WIDTH/2 - ARROW_OFFSET : to.x + NODE_WIDTH/2 + ARROW_OFFSET;
    ey = to.y;
  }}
  return `M ${{sx}} ${{sy}} L ${{ex}} ${{ey}}`;
}}
```

{POSTMESSAGE_LISTENER_SNIPPET}

## 输出
只返回一份完整 HTML 文档，无围栏、无重复。
"""


def build_diagram_user_prompt(
    title: str,
    description: str,
    key_points: list[str],
    widget_outline: dict[str, Any],
    language: str = "zh-CN",
) -> str:
    diagram_type = widget_outline.get("diagramType", "flowchart")
    kp = "\n".join(f"- {p}" for p in (key_points or []))
    return f"""为以下主题生成互动图示：{title}

## 图示类型
{diagram_type}

## 描述
{description}

## 关键点
{kp}

## 语言
{language}

---

生成一份完整 HTML 图示，要求：

1. **SVG 节点**：含图标、标签、点击展开详情
2. **边 + 箭头**：从节点尺寸计算端点
3. **分步揭示**（下一步 / 上一步）
4. **高对比**：深色背景 + 浅色节点，浅色边标签
5. **移动友好**：侧栏可折叠，不挡图示
6. **首节点加载可见**

内嵌配置到 `<script type="application/json" id="widget-config">`。
"""
