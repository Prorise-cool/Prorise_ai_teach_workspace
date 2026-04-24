"""Game widget HTML 生成提示词。

照搬 OpenMAIC ``game-content/{system,user}.md``，中文化，保留"不是无聊测验"
这条 OpenMAIC 最强调的设计原则。
"""
from __future__ import annotations

from typing import Any

from ._postmessage import POSTMESSAGE_LISTENER_SNIPPET

GAME_SYSTEM_PROMPT = f"""# 教育游戏 Widget 生成器

生成一份**好玩、互动、教育性强**的自包含 HTML 游戏。

## 核心原则：游戏，不是测验

**关键：避免无聊选择题！** 学生考试已经够多了。游戏应做到：
- **互动**：玩家要**做点什么**，不只是点答案
- **技能驱动**：成功依赖玩家操作，不只是知识
- **好玩**：让学生想多玩几次
- **模拟即玩法**：若有可视化，必须是玩法的一部分

## 推荐游戏类型

### 1. 物理/动作游戏（强烈推荐）
- 时机：在对的瞬间点击命中目标
- 瞄准发射：调整角度/力度命中目标
- 平衡：保持物体平衡
- 接/避：接落下物体或避障

### 2. 拖拽拼图
- 分类、排序、搭建

### 3. 互动模拟即游戏
- 玩家调整参数看结果
- 挑战："安全着陆"— 玩家控制推力

### 4. 卡牌/配对

### 5. 策略/决策

## 不得已用测验时
- 让它**互动**（拖到目标，而不是点单选按钮）
- 加**物理/动作**成分（答对解锁下一段玩法）
- 用**视觉问题**（识别图示，而非文字）
- 题少且短（最多 3-5 题）

## Widget 配置 Schema

```json
{{
  "type": "game",
  "gameType": "action",
  "description": "...",
  "gameConfig": {{
    "controls": ["thrust_slider", "angle_adjuster"],
    "initialConditions": {{
      "mass": 1000, "gravity": 9.8, "altitude": 500
    }},
    "successCondition": "landingVelocity < 5"
  }},
  "scoring": {{ "completionPoints": 50 }}
}}
```

## 公平起点（CRITICAL）

**游戏开始时玩家绝不能立即失败！**

1. 前 3-5 秒是**宽限期**，失败条件不生效
2. 默认参数下玩家至少能存活 10 秒
3. 起始位置远离危险区
4. 初速度合理，不能一开始就崩

## 技术要求（强制）

### 1. Start 按钮用 inline onclick（不是 addEventListener）

```html
<!-- 正确 -->
<button onclick="startGame()">开始游戏</button>
```

### 2. 自定义 CSS 优于 Tailwind CDN
- 避免 `@layer utilities` 块（CDN 下可能不编译）
- 可以在元素上用基础 Tailwind class（如 `flex`, `text-center`）

### 3. 脚本位置：DOMContentLoaded 包裹或放 body 末尾

### 4. onclick 调用的函数必须全局可达

```javascript
function startGame() {{ ... }}  // 全局作用域
```

### 5. 初始化流程简单直接 —— 不要 chain 多个 async

## 布局与定位

```javascript
// 避开 UI 遮挡
const TOP_MARGIN = 100;
const BOTTOM_MARGIN = 250;
const playableHeight = canvas.height - TOP_MARGIN - BOTTOM_MARGIN;
const objectY = groundY - BOTTOM_MARGIN - (altitude / maxHeight) * playableHeight;
```

- 控件不超过屏高 30%
- 主游戏对象始终可见

{POSTMESSAGE_LISTENER_SNIPPET}

## 质量检查

- [ ] 游戏是**互动**的，不是测验
- [ ] 玩家控制点**有意义**的东西
- [ ] 成功靠玩家**技能**
- [ ] 前 3-5 秒不能失败
- [ ] 默认参数下可生存
- [ ] 即时视觉反馈
- [ ] 是否好玩到想重玩
- [ ] 触控友好
- [ ] 开头清晰指引
- [ ] 只有**一份** `<!DOCTYPE html>`
- [ ] Inline onclick 而非 addEventListener
"""


def build_game_user_prompt(
    title: str,
    description: str,
    key_points: list[str],
    widget_outline: dict[str, Any],
    language: str = "zh-CN",
) -> str:
    game_type = widget_outline.get("gameType", "action")
    challenge = widget_outline.get("challenge", description)
    kp = "\n".join(f"- {p}" for p in (key_points or []))
    return f"""为以下主题生成教育游戏：{title}

## 游戏类型

{game_type}

## 挑战描述

{challenge}

## 关键点

{kp}

## 语言

{language}

---

生成一份好玩、互动的 HTML 游戏，要求：

### 游戏设计（关键 —— 不是测验！）
1. **互动玩法**：玩家**必须**控制有意义的东西（不是点答案）
2. **真实机制**：时机、瞄准、拖拽、平衡、接、搭
3. **技能驱动**：成功靠操作，不靠背答案
4. **反馈吸引**：动画、音效、视觉特效

### 偏好游戏类型（按优先级）
1. **物理/动作**：控参数达目标
2. **时机/瞄准**：点击时机或调瞄准
3. **拖拽**：排序、排列、搭建
4. **模拟游戏**：让玩家探索变量找解
5. **卡牌/配对**
6. **测验**：仅最后手段，做得视觉有趣

### 技术（强制）
1. Start 按钮用 inline onclick
2. 自定义 CSS，避开 Tailwind `@layer utilities`
3. DOMContentLoaded 包裹或放 body 末尾
4. 全局 start 函数
5. 内嵌 `<script type="application/json" id="widget-config">`
6. `requestAnimationFrame`
7. 触控友好（44px 最小触点）
8. localStorage 存进度
9. 可暂停

### 输出
只返回 HTML 文档。**让它好玩到愿意重玩！**
"""
