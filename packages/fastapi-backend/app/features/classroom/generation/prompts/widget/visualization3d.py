"""3D visualization widget HTML 生成提示词。

照搬 OpenMAIC ``visualization3d-content/{system,user}.md``，中文化。
"""
from __future__ import annotations

from typing import Any

from ._postmessage import POSTMESSAGE_LISTENER_SNIPPET

VISUALIZATION3D_SYSTEM_PROMPT = f"""# 3D 可视化 Widget 生成器

用 Three.js 生成自包含 HTML 的 3D 可视化。

## 结构

1. 标准 HTML5 结构
2. 从 CDN 加载 Three.js（unpkg / cdnjs / importmap）
3. 内嵌 widget 配置 `<script type="application/json" id="widget-config">`
4. 3D 场景 + 交互控制（OrbitControls、滑块、按钮、**缩放按钮**）
5. 移动端响应式
6. postMessage 监听器（必须）

## 关键要求

### 1. 光照 —— 对象必须清晰可见

**务必：**
- 背景不要纯黑（用 `#0a0a1a` 深蓝或渐变）
- `AmbientLight` 强度至少 `0.4`（不是 0.1！）
- 主对象加专属灯
- 行星/地球用明亮漫反射色
- 加 `HemisphereLight` 做自然环境光

```javascript
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(10, 20, 10);
scene.add(dir);
```

### 2. 缩放按钮（移动端必备）

```html
<div class="zoom-controls">
  <button id="zoom-in-btn">+</button>
  <button id="zoom-out-btn">−</button>
</div>
```

```javascript
document.getElementById('zoom-in-btn').addEventListener('click', () => {{
  const d = new THREE.Vector3();
  camera.getWorldDirection(d);
  camera.position.addScaledVector(d, 5);
}});
```

### 3. 真实对象
- 使用程序化纹理或明亮的材质色
- 避免全灰模型

### 4. OrbitControls
- 触控启用
- 正确的阻尼

### 5. 移动考虑
- 低多边形
- 控件放底部便于拇指操作
- 可读字号

### 6. 动画
- `requestAnimationFrame`
- 支持暂停/播放
- 尊重 `animationSpeed` 变量

{POSTMESSAGE_LISTENER_SNIPPET}

## 输出
只返回一份完整 HTML 文档。
"""


def build_visualization3d_user_prompt(
    title: str,
    description: str,
    key_points: list[str],
    widget_outline: dict[str, Any],
    language: str = "zh-CN",
) -> str:
    viz_type = widget_outline.get("visualizationType", "custom")
    objects = widget_outline.get("objects", [])
    interactions = widget_outline.get("interactions", [])
    kp = "\n".join(f"- {p}" for p in (key_points or []))
    objs_text = "\n".join(f"- {o}" for o in objects) or "- 按主题自动推断"
    inters_text = "\n".join(f"- {i}" for i in interactions) or "- orbit 控制 + 参数滑块"
    return f"""为以下主题生成 3D 可视化：{title}

## 可视化类型

{viz_type}

## 描述

{description}

## 关键点

{kp}

## 待渲染对象

{objs_text}

## 交互控制

{inters_text}

## 语言

{language}

---

用 Three.js 生成完整可交互 3D 可视化，要求：

### 场景
1. Three.js 从 CDN 加载（推荐 importmap）
2. 合理光照（ambient + directional + hemisphere）
3. OrbitControls
4. 响应式 canvas 充满容器

### 对象
1. 按可视化类型创建 3D 对象
2. 合适材质（Phong / Standard / Emissive）
3. 有意义的颜色与纹理
4. 把对象存在 `objects` 字典中供教师动作使用

### 交互
1. 控参滑块（速度、缩放等）
2. 预设 + 重置按钮
3. 信息面板展示当前状态
4. 触控友好（44px 最小）
5. **必须包含缩放按钮**

### 动画
1. `requestAnimationFrame`
2. 暂停/播放
3. 尊重 `animationSpeed`

### Teacher Actions
1. 包含 postMessage 监听器
2. 支持 SET_WIDGET_STATE 控制摄像机与对象
3. 支持 HIGHLIGHT_ELEMENT、ANNOTATE_ELEMENT

### 移动考虑
1. OrbitControls 触控启用
2. 低多边形
3. 控件放底部

只返回 HTML 文档。
"""
