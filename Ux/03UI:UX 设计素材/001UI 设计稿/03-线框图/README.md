# 小麦线框图目录指南

> **版本**：v3.3  
> **更新日期**：2026-03-28  
> **架构口径**：`Video Engine` + `Classroom Engine` + `Companion` + `Retrieval / Evidence Service` + `Learning Coach`

## 1. 核心边界

- `Video Engine` 与 `Classroom Engine` 是两个独立内容引擎，只共享任务语义，不融合生成链路。
- `Companion` 是会话内嵌能力，服务“当前这一步 / 这一秒”的解释与追问，不是独立主路由。
- 学生端不再保留独立 `Knowledge` 页面；资料证据能力只作为视频结果页、课堂结果页与学习中心中的来源抽屉 / 证据面板出现。
- `Learning Coach` 是会话后学习闭环，承接 `checkpoint / quiz / path / recommendation / wrongbook`。
- 课堂主叙事保持沉浸，不把正式 quiz 硬插进讲解流程。

## 2. 目录结构

`04-成品图/01-正式路由页面/` 必须与下列页面目录结构保持同构。

```text
03-线框图/
├─ 01-正式路由页面
│  ├─ 01-首页与入口
│  │  ├─ assets
│  │  ├─ 01-landingPage.html
│  │  └─ 02-home.html
│  ├─ 02-认证页
│  │  ├─ 01-login.html
│  │  └─ 02-profile-setup-dialog.html
│  ├─ 03-视频输入页
│  │  ├─ assets
│  │  ├─ 01-input.html
│  ├─ 04-视频等待页
│  │  └─ 01-generating.html
│  ├─ 05-视频结果页
│  │  ├─ assets-result
│  │  └─ 01-video-result.html
│  ├─ 06-课堂输入页
│  │  ├─ assets
│  │  ├─ 01-input.html
│  ├─ 07-课堂等待页
│  │  └─ 01-generating.html
│  ├─ 08-课堂结果页
│  │  └─ 01-classroom.html
│  ├─ 10-Checkpoint 与 Quiz 页
│  │  └─ 01-quiz-session.html
│  ├─ 11-学习路径页
│  │  └─ 01-path.html
│  ├─ 12-学习中心页
│  │  └─ 01-learning.html
│  ├─ 13-个人资料页
│  │  ├─ assets
│  │  └─ 01-profile.html
│  ├─ 14-历史记录页
│  │  └─ 01-history.html
│  ├─ 15-收藏页
│  │  └─ 01-favorites.html
│  └─ 16-设置页
│     └─ 01-settings.html
├─ 02-共享交互与通用状态
│  ├─ 01-任务等待与进度
│  │  └─ task-progress-shell.html
│  └─ 02-通用反馈状态
│     ├─ assets
│     ├─ confirm-dialog.html
│     ├─ empty-state.html
│     ├─ error-404.html
│     ├─ error-500.html
│     ├─ error-network.html
│     ├─ loading.html
│     └─ toast.html
├─ README.md
└─ 线框图设计指导文档.md
```

## 3. 路由映射

| 路由 | 主线框文件 | 角色 |
|---|---|---|
| `/` | `01-正式路由页面/01-首页与入口/02-home.html` | 首页双入口 |
| `/login` | `01-正式路由页面/02-认证页/01-login.html` | 统一认证页 |
| `/video/input` | `01-正式路由页面/03-视频输入页/01-input.html` | 视频输入 |
| `/video/:id/generating` | `01-正式路由页面/04-视频等待页/01-generating.html` | 视频等待 |
| `/video/:id` | `01-正式路由页面/05-视频结果页/01-video-result.html` | 视频结果页，内含 Companion 与来源抽屉状态 |
| `/classroom/input` | `01-正式路由页面/06-课堂输入页/01-input.html` | 课堂输入 |
| `/classroom/:id/generating` | `01-正式路由页面/07-课堂等待页/01-generating.html` | 课堂等待 |
| `/classroom/:id` | `01-正式路由页面/08-课堂结果页/01-classroom.html` | 课堂结果页，内含 Companion 与来源抽屉状态 |
| `/checkpoint/:sessionId` | `01-正式路由页面/10-Checkpoint 与 Quiz 页/01-quiz-session.html` | 轻量 checkpoint 状态 |
| `/quiz/:sessionId` | `01-正式路由页面/10-Checkpoint 与 Quiz 页/01-quiz-session.html` | 课后 quiz |
| `/path` | `01-正式路由页面/11-学习路径页/01-path.html` | 学习路径 |
| `/learning` | `01-正式路由页面/12-学习中心页/01-learning.html` | 学习中心聚合页，内含证据回看面板 |
| `/profile` | `01-正式路由页面/13-个人资料页/01-profile.html` | 个人资料 |
| `/history` | `01-正式路由页面/14-历史记录页/01-history.html` | 历史视图 |
| `/favorites` | `01-正式路由页面/15-收藏页/01-favorites.html` | 收藏视图 |
| `/settings` | `01-正式路由页面/16-设置页/01-settings.html` | 平台设置 |

## 4. P0 / P1 页面清单

### P0

- `01-正式路由页面/02-认证页/01-login.html`
- `01-正式路由页面/01-首页与入口/02-home.html`
- `01-正式路由页面/03-视频输入页/01-input.html`
- `01-正式路由页面/04-视频等待页/01-generating.html`
- `01-正式路由页面/05-视频结果页/01-video-result.html`
- `01-正式路由页面/06-课堂输入页/01-input.html`
- `01-正式路由页面/07-课堂等待页/01-generating.html`
- `01-正式路由页面/08-课堂结果页/01-classroom.html`
- `01-正式路由页面/12-学习中心页/01-learning.html`
- `02-共享交互与通用状态/01-任务等待与进度/task-progress-shell.html`
- `02-共享交互与通用状态/02-通用反馈状态/loading.html`
- `02-共享交互与通用状态/02-通用反馈状态/error-network.html`

### P1 / P2

- `01-正式路由页面/10-Checkpoint 与 Quiz 页/01-quiz-session.html`
- `01-正式路由页面/11-学习路径页/01-path.html`
- `01-正式路由页面/13-个人资料页/01-profile.html`
- `01-正式路由页面/14-历史记录页/01-history.html`
- `01-正式路由页面/15-收藏页/01-favorites.html`
- `01-正式路由页面/16-设置页/01-settings.html`
- `01-正式路由页面/02-认证页/02-profile-setup-dialog.html`

## 5. Companion / Retrieval(Evidence) / Learning Coach 规则

### Companion

- 使用场景：解释“当前视频这一秒”或“当前课堂这一步”。
- 展示位置：内嵌在 `/video/:id` 与 `/classroom/:id`，并直接画进各自主线框文件。
- 必备区域：上下文锚点、问答流、白板解释、追问建议。

### Retrieval / Evidence Service（非路由证据面板）

- 使用场景：承载“证据从哪里来、来源是否可信、解析状态如何”的查看与深挖动作。
- 展示位置：嵌入在 `/video/:id`、`/classroom/:id`、`/learning` 的来源抽屉 / 证据面板中。
- 数据来源：会话产物索引、教材/讲义导入、术语库、上传文档与外部检索库。
- 不负责：学生端会话中的主问答入口；当前秒点/步骤解释仍由 `Companion` 负责。

### Learning Coach

- 使用场景：回答“我接下来该怎么练、哪里没掌握、下一步该学什么”。
- 结果承接：`checkpoint / quiz / path / wrongbook / recommendation`。
- 进入方式：会话结束后触发或从学习中心进入，不打断主叙事。

## 6. 强制约束

- `01-正式路由页面/` 一律按页面目录归档，不按能力模块或伪组件拆目录。
- 同一页面的加载态、展开态、内嵌 Companion 态、来源抽屉态，都直接放进该页面自己的主线框文件里，不再额外拆单独 html。
- 只有等待壳层、toast、confirm、error、loading 这类共享反馈与通用状态，才允许留在共享目录。
- 课堂主叙事里只允许轻量 `checkpoint` 提示，正式 quiz 必须流转到 `/quiz/:sessionId`。
- 路由命名、目录归属、状态拆分冲突时，以本文件和 `线框图设计指导文档.md` 的新架构版本为准。
