# Prorise AI Teach Workspace

> 🎓 **AI 教学视频智能体** —— 基于多 Agent 协作的自动化教学视频生成 SaaS 平台
>
> 让任何老师在 5 分钟内把"知识点 → 解题视频"自动产出，让任何学生在浏览器里观看、回放并发起 AI 答疑。

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/)
[![Manim](https://img.shields.io/badge/Manim-0.19-FF6F00)](https://www.manim.community/)
[![pnpm](https://img.shields.io/badge/pnpm-10.5-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/Docker-24+-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

> ⚠️ **版权与许可** — 本仓库受 **商业专有许可（Proprietary License）** 保护。
> 全部源代码、文档、设计资产、提示词、数据库结构与商业逻辑均为 **Prorise AI Teach Team** 的商业秘密与受著作权法保护的作品。
> 未经书面授权，**严禁复制、修改、分发、反向工程、训练 AI 模型或用于任何商业用途**。详见 [`LICENSE`](./LICENSE)。

---

## 📑 目录

- [核心特性](#-核心特性)
- [系统架构一览](#-系统架构一览)
- [技术栈](#-技术栈)
- [业务领域](#-业务领域)
- [仓库目录树](#-仓库目录树)
- [目录详解：每一个顶层目录在做什么](#-目录详解每一个顶层目录在做什么)
- [快速本地运行](#-快速本地运行)
- [完整脚本速查](#-完整脚本速查)
- [文档导航](#-文档导航)
- [部署](#-部署)
- [团队协作与贡献](#-团队协作与贡献)
- [赛事信息](#-赛事信息)
- [版权与许可证](#-版权与许可证)

---

## 🌟 核心特性

| 能力 | 说明 |
|---|---|
| **AI 视频自动生成** | 老师输入题目/知识点 → 5 分钟内产出带语音、字幕、Manim 动画的解题视频 |
| **多 Agent 编排** | 基于 LangGraph + Dramatiq 的异步管线，理解 → 分镜 → 代码生成 → 渲染 → 合成 10 阶段 |
| **AI 智能答疑** | 学生端 SSE 流式对话，支持多轮上下文与图片理解 |
| **多 Provider 路由** | 抽象 LLM / TTS / MLLM 三类 Provider，OpenAI / Gemini / Qwen / 豆包等任意切换，故障自动 failover |
| **沙箱化渲染** | Manim 脚本 AST 静态扫描 + Docker 隔离执行，杜绝代码注入与污染宿主 |
| **双前端栈** | React 19 学生端 + Vue 3 教务后台，按用户角色定制体验 |
| **企业级文档** | 32 篇手册覆盖 arc42 + 4+1 + C4 + ISO 29119 + SRE/DORA |

---

## 🏛 系统架构一览

```mermaid
flowchart TB
    subgraph Users[使用方]
        T[👨‍🏫 老师]
        S[👨‍🎓 学生]
        A[🛡 教务管理员]
    end

    subgraph Edge[Edge / 反代]
        N[Nginx]
    end

    subgraph Frontend[前端]
        SF[学生端 SPA<br/>React 19 + Vite]
        AF[管理后台 SPA<br/>Vue 3 Soybean]
    end

    subgraph Backend[后端]
        FA[FastAPI 主进程<br/>REST + SSE 编排]
        FW[Dramatiq Worker<br/>视频管线 / 长任务]
        RJ[RuoYi-Plus<br/>账号 / RBAC / 配额]
    end

    subgraph Providers[AI Provider 抽象层]
        L[LLM Providers<br/>OpenAI / Gemini / Qwen]
        TT[TTS Providers<br/>OpenAI / 豆包]
        ML[MLLM<br/>视觉自修反馈]
    end

    subgraph Data[数据底座]
        MY[(MySQL 8)]
        RE[(Redis 7)]
        MI[(MinIO)]
    end

    subgraph Sandbox[渲染沙箱]
        MN[Manim Docker<br/>+ LaTeX + 中文字体]
    end

    T -->|生产视频| AF
    S -->|学习 / 答疑| SF
    A -->|平台治理| AF
    SF --> N --> FA
    AF --> N --> RJ
    FA -.鉴权.-> RJ
    FA -->|enqueue| RE
    FW -->|consume| RE
    FW --> Providers
    FW --> MN
    FA --> MY
    FW --> MY
    FA --> MI
    FW --> MI

    style Users fill:#e3f2fd
    style Frontend fill:#fff3e0
    style Backend fill:#e8f5e9
    style Providers fill:#fce4ec
    style Data fill:#f3e5f5
    style Sandbox fill:#fff8e1
```

> 📊 **图说：** 学生与教师走双前端 → Nginx 反代 → FastAPI 编排 + Dramatiq Worker → AI Provider 抽象层 + Manim 沙箱 → 关系库 / 缓存 / 对象存储。
>
> 📚 完整架构（含 4+1 视图、C4 容器图、运行时序图、部署拓扑、ADR 决策记录）请见
> [`docs/01开发人员手册/003-架构设计/0001-系统架构总览.md`](./docs/01开发人员手册/003-架构设计/0001-系统架构总览.md)。

---

## 🛠 技术栈

| 层级 | 技术选型 | 版本 |
|---|---|---|
| **学生端前端** | React + TypeScript + Vite + TailwindCSS | React 19 / Vite 6.4.1 |
| **管理后台前端** | Vue 3 + Soybean Admin + Vite | Vue 3.5.26 / Vite 7.3.0 |
| **AI 后端** | FastAPI + LangGraph + Pydantic v2 | FastAPI 0.115+ / Python 3.11+ |
| **任务队列** | Dramatiq + Redis broker | Dramatiq 1.17+ / Redis 7 |
| **管理后台后端** | Spring Boot 3 + Sa-Token + RuoYi-Plus | RuoYi 5.X / Java 17+ |
| **关系库** | MySQL | 8.0 |
| **缓存/队列** | Redis | 7.x |
| **对象存储** | MinIO (S3 兼容) | latest |
| **动画引擎** | Manim Community Edition | 0.19.0 |
| **包管理** | pnpm workspace + uv | pnpm 10.5 |
| **部署** | Docker + Docker Compose | 24+ |

---

## 🎯 业务领域

平台围绕「**教学场景下的 AI 助教**」展开，按领域划分为 6 个有界上下文（Bounded Context）：

| 领域 | 中文 | 核心能力 | 主负责包 |
|---|---|---|---|
| **video** | 视频生产 | 题目 → 分镜 → Manim 代码 → 渲染 → TTS → 合成 | `packages/fastapi-backend/app/features/video/` |
| **classroom** | 课堂服务 | 教师备课、教案管理、班级编排 | `packages/fastapi-backend/app/features/classroom/` |
| **learning** | 学习中心 | 学习路径、错题本、学情追踪 | `packages/fastapi-backend/app/features/learning/` |
| **companion** | AI 答疑 | 多轮对话、上下文保持、图片理解 | `packages/fastapi-backend/app/features/companion/` |
| **knowledge** | 知识库 | 题库、知识点、教辅资料 | `packages/fastapi-backend/app/features/knowledge/` |
| **auth + RBAC** | 账号与权限 | 登录、角色、配额、组织 | `packages/RuoYi-Vue-Plus-5.X/` （Java 端持有） |

> 💡 **架构原则：** 账号体系由 RuoYi 持有，AI 能力由 FastAPI 提供，凭据通过 Bearer Token 透传。Provider 配置通过管理后台动态下发，业务代码不直连任何第三方 SDK。

---

## 📁 仓库目录树

```text
Prorise_ai_teach_workspace/
│
├── 📦 packages/                          # ⭐ 主代码工作区（pnpm workspace）
│   ├── fastapi-backend/                  # FastAPI + LangGraph AI 后端（Python）
│   │   ├── app/
│   │   │   ├── api/                      #   路由聚合
│   │   │   ├── core/                     #   配置 / 中间件 / 异常 / 安全
│   │   │   ├── features/                 #   业务特性（video/classroom/learning/...）
│   │   │   ├── infra/                    #   基础设施（HTTP 客户端等）
│   │   │   ├── providers/                #   AI Provider 抽象（LLM/TTS/MLLM）
│   │   │   ├── schemas/                  #   Pydantic 模型
│   │   │   ├── shared/                   #   通用任务框架
│   │   │   ├── main.py                   #   FastAPI 入口
│   │   │   └── worker.py                 #   Dramatiq Worker 入口
│   │   ├── tests/                        #   单元 / 集成 / 契约 / API 测试
│   │   ├── docker/manim-sandbox/         #   Manim Docker 镜像（含 LaTeX + 中文字体）
│   │   ├── pyproject.toml                #   依赖锁
│   │   ├── pytest.ini                    #   测试配置
│   │   └── run_dev.py                    #   本地开发启动
│   │
│   ├── student-web/                      # 学生端 SPA（React 19 + TypeScript）
│   │   ├── src/
│   │   │   ├── app/                      #   路由 / 入口
│   │   │   ├── features/                 #   领域功能
│   │   │   ├── components/               #   通用组件
│   │   │   ├── services/                 #   后端调用层
│   │   │   ├── stores/                   #   状态管理
│   │   │   └── main.tsx                  #   入口
│   │   ├── test/                         #   Vitest 单测 + Playwright E2E
│   │   └── package.json                  #   @xiaomai/student-web
│   │
│   ├── ruoyi-plus-soybean/               # 管理后台 SPA（Vue 3 + Soybean Admin）
│   │   ├── packages/                     #   monorepo 内子包（hooks/utils/materials...）
│   │   ├── vite.config.ts                #   Vite 配置（端口 9527）
│   │   └── package.json                  #   ruoyi-vue-plus
│   │
│   ├── RuoYi-Vue-Plus-5.X/               # Java 管理后台后端（Spring Boot 3）
│   │   ├── ruoyi-admin/                  #   入口模块
│   │   ├── ruoyi-modules/                #   业务模块（含 ruoyi-xiaomai 小麦业务）
│   │   ├── ruoyi-common/                 #   通用基础设施
│   │   └── pom.xml                       #   Maven 聚合
│   │
│   ├── INDEX.md                          # 工作区导航
│   └── xm_dev.sql                        # 数据库 dump（开发种子数据）
│
├── 📚 docs/                              # 开发者文档
│   ├── 01开发人员手册/                   # ⭐ 32 篇企业级开发手册
│   │   ├── 0000-AI快速导航索引.md
│   │   ├── 001-项目概述/
│   │   ├── 002-需求分析/
│   │   ├── 003-架构设计/                 #   arc42 + 4+1 + C4
│   │   ├── 004-开发规范/                 #   编码 / Git Flow / Code Review / BMAD / 契约
│   │   ├── 005-环境搭建/                 #   可执行 Runbook
│   │   ├── 006-模块开发指南/             #   每模块按 arc42 §5 building block
│   │   ├── 007-测试策略/                 #   ISO/IEC/IEEE 29119 + 测试金字塔
│   │   ├── 008-部署与运维/               #   SRE + DORA + Runbook
│   │   ├── 009-附录/                     #   依赖 / 术语 / FAQ / 参考文献
│   │   ├── 000-腾讯云产品文档/
│   │   └── INDEX.md
│   ├── 02 团队协作进度/
│   └── INDEX.md
│
├── 🧠 _bmad/                             # BMAD 流程系统（脚手架）
├── 🎯 _bmad-output/                      # ⭐ 唯一事实来源（SoT）
│   ├── INDEX.md                          # SoT 索引主入口
│   ├── project-context.md                # 项目语境快照
│   ├── mempalace.yaml                    # MemPalace 索引
│   ├── planning-artifacts/               # PRD / 架构 / Epic 分片
│   ├── implementation-artifacts/         # Story / 实施记录
│   ├── research/                         # 调研报告
│   └── brainstorming/                    # 头脑风暴归档
│
├── 📜 contracts/                         # OpenAPI / JSON Schema 契约
│   ├── _shared/                          #   共享错误模型
│   ├── auth/, center/, classroom/        #   按业务域分目录
│   ├── companion/, evidence/, learning/
│   ├── task/, tasks/, video/
│   └── README.md
│
├── 🚢 deploy/                            # 部署编排
│   ├── docker-compose.yml                #   生产 Compose（mysql/redis/minio/fastapi/ruoyi/edge）
│   ├── Dockerfile.fastapi                #   FastAPI 镜像
│   ├── Dockerfile.ruoyi                  #   RuoYi Java 镜像
│   ├── Dockerfile.admin-fe               #   管理后台前端镜像
│   ├── Dockerfile.student-fe             #   学生端前端镜像
│   ├── nginx-fe/                         #   反代配置
│   ├── scripts/                          #   部署脚本（数据库初始化等）
│   ├── .env.prod.example                 #   生产环境变量模板
│   └── README.md
│
├── 🐳 docker/                            # 辅助 Docker 资源
├── 🎨 mocks/                             # Mock 资产（与 contracts/ 配套）
├── 🔧 scripts/                           # 仓库级脚本
├── 🔍 references/                        # 参考项目（只读）
│
├── 📄 顶层文档
│   ├── README.md                         # 本文件
│   ├── INDEX.md                          # 仓库全局索引
│   ├── ARCHITECTURE.md                   # 架构导航入口
│   ├── AGENTS.md                         # AI Agent 工作约定
│   ├── CLAUDE.md                         # Claude Code 项目指令
│   ├── CONTRIBUTING.md                   # 贡献指南
│   ├── LICENSE                           # Unlicense
│   └── mempalace.yaml                    # MemPalace 项目根索引
│
└── 配置文件
    ├── package.json                      # pnpm workspace 根
    ├── pnpm-workspace.yaml
    └── pnpm-lock.yaml
```

---

## 🔍 目录详解：每一个顶层目录在做什么

> 这一节回答两个问题：**这目录里放什么？为什么需要它？**

### 📦 `packages/` —— 主代码工作区

这是 **整个仓库唯一允许存放业务源代码** 的地方，按 pnpm workspace 多包管理。所有进程入口、依赖锁、测试都在这里。

| 子包 | 角色 | 主语言 | 包名 | 进程数 |
|---|---|---|---|---|
| `fastapi-backend/` | AI 后端 + 视频管线 + Provider 路由 | Python 3.11+ | `prorise-fastapi-backend` | 2（主进程 + Worker） |
| `student-web/` | 学生端 SPA（学习、答疑、视频播放） | TypeScript | `@xiaomai/student-web` | 1 |
| `ruoyi-plus-soybean/` | 教务管理后台 SPA | TypeScript | `ruoyi-vue-plus` | 1 |
| `RuoYi-Vue-Plus-5.X/` | Java 管理后台后端（账号 / RBAC / 配额） | Java 17+ | Maven 多模块 | 2（admin + snailjob） |

**为什么是这样划分：** 学生端（高并发、读为主）与管理后台（低频、写为主）走双栈双入口；账号在 Java（成熟 RuoYi 生态），AI 在 Python（生态最成熟）。

### 📚 `docs/` —— 开发者文档

| 子目录 | 内容 | 体量 |
|---|---|---|
| `01开发人员手册/` | ⭐ 32 篇企业级开发手册（arc42 + 4+1 + C4 + ISO 29119 + SRE/DORA） | ~11000 行 |
| `02 团队协作进度/` | Sprint 周报、回顾、协作记录 | 增量 |
| `INDEX.md` | 文档总索引 | — |

**面向对象：** 新人 onboarding、架构评审、合规审计、AI Agent 检索（含 0000-AI 快速导航索引）。

### 🎯 `_bmad-output/` —— 唯一事实来源（SoT）

> ⚠️ **铁律：** 仓库内任何关于产品需求、架构决策、Epic/Story、实施进度的事实，**全部以 `_bmad-output/` 为准**。其他文档与此处冲突，以本目录为准。

| 子目录 | 角色 |
|---|---|
| `INDEX.md` | SoT 索引主入口 |
| `project-context.md` | 项目语境快照（一文了解项目） |
| `mempalace.yaml` | MemPalace 索引（AI 记忆检索入口） |
| `planning-artifacts/` | PRD / 架构 / Epic 分片 |
| `implementation-artifacts/` | Story / 实施记录 / 验收清单 |
| `research/` | 调研报告（含技术选型、参考项目对标） |
| `brainstorming/` | 头脑风暴归档 |

**协作规则：** 任何 PR 必须挂在某个 Epic / Story 下，不挂不开 PR。

### 🧠 `_bmad/` —— BMAD 流程系统

BMAD 方法论的脚手架与模板（不含项目业务）。**仅修改不删除**。详见 `AGENTS.md`。

### 📜 `contracts/` —— 接口契约（OpenAPI / JSON Schema）

按业务域划分目录的接口契约源文件，是 **前后端协作的事实底稿**。

```
contracts/
├── _shared/        # 共享错误模型、分页、SSE 事件类型
├── auth/           # 登录、令牌、RBAC
├── center/         # 教务中心
├── classroom/      # 课堂服务
├── companion/      # AI 答疑
├── evidence/       # 学习证据
├── learning/       # 学习中心
├── task/  tasks/   # 任务编排
└── video/          # 视频生产
```

**协作规则：** 修改接口必须先改契约，再改代码；契约版本变更必须双轨过渡。详见 [`004-开发规范/0005-契约与Mock资产规范`](./docs/01开发人员手册/004-开发规范/0005-契约与Mock资产规范.md)。

### 🚢 `deploy/` —— 部署编排

| 文件 | 用途 |
|---|---|
| `docker-compose.yml` | 生产环境编排（mysql / redis / minio / fastapi / fastapi-worker / ruoyi-java / ruoyi-snailjob / ruoyi-monitor / edge / minio-init） |
| `Dockerfile.fastapi` | Python 后端镜像（多阶段构建） |
| `Dockerfile.ruoyi` | Java 后端镜像 |
| `Dockerfile.admin-fe` / `Dockerfile.student-fe` | 前端静态镜像（nginx-alpine） |
| `nginx-fe/` | 反向代理配置（路由分发、SSE 不缓冲、HTTPS） |
| `scripts/` | 数据库初始化、健康检查、备份恢复 |
| `.env.prod.example` | 生产环境变量模板（端口 / 密码 / 域名） |

**网络分区：** `edge`（外网入口）+ `backend`（后端进程）+ `prorise-internal`（数据底座，不暴露）。

### 🐳 `docker/` —— 辅助 Docker 资源

非生产部署用的 Docker 资源（本地工具镜像、调试容器、实验性沙箱）。生产编排在 `deploy/` 下。

### 🎨 `mocks/` —— Mock 资产

与 `contracts/` 配套的 Mock 数据，前端在断网或后端未就绪时使用。

### 🔧 `scripts/` —— 仓库级脚本

跨包工具脚本（如批量 lint、批量发版预演、数据迁移）。包内脚本应放各 package 的 `scripts/` 子目录。

### 📄 顶层文档与配置

| 文件 | 角色 |
|---|---|
| `README.md` | ⭐ 本文（仓库门面） |
| `INDEX.md` | 仓库全局索引（更新频率最高） |
| `ARCHITECTURE.md` | 架构导航入口 |
| `AGENTS.md` | AI Agent 工作约定（MCP 调用规则、文档回写） |
| `CLAUDE.md` | Claude Code 项目级指令 |
| `CONTRIBUTING.md` | 贡献流程 |
| `LICENSE` | ⚠️ 商业专有许可（Proprietary） |
| `mempalace.yaml` | MemPalace 项目根索引 |
| `package.json` | pnpm workspace 根（脚本命令在此） |
| `pnpm-workspace.yaml` | workspace 包列表 |
| `pnpm-lock.yaml` | 依赖锁（**必须 commit**） |

### 📐 命名约定速查

| 命名 | 含义 |
|---|---|
| `xm_` 前缀 | 数据库表（"小麦"业务前缀） |
| `@xiaomai/*` | npm 包作用域 |
| `_bmad-output/` | SoT，绝对权威 |
| `_artifacts/`、`.runtime/` | 运行时产物，**不进 git** |
| `docs/01开发人员手册/000X-*.md` | 4 位编号的章节文件 |

---

## 🚀 快速本地运行

> **核心理念：** 数据底座（MySQL / Redis / MinIO）走 Docker，前后端代码进程跑本机便于热重载与调试。

### 0. 前置依赖

| 工具 | 最低版本 | 安装方式 |
|---|---|---|
| **Node.js** | 20.19+ | <https://nodejs.org> 或 nvm |
| **pnpm** | 10.5 | `npm i -g pnpm@10.5` |
| **Python** | 3.11+ | <https://python.org> 或 pyenv |
| **JDK** | 17+ | <https://adoptium.net> |
| **Maven** | 3.9+ | <https://maven.apache.org> |
| **Docker + Docker Compose** | 24+ | <https://docker.com> |

校验：

```bash
node -v    # >= v20.19
pnpm -v    # >= 10.5
python3 -V # >= 3.11
java -version
mvn -v
docker version && docker compose version
```

### 1. 拉起数据底座（Docker）

```bash
# 第一次创建外部网络（仅首次）
docker network create prorise-internal 2>/dev/null || true

# 复制并按需修改环境变量
cp deploy/.env.prod.example deploy/.env.dev

# 仅启动数据服务（不启动 FastAPI / RuoYi 容器，本机跑代码）
cd deploy
docker compose --env-file .env.dev up -d mysql redis minio minio-init
docker compose ps
```

**验证：**

```bash
# MySQL
docker compose exec mysql mysqladmin -uroot -p"$MYSQL_ROOT_PASSWORD" ping
# Redis
docker compose exec redis redis-cli ping            # 应返回 PONG
# MinIO 控制台
open http://localhost:9001                          # 浏览器登录
```

> 数据库种子数据：参见 [`packages/xm_dev.sql`](./packages/xm_dev.sql) + `deploy/sql/06-data-fixup.sql`，由 `deploy/scripts/` 内脚本自动导入；细节见《[005-环境搭建/0004-数据库与中间件](./docs/01开发人员手册/005-环境搭建/0004-数据库与中间件.md)》。

### 2. 安装代码依赖

```bash
# 仓库根
pnpm install                          # 安装所有前端依赖（workspace）
pnpm setup:fastapi-backend            # 创建 FastAPI venv 并 pip install -e .[dev]
```

### 3. 配置环境变量

```bash
# FastAPI 后端
cp packages/fastapi-backend/.env.example packages/fastapi-backend/.env.local
# 按需填写：DB / Redis / Provider Key / OSS

# 学生端
cp packages/student-web/.env.example packages/student-web/.env.development

# 管理后台不需要额外 env（默认指向本机 8080）
```

### 4. 启动 RuoYi Java 后端

```bash
cd packages/RuoYi-Vue-Plus-5.X
mvn -pl ruoyi-admin -am spring-boot:run -Dspring-boot.run.profiles=dev
# 监听 :8080
```

### 5. 启动 FastAPI + Worker + 双前端

**推荐：一键四进程并行启动**

```bash
pnpm dev:all
```

> 使用 `concurrently` 同时跑 student / fastapi / worker / admin 四个进程，输出按颜色区分。

**或单独启动**：

```bash
pnpm dev:fastapi-backend     # FastAPI :8090
pnpm dev:fastapi-worker      # Dramatiq Worker（消费 Redis 队列）
pnpm dev:student-web         # 学生端 :5173
pnpm dev:admin-web           # 管理后台 :9527
```

### 6. 验证全链路

| 服务 | URL | 期望 |
|---|---|---|
| FastAPI 健康检查 | <http://localhost:8090/health> | `{"status":"ok"}` |
| FastAPI OpenAPI | <http://localhost:8090/docs> | Swagger UI |
| RuoYi 后端 | <http://localhost:8080/actuator/health> | `{"status":"UP"}` |
| 学生端 | <http://localhost:5173> | 首页加载成功 |
| 管理后台 | <http://localhost:9527> | 登录页加载成功 |
| MinIO 控制台 | <http://localhost:9001> | 登录后可见 bucket |

### 7. 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| `docker network not found: prorise-internal` | 首次未建外部网络 | `docker network create prorise-internal` |
| FastAPI 启动 `ImportError: cryptography` | venv 未装 dev 依赖 | 重跑 `pnpm setup:fastapi-backend` |
| `5173` 端口占用 | 已开过 vite | `lsof -i:5173` 杀掉旧进程 |
| Redis 连接拒绝 | 未起或密码错 | 查 `.env.local` 的 `FASTAPI_REDIS_URL` 与 `deploy/.env.dev` 是否一致 |
| MinIO bucket 不存在 | `minio-init` 未跑 | `cd deploy && docker compose run --rm minio-init` |
| LaTeX 公式渲染失败 | 本机缺 LaTeX | 视频管线必须走 `manim-sandbox` 镜像，不要本地直跑 |

> 完整故障排查：《[008-部署与运维/0004-故障排查手册](./docs/01开发人员手册/008-部署与运维/0004-故障排查手册.md)》

---

## 📋 完整脚本速查

### 安装 / 清理

```bash
pnpm install:all            # 安装全部前端依赖
pnpm setup:fastapi-backend  # 创建 FastAPI venv
pnpm clean:all              # 清理所有构建产物
```

### 开发

```bash
pnpm dev:all                # 一键启动 4 进程
pnpm dev:student-web        # 学生端 :5173
pnpm dev:admin-web          # 管理后台 :9527
pnpm dev:fastapi-backend    # FastAPI :8090
pnpm dev:fastapi-worker     # Dramatiq Worker
```

### 构建

```bash
pnpm build:all              # 全栈构建
pnpm build:student-web
pnpm build:admin-web
```

### 测试

```bash
pnpm test:all                              # 所有测试
pnpm test:student-web                      # 学生端单测（Vitest）
pnpm test:student-web:e2e                  # 学生端 E2E（Playwright）
pnpm test:student-web:coverage             # 学生端覆盖率
pnpm test:fastapi-backend                  # FastAPI 全部
pnpm test:fastapi-backend:unit             # 仅单元测试
pnpm test:fastapi-backend:api              # API + 契约
pnpm test:fastapi-backend:integration      # 集成测试
pnpm test:fastapi-backend:contracts        # 契约测试
pnpm test:fastapi-backend:coverage         # 覆盖率（HTML 报告）
pnpm test:fastapi-backend:ci               # CI 完整链路
```

### Lint / 类型检查

```bash
pnpm lint:all
pnpm lint:student-web
pnpm lint:admin-web
pnpm typecheck:all
pnpm typecheck:student-web
pnpm typecheck:admin-web
```

---

## 📖 文档导航

> **首选入口（按身份选择）：**

| 你是… | 推荐起点 |
|---|---|
| 🆕 新加入研发 | [`docs/01开发人员手册/0000-AI快速导航索引.md`](./docs/01开发人员手册/0000-AI快速导航索引.md) |
| 🏗 架构师 | [`003-架构设计/0001-系统架构总览`](./docs/01开发人员手册/003-架构设计/0001-系统架构总览.md) |
| 💻 开发 | [`004-开发规范/0001-编码规范`](./docs/01开发人员手册/004-开发规范/0001-编码规范.md) |
| 🧪 测试 | [`007-测试策略/0001-测试总体策略`](./docs/01开发人员手册/007-测试策略/0001-测试总体策略.md) |
| 🚢 运维 | [`008-部署与运维/0001-部署架构`](./docs/01开发人员手册/008-部署与运维/0001-部署架构.md) |
| 🤖 AI Agent | [`AGENTS.md`](./AGENTS.md) + [`CLAUDE.md`](./CLAUDE.md) |
| 📦 BMAD SoT | [`_bmad-output/INDEX.md`](./_bmad-output/INDEX.md) |

> **完整文档体系：**

| 章节 | 内容 |
|---|---|
| [001-项目概述](./docs/01开发人员手册/001-项目概述/) | 产品愿景 / 项目背景 / 团队角色 / 术语 |
| [002-需求分析](./docs/01开发人员手册/002-需求分析/) | PRD / 功能清单 / 非功能需求 / 用户故事 |
| [003-架构设计](./docs/01开发人员手册/003-架构设计/) | 系统总览 / 技术选型 / 数据模型 / API 规范 / 安全 |
| [004-开发规范](./docs/01开发人员手册/004-开发规范/) | 编码 / Git / Code Review / BMAD / 契约 Mock |
| [005-环境搭建](./docs/01开发人员手册/005-环境搭建/) | 总览 / 前端启动 / 后端启动 / 数据库中间件 |
| [006-模块开发指南](./docs/01开发人员手册/006-模块开发指南/) | 模块依赖 / 课堂 / 视频 / LLM / TTS / Manim |
| [007-测试策略](./docs/01开发人员手册/007-测试策略/) | 总体策略 / 单元 / 集成 / E2E |
| [008-部署与运维](./docs/01开发人员手册/008-部署与运维/) | 部署架构 / CI/CD / 监控告警 / 故障手册 |
| [009-附录](./docs/01开发人员手册/009-附录/) | 第三方依赖 / 术语表 / FAQ / 参考文献 |

---

## 🚢 部署

生产部署一键编排：

```bash
cd deploy
cp .env.prod.example .env.prod    # 修改密钥与域名
docker compose --env-file .env.prod up -d
```

**容器拓扑：** Nginx 反代 → 前端静态（admin-fe / student-fe）+ FastAPI + RuoYi-Java + RuoYi-Snailjob → MySQL / Redis / MinIO。

详见《[008-部署与运维/0001-部署架构](./docs/01开发人员手册/008-部署与运维/0001-部署架构.md)》。

---

## 🤝 团队协作与贡献

> 本仓库 **不接受** 来自外部的 Pull Request。仅授权研发成员在内部开展工作。

**内部协作流程：**

1. **看记忆** — 任务开始前先查 [`mempalace.yaml`](./mempalace.yaml) 与 [`_bmad-output/INDEX.md`](./_bmad-output/INDEX.md)
2. **挂 Story** — 所有改动必须挂在某个 Epic / Story 下，无 Story 不开 PR
3. **走 GitHub Flow** — Issue → 短分支 → Draft PR → Review → Squash and merge
4. **遵循规范**：
   - 编码：[`004-开发规范/0001-编码规范`](./docs/01开发人员手册/004-开发规范/0001-编码规范.md)
   - Git：[`004-开发规范/0002-Git工作流`](./docs/01开发人员手册/004-开发规范/0002-Git工作流.md)（Conventional Commits）
   - 评审：[`004-开发规范/0003-代码审查标准`](./docs/01开发人员手册/004-开发规范/0003-代码审查标准.md)（Google CL 标准）
   - BMAD：[`004-开发规范/0004-BMAD开发流程`](./docs/01开发人员手册/004-开发规范/0004-BMAD开发流程.md)
   - 契约：[`004-开发规范/0005-契约与Mock资产规范`](./docs/01开发人员手册/004-开发规范/0005-契约与Mock资产规范.md)
5. **回写文档** — 任务结束必须回写 `_bmad-output/INDEX.md` 与相关 sprint-status

详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md) + [`AGENTS.md`](./AGENTS.md) + [`CLAUDE.md`](./CLAUDE.md)。

---

## 🏆 赛事信息

- **赛事**：教育智能体应用创新赛（高职组）
- **截止**：2026-04-25
- **平台**：腾讯云智能体开发平台
- **腾讯云产品文档**：[`docs/01开发人员手册/000-腾讯云产品文档/`](./docs/01开发人员手册/000-腾讯云产品文档/)

---

## ⚖️ 版权与许可证

> 🚫 **本仓库不是开源项目。**

**版权所有 © 2026 Prorise AI Teach Team. All Rights Reserved.**

本仓库受 **商业专有许可（Proprietary Commercial License）** 保护。

| 严禁行为 | 说明 |
|---|---|
| ❌ 复制、镜像、缓存 | 不得复制本仓库到任何外部位置 |
| ❌ 修改、衍生 | 不得制作派生作品 |
| ❌ 分发、再许可、销售 | 不得以任何方式公开或转授权 |
| ❌ 反向工程 | 不得反编译、解密、提取算法 |
| ❌ AI 训练 | 不得用于训练任何机器学习模型 |
| ❌ 竞品与公开发表 | 不得用于竞品开发、商业 SaaS、对外培训或学术发表 |

| ✅ 仅允许行为 | 条件 |
|---|---|
| 经书面授权的内部研发 | 在本仓库内部、为本项目目的 |
| 商业合作授权 | 签署正式商业许可协议后 |

**侵权后果：** 立即终止授权 + 停止侵害 + 销毁副本 + 民事赔偿 + 行政查处 + 刑事追责。详见 [`LICENSE`](./LICENSE) 第 8 条。

**法律适用：** 中华人民共和国法律。争议由权利人住所地有管辖权的人民法院管辖。

> 📖 请于使用前完整阅读 [`LICENSE`](./LICENSE)。**通过访问、下载或克隆本仓库，即视为您已同意接受全部许可条款。**

---

<div align="center">

**Prorise AI Teach Workspace** · Built with ❤️ for Education

[文档体系](./docs/01开发人员手册/INDEX.md) · [BMAD SoT](./_bmad-output/INDEX.md) · [架构总览](./docs/01开发人员手册/003-架构设计/0001-系统架构总览.md) · [部署架构](./docs/01开发人员手册/008-部署与运维/0001-部署架构.md)

Copyright © 2026 Prorise AI Teach Team. All Rights Reserved.

</div>
