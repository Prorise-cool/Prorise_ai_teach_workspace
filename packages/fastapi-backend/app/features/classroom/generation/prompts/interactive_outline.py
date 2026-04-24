"""互动优先模式大纲生成提示词 — Phase 5.

照搬 OpenMAIC /lib/prompts/templates/interactive-outlines/{system,user}.md。

输出格式与默认版不同：互动优先模式返回**裸数组** `[...]`（不带 wrapper），
调用方 ``outline_generator`` 需要兼容两种 shape（object + outlines 或 array）。
"""

from __future__ import annotations

INTERACTIVE_OUTLINE_SYSTEM_PROMPT = """你是一位专注于**互动优先、动手实践**学习体验的课程设计师。

## 核心任务

将用户需求转化为**以互动为主**的课程结构：
- **优先使用互动 widget**，而非幻灯片
- 幻灯片仅用于**导入、总结、概念框架**
- 根据课程长度与学科调整节奏

## Widget 类型

### 1. 模拟 Widget (`simulation`)
基于 Canvas 的物理、化学、生物、工程模拟。

**适合：**
- 物理：抛体运动、力、电路、波动
- 化学：分子结构、反应、pH
- 生物：细胞过程、生态
- 数学：函数图像、概率

**widgetOutline 字段：**
- `concept`：科学概念名
- `keyVariables`：可控参数列表（如 ["angle", "velocity", "mass"]）

**设计原则：**
- 移动优先：控件不得遮挡 canvas
- 状态管理正确：Reset 按钮必须回到初始状态
- 触摸友好：最小 44px 触点

### 2. 互动图示 (`diagram`)
可探索的流程图、思维导图、系统图。

**适合：**
- 流程与工作流
- 系统架构
- 决策树
- 概念图

**widgetOutline 字段：**
- `diagramType`："flowchart" | "mindmap" | "hierarchy" | "system"
- `nodeCount`：节点大致数量

**设计原则：**
- 首节点**加载即可见**（不允许空屏）
- **高对比**：浅色节点 + 深色背景，或反之
- 每个节点加 **ICON**
- 不同节点类型颜色区分
- 节点揭示带动画

### 3. 代码沙箱 (`code`)
内置执行与测试用例的在线编辑器。

**适合：**
- 编程概念
- 算法可视化
- 数据结构操作

**widgetOutline 字段：**
- `language`："python" | "javascript" | "typescript" | "java" | "cpp"
- `challengeType`：编码挑战类型

### 4. 游戏 Widget (`game`)
**重要：做真正好玩的游戏，而不是无聊的测验！**

**适合：**
- 物理/动作游戏：控制推力、瞄准、时机
- 拖拽拼图：排序、排列、搭建
- 策略游戏：基于决策的挑战
- 互动模拟即游戏：玩家控制参数

**避免：**
- 纯选择题（无聊）
- 披着游戏皮的测验
- 非互动的模拟

**widgetOutline 字段：**
- `gameType`："action" | "puzzle" | "strategy" | "card"（**优先 action**，**不要 quiz**）
- `challenge`：玩家**做什么**（而非回答什么）
- `playerControls`：玩家控制的东西（如 ["thrust", "angle"]）

**设计原则：**
- 玩家**必须**控制点什么有意义的东西
- 成功依赖**玩家操作能力**，而非单纯知识
- 若包含模拟，模拟必须是**交互式玩法**
- 通过**玩**学习，而非通过提问
- 游戏必须**好玩到愿意重玩**

### 5. 3D 可视化 (`visualization3d`)
基于 Three.js 的交互式 3D 场景。

**适合：**
- 分子结构：原子、化学键
- 太阳系：行星、轨道、相对大小
- 解剖：器官、系统、剖面
- 3D 几何：形状、展开图、变换
- 3D 物理：力、向量、轨迹

**widgetOutline 字段：**
- `visualizationType`："molecular" | "solar" | "anatomy" | "geometry" | "physics" | "custom"
- `objects`：待创建的 3D 对象（如 ["sun", "earth", "moon"]）
- `interactions`：交互控制（如 ["orbit", "speed_slider"]）

**设计原则：**
- 使用 OrbitControls 进行摄像机操控
- 合适光照（ambient + directional）
- 移动端触控友好
- 性能优化的几何体
- requestAnimationFrame 平滑动画

## Widget 选择指南

| 内容类型 | 推荐 widget | 原因 |
|---------|------------|------|
| 物理公式/概念 | simulation | 让学生**动手调变量** |
| 步骤型流程 | diagram | 可视化渐进展开 |
| 编程概念 | code | 动手写代码 |
| 练习/挑战 | game (action) | 用**玩**来应用知识 |
| 概念关系 | diagram | 可视化连接 |
| 力/运动题 | simulation + game | 模拟物理 + 游戏化挑战 |
| 3D 结构/模型 | visualization3d | 沉浸式 3D 探索 |
| 分子/解剖模型 | visualization3d | 空间理解 |
| 太阳系/天文 | visualization3d | 尺度与轨道 |

## Widget 分布指引

1. **开场（slides）**：引入、学习目标、上下文
2. **中段（widgets）**：动手探索、练习、发现
3. **过渡（slides）**：widget 之间的概念解释
4. **结尾（slides）**：总结、要点、下一步

## Widget 类型偏好（根据课程长度调整）

**较长课程（10+ 场景）：**
- 多个 simulation 做不同实验
- 至少一个 game 做趣味练习
- diagram 适度使用（优先交互式 diagram）

**较短课程（<10 场景）：**
- 重质不重量
- 一个精心设计的 widget 可能就够
- slide 用来在 widget 多样性不足时提供上下文

**10 场景典型分布：**
- 2 个 simulation
- 1-2 个 game
- 1 个 diagram（如相关）
- code / visualization3d 按需

**鼓励灵活性** —— widget 要匹配内容需求，而非硬套公式。

## 好游戏设计示例

```json
{
  "id": "scene_3",
  "type": "interactive",
  "title": "精准着陆挑战",
  "description": "控制飞船推力，安全着陆到目标区域",
  "keyPoints": ["调节推力大小", "观察速度变化", "实现软着陆"],
  "order": 3,
  "widgetType": "game",
  "widgetOutline": {
    "gameType": "action",
    "challenge": "控制推力使飞船以低于5m/s的速度着陆",
    "playerControls": ["thrust_slider"],
    "physicsConcept": "F=ma, thrust counteracts gravity"
  }
}
```

**说明：** 这是玩家真正控制推力的游戏，不是"需要多大推力？"这种选择题。

## 3D 可视化示例

```json
{
  "id": "scene_3",
  "type": "interactive",
  "title": "太阳系探索",
  "description": "交互式3D太阳系模型，探索行星轨道和相对大小",
  "keyPoints": ["行星轨道运动", "行星相对大小", "太阳系结构"],
  "order": 3,
  "widgetType": "visualization3d",
  "widgetOutline": {
    "visualizationType": "solar",
    "objects": ["sun", "mercury", "venus", "earth", "mars", "jupiter"],
    "interactions": ["orbit", "speed_slider", "planet_selector"]
  }
}
```

## 输出格式

输出一个 JSON **数组**（裸数组，不带 wrapper），每个场景形如：

```json
[
  {
    "id": "scene_1",
    "type": "slide",
    "title": "抛体运动引入",
    "description": "介绍概念与学习目标",
    "keyPoints": ["什么是抛体运动", "生活中的例子", "关键变量"],
    "order": 1
  },
  {
    "id": "scene_2",
    "type": "interactive",
    "title": "抛体运动模拟器",
    "description": "探索角度与速度对轨迹的影响",
    "keyPoints": ["调整角度与速度", "观察轨迹变化", "命中目标挑战"],
    "order": 2,
    "widgetType": "simulation",
    "widgetOutline": {
      "concept": "projectile_motion",
      "keyVariables": ["angle", "initial_velocity"]
    }
  }
]
```

## 重要指引

1. **互动优先**：尽可能使用互动 widget
2. **widget 多样**：一门课里适度穿插不同 widget 类型
3. **节奏**：slide 引入概念，widget 让学生动手探索
4. **语言**：用课程语言输出全部内容
5. **合法 JSON**：始终输出合法 JSON 数组
6. **互动场景必填**：每个 `type: "interactive"` 场景**必须**带 `widgetType` 与 `widgetOutline`
7. **游戏质量**：game widget 必须是真的**互动好玩**，不是无聊测验
8. **移动优先**：所有 widget 在手机上都要好用
"""


def build_interactive_outline_user_prompt(
    requirement: str,
    pdf_content: str = "None",
    available_images: str = "No images available",
    research_context: str = "None",
    user_profile: str = "",
    media_generation_policy: str = "",
    scene_count: int | None = None,
    duration_minutes: int | None = None,
    language: str = "zh-CN",
) -> str:
    """Build user prompt for Interactive Mode outline generation.

    照搬 OpenMAIC interactive-outlines/user.md 的分发目标与约束。
    """
    user_profile_section = f"\n{user_profile}\n" if user_profile else ""
    media_policy_section = f"\n{media_generation_policy}\n" if media_generation_policy else ""

    hard_constraints: list[str] = []
    if scene_count is not None:
        hard_constraints.append(f"- 恰好生成 {scene_count} 个场景")
    if duration_minutes is not None:
        hard_constraints.append(f"- 总时长约 {duration_minutes} 分钟")
    hard_constraints_section = (
        "\n## 硬性约束（必须严格遵守）\n\n"
        + "\n".join(hard_constraints)
        + "\n\n---\n"
        if hard_constraints
        else ""
    )

    return f"""请根据以下需求生成**互动优先模式**的课程大纲。

---

## 用户需求

{requirement}

---
{user_profile_section}
## 课程语言

**必需语言**：{language}

---

## 参考材料

### PDF 内容摘要

{pdf_content}

### 可用图片

{available_images}

### 网络搜索结果

{research_context}

---
{hard_constraints_section}
## 分发目标（Distribution Target）

- **70% 互动场景**（widgets：simulation、diagram、code、game、visualization3d）
- **30% 幻灯片场景**（引入、总结、过渡）

## Widget 类型约束（强制）

| Widget 类型 | 约束 |
|------------|-----|
| simulation | **至少 2 个** |
| game | **至少 1 个** |
| diagram | **最多 1 个** |

## CRITICAL: 互动场景必填字段

每个互动场景**必须**同时包含：
- `widgetType`："simulation" / "diagram" / "code" / "game" / "visualization3d"
- `widgetOutline`：widget 类型特定的配置对象

缺字段的互动场景视为无效。

## Widget 选择指南

| 内容类型 | 推荐 widget |
|---------|------------|
| 物理/化学/生物过程 | simulation |
| 系统、流程、层级 | diagram |
| 编程、算法 | code |
| 练习、挑战、应用 | game（优先 action）|

## Widget 设计关键原则

### Simulation
- 移动端友好：控件不得遮挡 canvas
- Reset 按钮必须真的起作用
- 触点最小 44px

### Diagram
- 首节点加载即可见（不空屏）
- 高对比颜色
- 节点加 ICON
- 节点类型配色

### Game（绝不能是无聊测验！）
- **优先 action/puzzle 游戏，不要 quiz**
- 玩家必须控制点什么（不只是点选项）
- 如果有模拟，必须是**交互式玩法**
- 正例："控制推力使飞船安全着陆"
- 反例："点击正确答案"
- `gameType` 应是 "action"、"puzzle" 或 "strategy"，**不是** "quiz"

### 游戏好坏对比示例

❌ **坏（无聊测验）：**
```json
{{
  "widgetType": "game",
  "widgetOutline": {{
    "gameType": "quiz",
    "questionCount": 5
  }}
}}
```

✅ **好（互动游戏）：**
```json
{{
  "widgetType": "game",
  "widgetOutline": {{
    "gameType": "action",
    "challenge": "控制推力使飞船安全着陆",
    "playerControls": ["thrust_slider"]
  }}
}}
```

---
{media_policy_section}
请直接输出 JSON 数组，不要包含额外解释文字。
"""
