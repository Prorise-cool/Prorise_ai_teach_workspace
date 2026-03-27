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
│   └── ruoyi-plus-soybean-master/  # Vue 管理端前端基座
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

- Node.js 18+
- pnpm 9.0+
- Python 3.11+

### 安装

```bash
# 安装根依赖
pnpm install

# 安装所有 workspace 依赖
pnpm install:all
```

### 开发

```bash
# 开发特定包
cd packages/fastapi-backend

# 构建所有包
pnpm build:all
```

## 赛事信息

- **赛事**: 教育智能体应用创新赛（高职组）
- **截止**: 2026/4/25
- **平台**: 腾讯云智能体开发平台

## 许可证

本项目采用 Unlicense 许可证 - 查看 [LICENSE](LICENSE) 了解详情。
