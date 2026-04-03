# 小麦 — AI 教学视频智能体

**中国首个 AIGC 原生虚拟教室** — 多模态认知智能体驱动的沉浸式个性化教学空间，面向高职教育场景重新定义数字化教育范式。

> 珠海城市职业技术学院 · 教育智能体应用创新赛（高职组）

---

## 项目简介

小麦是一款面向中国高职教育场景的 AIGC 原生教学平台。通过多 Agent 协作架构，将传统需要 10+ 小时制作的高质量教学视频压缩至 **5 分钟**内自动生成，并配备 Manim 程序化动画、多风格 AI 老师、会话伴学与学习教练，为学生提供"提问—理解—练习—记录"的连续学习闭环。

### 解决的核心痛点

| 痛点 | 小麦的解法 |
|------|-----------|
| 高职教育"三高三难"（高投入/高难度/高风险，难实施/难观摩/难再现） | 分钟级生成高质量教学视频，教师零动画制作经验即可使用 |
| 传统教学视频制作耗时长（10+ 小时/条） | AI 全链路自动生成：题目理解 → 分镜 → Manim 动画 → TTS 配音 → 视频合成 |
| "一刀切"教学无法因材施教 | 多风格智能体体系（严肃/幽默/耐心/高效），适应不同学习偏好 |
| 学生课后缺乏即时答疑 | Companion 会话伴学 + Evidence 证据检索 + Learning Coach 学习教练 |

---

## 核心能力

小麦当前提供五类核心能力层：

### A. 双内容引擎（独立）

- **Video Engine** — 输入题目文本或图片，分钟级生成带 Manim 动画的单题讲解视频
- **Classroom Engine** — 输入主题，生成完整课堂内容（幻灯片 + 讨论 + 白板讲解）

### B. 会话伴学 Companion（共享）

围绕当前学习上下文进行即时追问与解释，绑定视频时间点或课堂步骤，支持侧边答疑与白板联动。

### C. Evidence / Retrieval（后台，可插拔）

面向教材、讲义、术语与上传文档建立可检索、可引用的证据层，为 Companion 和 Learning Coach 提供来源引用。

### D. 学习教练 Learning Coach（独立）

课后 checkpoint / quiz、错题解析、推荐与学习路径规划，以"学后巩固"为目标。

### E. 结果回看与数据闭环

历史记录、收藏管理、会话问答回写、学习信号沉淀，通过学习中心聚合展示。

---

## 系统架构

采用 **"RuoYi 负责业务持久化与管理后台，FastAPI 负责功能执行与 AI 编排"** 的双后端分层架构。

```
┌─────────────────────────────────────────────────────────────┐
│                         用户角色                              │
│              高职学生    ·    高职教师    ·    管理员           │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 统一入口                              │
│            (反向代理 + 静态资源 + 路由分发)                      │
└──────────┬────────────────┬─────────────────┬───────────────┘
           ▼                ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐
  │ React 19 SPA │  │ FastAPI 8090 │  │ RuoYi 8080    │
  │ (学生端前端)   │  │ (AI 功能服务) │  │ (管理/持久化)  │
  └──────────────┘  └──────┬───────┘  └───────┬───────┘
                           │                   │
                    ┌──────┴──────┐      ┌─────┴──────┐
                    │ Async Worker│      │  MySQL +   │
                    │(Manim/FFmpeg)│      │  Redis     │
                    └─────────────┘      └────────────┘
                           │
                    ┌──────┴──────────────────────┐
                    │     外部 AI 能力层             │
                    │  LLM · TTS · Evidence 检索    │
                    └──────────────────────────────┘
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 19 + Vite + TypeScript + Tailwind CSS 4 | 学生端 SPA |
| **管理端** | Vue 3 + SoyBean Admin | 基于 RuoYi-Plus-SoyBean |
| **AI 后端** | FastAPI + LangGraph + Python 3.11+ | 多 Agent 编排、SSE、异步任务 |
| **管理后端** | Java Spring Boot (RuoYi-Vue-Plus 5.X) | RBAC、业务数据持久化、审计 |
| **动画引擎** | Manim | 3Blue1Brown 风格数学动画 |
| **云平台** | 腾讯云 | COS 对象存储、智能体平台 |
| **Monorepo** | pnpm workspaces | 统一包管理与构建 |

---

## 项目结构

```
Prorise_ai_teach_workspace/
├── packages/                        # 主代码工作区
│   ├── student-web/                 # React 19 学生端前端
│   ├── fastapi-backend/             # FastAPI + LangGraph AI 功能服务
│   ├── RuoYi-Vue-Plus-5.X/         # Java Spring Boot 管理后端
│   └── ruoyi-plus-soybean/          # Vue 管理端前端
├── docs/                            # 开发手册与协作文档
│   ├── 01开发人员手册/               # 开发总结文档落点
│   └── 03UI:UX设计素材/             # 设计稿与成品图
├── _bmad-output/                    # BMAD 规划产物（唯一事实来源）
│   └── planning-artifacts/          # PRD · 架构 · Epic · UX 规范
├── references/                      # 参考项目（只读）
│   ├── OpenMAIC/                    # 多智能体互动课堂参考
│   └── manim-to-video-claw/         # Manim 视频生成流水线参考
├── package.json                     # Monorepo 根配置
├── pnpm-workspace.yaml              # pnpm workspaces 声明
└── .github/                         # CI/CD · Issue/PR 模板 · Dependabot
```

---

## 快速开始

### 前置要求

- Node.js 20.19+
- pnpm 10.5+
- Python 3.11+
- JDK 17 + Maven 3.9+
- MySQL 8.0 + Redis 7+

### 安装

```bash
# 安装前端依赖
pnpm install

# 创建 FastAPI 虚拟环境并安装依赖
pnpm setup:fastapi-backend
```

### 开发

```bash
# 启动学生端前端
pnpm dev:student-web

# 启动 FastAPI AI 功能服务
pnpm dev:fastapi-backend

# 启动管理端前端
pnpm dev:admin-web

# 启动 RuoYi 管理后端
cd packages/RuoYi-Vue-Plus-5.X
mvn -pl ruoyi-admin -am spring-boot:run -Dspring-boot.run.profiles=dev
```

### 启动顺序

1. 启动 MySQL 和 Redis
2. 启动 RuoYi 管理后端（`:8080`）
3. 启动 FastAPI 功能服务（`:8090`），确认 `/health` 返回 `ok`
4. 启动学生端前端，确认可读取 `.env` 配置

> 详细环境搭建指南见 [`docs/01开发人员手册/005-环境搭建/`](./docs/01开发人员手册/0000-AI快速导航索引.md)

---

## 交付里程碑

| Epic | 内容 | 状态 |
|------|------|------|
| **Epic 0** | 工程底座与并行开发轨道 | 已完成 |
| **Epic 1** | 用户接入、统一入口与启动配置 | 已完成 |
| **Epic 2** | 统一任务框架、SSE 与 Provider 基础设施 | 已完成 |
| **Epic 3** | 单题视频输入与任务创建 | 进行中 |
| **Epic 4** | 单题视频生成、结果消费与失败恢复 | 进行中 |
| **Epic 5** | 主题课堂学习闭环 | 进行中 |
| **Epic 6** | 会话内伴学与当前时刻解释 | 待启动 |
| **Epic 7** | 资料依据、来源回看与证据深挖 | 待启动 |
| **Epic 8** | 学后巩固、测验与学习路径 | 待启动 |
| **Epic 9** | 学习中心聚合与个人管理 | 待启动 |
| **Epic 10** | RuoYi 持久化承接与业务表 | 已完成 |

---

## 赛事信息

- **赛事**：教育智能体应用创新赛（高职组）
- **平台**：腾讯云智能体开发平台
- **截止**：2026 年 4 月 25 日

---

## 导航索引

| 文档 | 说明 |
|------|------|
| [`INDEX.md`](./INDEX.md) | 仓库全局索引 |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 架构导航入口 |
| [`AGENTS.md`](./AGENTS.md) | 工作约定与目录职责 |
| [`_bmad-output/planning-artifacts/index.md`](./_bmad-output/planning-artifacts/index.md) | 规划产物索引（PRD · 架构 · Epic · UX） |
| [`docs/01开发人员手册/0000-AI快速导航索引.md`](./docs/01开发人员手册/0000-AI快速导航索引.md) | 开发手册快速导航 |
| [`packages/INDEX.md`](./packages/INDEX.md) | 代码包索引 |

---

## 许可证

**本项目为闭源项目，保留所有权利。** 未经授权不得复制、修改、分发或使用本仓库中的任何内容。
