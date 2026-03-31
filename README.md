# Prorise AI Teach Workspace

AI 教学视频智能体 - 基于多 Agent 协作的自动化教学视频生成平台。

## 项目结构

```text
Prorise_ai_teach_workspace/
├── AGENTS.md                   # 工作约定与目录职责
├── ARCHITECTURE.md            # 架构导航入口
├── INDEX.md                   # 仓库全局索引
├── _bmad/                     # BMAD 开发流程系统
├── _bmad-output/              # 唯一事实来源
├── docs/                      # 开发手册与协作文档
│   └── 01开发人员手册/        # 开发总结文档落点
├── packages/                  # 主代码工作区
│   ├── student-web/           # React 19 学生端前端
│   ├── fastapi-backend/       # FastAPI + LangGraph 后端
│   ├── RuoYi-Vue-Plus-5.X/    # Java 管理后台后端基座
│   └── ruoyi-plus-soybean/    # Vue 管理端前端基座
├── references/                # 参考项目（默认只读）
│   ├── OpenMAIC/              # 多智能体互动课堂参考
│   └── manim-to-video-claw/   # Manim 视频生成流水线参考
├── package.json               # 单仓根配置
├── pnpm-workspace.yaml        # pnpm workspaces 配置
└── .gitignore                 # Git 忽略规则
```

## 入口导航

- 全局索引：[`INDEX.md`](./INDEX.md)
- 事实来源：[`_bmad-output/INDEX.md`](./_bmad-output/INDEX.md)
- 开发手册入口：[`docs/01开发人员手册/0000-AI快速导航索引.md`](./docs/01开发人员手册/0000-AI快速导航索引.md)
- 主代码工作区：[`packages/INDEX.md`](./packages/INDEX.md)
- 参考项目索引：[`references/INDEX.md`](./references/INDEX.md)

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 19 + Vite + TypeScript | Monorepo 架构 |
| **后端** | FastAPI + LangGraph | Python 多 Agent |
| **管理后台** | Java Spring Boot (RuoYi) | ToB 预留 |
| **动画引擎** | Manim | 3Blue1Brow 风格 |
| **云平台** | 腾讯云 | 赛事要求 |

## 快速开始

### 前置要求

- Node.js 20.19+
- pnpm 10.5+
- Python 3.11+
- JDK 17
- Maven 3.9+

### 安装

```bash
# 安装根依赖
pnpm install

# 创建 FastAPI 本地虚拟环境并安装最小依赖
pnpm setup:fastapi-backend
```

### 开发

```bash
# 启动学生端
pnpm dev:student-web

# 启动 FastAPI 框架骨架
pnpm dev:fastapi-backend

# 启动管理端
pnpm dev:admin-web

# 独立构建指定应用，便于后续分别部署
pnpm build:student-web
pnpm build:admin-web
```

### RuoYi 参考后端

```bash
cd packages/RuoYi-Vue-Plus-5.X
mvn -pl ruoyi-admin -am spring-boot:run -Dspring-boot.run.profiles=dev
```

### 最小启动边界

- `packages/student-web/`：学生端前台。当前已具备首页骨架、认证契约 seam、mock / real adapter 与测试链；正式业务页面仍待后续 Epic 继续交付。
- `packages/fastapi-backend/`：AI 功能服务宿主。当前除 `core / infra / providers / features / shared` 分层外，已经落地统一任务恢复、Provider failover、长期承接 API 与 `video / classroom / companion / knowledge / learning` 路由及测试面。
- `packages/RuoYi-Vue-Plus-5.X/`：认证、RBAC 与长期业务数据宿主。
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-modules/ruoyi-xiaomai/`：小麦业务模块实际 Java 落点，当前已接入聚合构建链并承接 Epic 10 的模块边界与权限基线。
- `packages/RuoYi-Vue-Plus-5.X/ruoyi-xiaomai/`：历史预留目录，当前仅保留边界说明，不作为正式业务代码目录。
- `references/`：只读参考来源，不作为业务代码落点。

### 启动顺序建议

1. 启动 `MySQL`、`Redis` 与一个 `RuoYi` 实例。
2. 启动 `FastAPI` 框架骨架，确认 `http://localhost:8090/health` 返回 `ok`。
3. 启动 `student-web`，确认前端能读取 `.env` 并完成模板加载。

更多细节见 [`docs/01开发人员手册/005-环境搭建/0005-Epic0-最小启动说明.md`](./docs/01开发人员手册/005-环境搭建/0005-Epic0-最小启动说明.md)。

## 赛事信息

- **赛事**: 教育智能体应用创新赛（高职组）
- **截止**: 2026/4/25
- **平台**: 腾讯云智能体开发平台

## 许可证

本项目采用 Unlicense 许可证 - 查看 [LICENSE](LICENSE) 了解详情。
