# 小麦线框图目录指南

## 核心原则

- 线框图按路由模块组织，不按零散功能点组织。
- 一个主路由对应一个主线框文件。
- 同一路由内的展开态、空态、局部面板、结果切片，应放回同一个页面文件中表达。
- 非路由交互，如认证弹窗、资料初始化、Toast、错误页，统一收口到非路由目录。
- 旧的“同一路由拆分页”稿只保留在归档目录，不再作为主交付结构。

## 当前目录结构

```text
03-线框图/
├── README.md
├── 线框图设计指导文档.md
├── 01-首页与入口/
│   ├── 01-home.html
│   └── assets/
├── 02-课堂模块/
│   ├── 01-input.html
│   ├── 02-generating.html
│   ├── 03-classroom.html
│   └── assets/
├── 03-视频模块/
│   ├── 01-input.html
│   ├── 02-generating.html
│   ├── 03-video-result.html
│   ├── assets/
│   └── assets-result/
├── 04-知识问答模块/
│   └── 01-knowledge.html
├── 05-课后小测模块/
│   └── 01-quiz-session.html
├── 06-学习路径模块/
│   └── 01-path.html
├── 07-个人中心模块/
│   ├── 01-profile.html
│   ├── 02-history.html
│   ├── 03-favorites.html
│   ├── 04-settings.html
│   └── assets/
├── 08-非路由交互与通用状态/
│   ├── 01-auth-dialog.html
│   ├── 02-task-progress-shell.html
│   ├── 03-teacher-style-panel.html
│   ├── 04-profile-setup-dialog.html
│   ├── loading.html
│   ├── error-404.html
│   ├── error-500.html
│   ├── error-network.html
│   ├── empty-state.html
│   ├── confirm-dialog.html
│   ├── toast.html
│   ├── assets/
│   └── assets-auth/
└── 99-archive/
    ├── video-continue-ask.html
    ├── knowledge-sources.html
    ├── quiz-start.html
    ├── quiz-result.html
    ├── quiz-complete.html
    ├── path-goal.html
    └── path-generating.html
```

## 路由与线框文件映射

| 路由 | 主线框文件 | 说明 |
|------|------------|------|
| `/` | `01-首页与入口/01-home.html` | 首页与双入口 |
| `/classroom/input` | `02-课堂模块/01-input.html` | 主题输入页，内含老师风格面板展开态 |
| `/classroom/:id/generating` | `02-课堂模块/02-generating.html` | 课堂生成进度页 |
| `/classroom/:id` | `02-课堂模块/03-classroom.html` | 课堂主页面 |
| `/video/input` | `03-视频模块/01-input.html` | 题目输入页，内含文本/图片/OCR/老师风格态 |
| `/video/:id/generating` | `03-视频模块/02-generating.html` | 视频生成进度页 |
| `/video/:id` | `03-视频模块/03-video-result.html` | 视频结果页，内含继续追问等局部状态 |
| `/knowledge` | `04-知识问答模块/01-knowledge.html` | 知识问答主页面 |
| `/quiz/:sessionId` | `05-课后小测模块/01-quiz-session.html` | 小测验主页面，内含开始/答题/结果/完成态 |
| `/path` | `06-学习路径模块/01-path.html` | 学习路径主页面，内含目标输入/生成中/结果态 |
| `/profile` | `07-个人中心模块/01-profile.html` | 个人中心首页 |
| `/history` | `07-个人中心模块/02-history.html` | 历史记录页 |
| `/favorites` | `07-个人中心模块/03-favorites.html` | 收藏管理页 |
| `/settings` | `07-个人中心模块/04-settings.html` | 设置页 |

## 非路由说明

- `08-非路由交互与通用状态/01-auth-dialog.html` 是认证弹窗，不代表独立登录路由。
- `08-非路由交互与通用状态/02-task-progress-shell.html` 是视频/课堂共享等待体验壳层，不代表独立任务路由。
- `08-非路由交互与通用状态/03-teacher-style-panel.html` 是视频/课堂共享老师风格面板，不代表独立风格路由。
- `08-非路由交互与通用状态/04-profile-setup-dialog.html` 是资料初始化弹层或引导态，不代表独立主流程页。
- `loading`、`error-*`、`empty-state`、`confirm-dialog`、`toast` 统一作为跨模块状态资产维护。

## 老师风格选择器说明

- 老师风格选择器是输入页内部的会话配置入口，不是独立流程页。
- 入口位于核心输入框附近，通过头像或胶囊触发器展开。
- MVP 默认提供 4 种老师风格，但结构必须支持未来扩展。
- 相关展开态必须画在 `02-课堂模块/01-input.html` 或 `03-视频模块/01-input.html` 内，不应再拆出独立 `style` 页面。

## 归档说明

- `99-archive/` 仅保留历史探索稿。
- 这些旧稿不再代表正式模块边界，也不应再作为新增线框的命名参考。

## 页面优先级

### P0

- `01-首页与入口/01-home.html`
- `02-课堂模块/01-input.html`
- `02-课堂模块/02-generating.html`
- `02-课堂模块/03-classroom.html`
- `03-视频模块/01-input.html`
- `03-视频模块/02-generating.html`
- `03-视频模块/03-video-result.html`
- `08-非路由交互与通用状态/02-task-progress-shell.html`
- `08-非路由交互与通用状态/03-teacher-style-panel.html`
- `08-非路由交互与通用状态/01-auth-dialog.html`
- `08-非路由交互与通用状态/loading.html`
- `08-非路由交互与通用状态/error-404.html`

### P1

- `05-课后小测模块/01-quiz-session.html`
- `07-个人中心模块/01-profile.html`
- `07-个人中心模块/02-history.html`
- `04-知识问答模块/01-knowledge.html`
- `08-非路由交互与通用状态/04-profile-setup-dialog.html`

### P2

- `06-学习路径模块/01-path.html`
- `07-个人中心模块/03-favorites.html`
- `07-个人中心模块/04-settings.html`
- `08-非路由交互与通用状态/empty-state.html`
- `08-非路由交互与通用状态/toast.html`

## 使用建议

1. 先判断需求落在哪个正式路由，再决定线框文件归属。
2. 如果只是同一路由里的面板、模态、展开区、空态，不要新建主线框文件。
3. 如果只是为了说明历史探索或局部状态，请放入 `99-archive/`，不要混入正式模块。
