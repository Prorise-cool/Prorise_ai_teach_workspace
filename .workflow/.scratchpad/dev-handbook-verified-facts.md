# 已验证事实清单 v1.0（2026-04-25 by team-lead）

> 所有 writer 写入文档时必须基于此清单。任何与之冲突的写法均为编造，必须修改。

## 目录结构（真实）

```
仓库根/
├── packages/
│   ├── fastapi-backend/        # Python 3.11+ FastAPI 后端
│   ├── ruoyi-plus-soybean/     # Vue 3 管理后台（Soybean Admin）
│   ├── student-web/            # React + TypeScript 学生端 ⚠️ 不是 Vue
│   ├── RuoYi-Vue-Plus-5.X/     # Java SpringBoot 后端
│   ├── INDEX.md
│   └── xm_dev.sql              # 数据库 dump
├── deploy/
│   └── docker-compose.yml      # 唯一 docker-compose（根目录无）
├── .github/workflows/
│   ├── auto-assign.yml
│   ├── fastapi-backend-tests.yml
│   ├── lock.yml
│   └── pr-labels.yml
├── _bmad-output/                # BMAD SoT
│   ├── brainstorming/
│   ├── planning-artifacts/
│   ├── implementation-artifacts/
│   ├── research/
│   ├── INDEX.md
│   ├── project-context.md
│   └── mempalace.yaml
└── docs/01开发人员手册/...
```

## 后端 packages/fastapi-backend/

```
fastapi-backend/
├── app/
│   ├── api/         # 路由层
│   ├── core/        # config.py 等核心
│   ├── features/    # 业务特性
│   ├── infra/       # 基础设施
│   ├── providers/   # AI Provider 路由
│   ├── schemas/     # Pydantic
│   ├── shared/
│   ├── main.py      # FastAPI app 入口
│   └── worker.py    # Dramatiq worker 入口
├── tests/
│   ├── unit/{video, infra, core, auth, task_framework,
│   │         learning, providers, classroom,
│   │         learning_coach, shared, openmaic, assets}
│   ├── integration/
│   ├── contracts/
│   ├── api/
│   └── helpers/
├── pyproject.toml
├── pytest.ini
├── run_dev.py
├── uv.lock
└── docker/
```

**Python 依赖（已验证 packages/fastapi-backend/pyproject.toml）：**
- `fastapi>=0.115,<1.0`
- `uvicorn[standard]>=0.34,<1.0`
- `pydantic-settings>=2.7,<3.0`
- `dramatiq[redis]>=1.17,<2.0`
- `httpx>=0.28,<1.0`
- `openai>=1.30,<2.0`
- `cryptography>=44.0,<45.0`
- `Jinja2>=3.1,<4.0`
- `langgraph>=0.2,<1.0`
- `langchain-core>=0.3,<1.0`
- `pypdf>=5.0,<6.0`
- `partial-json-parser>=0.2,<1.0`

**Dev 依赖：** pytest>=8.3, pytest-asyncio>=1.2, pytest-cov>=6.0
**Python 版本：** ≥3.11（不是 3.12）

## 前端

| 包 | 类型 | 版本 | 入口 |
|---|---|---|---|
| `packages/student-web` | **React + TypeScript** | Vite 6.4.1 | `src/main.tsx` |
| `packages/ruoyi-plus-soybean` | **Vue 3** | Vue 3.5.26 + Vite 7.3.0 | Soybean Admin 框架 |

⚠️ **不要把 student-web 写成 Vue**。它是 React/TSX，目录有 main.tsx + features/ + stores/ + services/。
⚠️ **不要把 admin 写成 React**。它是 Vue 3 Soybean。

**student-web 包名：** `@xiaomai/student-web`
**admin 包名：** `ruoyi-vue-plus`（version 2.0.0）

## Docker Compose（deploy/docker-compose.yml）已验证服务

- `mysql`（数据存储）
- `redis`（队列 + 缓存）
- `minio`（对象存储）
- `minio-init`
- `ruoyi-snailjob`（任务调度）
- `ruoyi-monitor`
- `ruoyi-java`（SpringBoot 后端）
- `fastapi`（Python 后端）
- `edge`（边缘代理，疑似 nginx）
- `prorise-internal`

**命名卷：**
- `mysql-data` → /var/lib/mysql
- `redis-data` → /data（AOF 持久化）
- `minio-data` → /data
- `video-assets` → FastAPI .runtime/video-assets/{assets,json_files}
- `video-uploads` → /data/uploads/video
- `fastapi-secrets` → /app/.runtime/secrets
- `ruoyi-admin-logs` / `ruoyi-monitor-logs` / `ruoyi-snailjob-logs`

## CI（.github/workflows/）

- `fastapi-backend-tests.yml` — 后端测试主流水线
- `auto-assign.yml` — PR 自动分配
- `lock.yml` — 锁定旧 issue/PR
- `pr-labels.yml` — PR 标签

⚠️ 没有前端 CI（如要写「前端 CI」请如实写「待补充」）。

## 关键端口（项目记忆）

| 服务 | 端口 |
|---|---|
| FastAPI | 8090 |
| RuoYi Java | 8080 |
| 前端 dev（vite） | 通常 5173/5666（实际看 vite 配置） |
| MySQL | 3306 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## API 前缀

`/api/v1/`（**不是** `/api/`，这是已知约定）

## BMAD 体系

`_bmad-output/` 是仓库唯一事实来源（PRD、架构、Epic、Story、sprint-status.yaml）。
`mempalace.yaml` 是 MemPalace 索引入口。

## 已知技术决策（写 ADR 时引用）

- ADR-001 选 FastAPI 而非 Flask（异步、类型、自动 OpenAPI）
- ADR-002 选 Dramatiq 而非 Celery（轻量，Redis broker）
- ADR-003 视频管道全量重写为 Code2Video（替换原 67 文件 11592 行）
- ADR-004 双前端栈：React 学生端 + Vue 管理后台
- ADR-005 MemPalace 作为 AI 记忆与规范的唯一入口
- ADR-006 多 Provider 路由（OpenAI/Gemini/Qwen），动态配置
- ADR-007 Manim 渲染走 Docker 沙箱（防止本地 LaTeX 缺失污染管道）
- ADR-008 BMAD（Epic→Story→Implementation）作为开发流程

## 项目硬规则（写入「禁止事项」段时引用）

- 禁止 `skip` / `@ts-ignore` / `as any` / 调大 timeout 来掩盖问题
- 禁止编造代码路径、类名、端口
- 禁止保留 TODO/TBD/待补充作为最终交付
- 必须先查 MemPalace 再写代码（任务铁律）

## Tavily 调研得出的格式标准（已应用于规范基线）

- arc42（12 节）—— 架构文档黄金模板
- 4+1 视图模型 —— Logical/Development/Process/Physical/Scenarios
- C4 Model —— Context/Container/Component/Code 4 层
- ISO/IEC/IEEE 26515:2018 —— 敏捷环境用户文档开发
- IEEE 1063 —— Software User Documentation
- GB/T 8567-2006 —— 计算机软件文档编制规范
- ISO/IEC/IEEE 29119 —— 软件测试国际标准
- Google Engineering Practices —— Code Review 标准、CL 工作流
- DORA 4 项指标 —— 部署频率 / 变更前置时间 / MTTR / 变更失败率
- ADR（Architecture Decision Records）—— 决策记录
