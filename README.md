# Prorise AI Teach Workspace

AI 教学视频智能体 - 基于多 Agent 协作的自动化教学视频生成平台。

## 项目结构

```
Prorise_ai_teach_workspace/
├── docs/                       # 项目文档
│   ├── planning/              # 规划文档
│   ├── research/              # 研究文档
│   └── brainstorming/         # 头脑风暴记录
│
├── packages/                   # 单仓代码包
│   └── fastapi-backend/       # FastAPI 后端（待开发）
│
├── references/                 # 参考项目（只读）
│   ├── manim-to-video-claw/   # Manim 视频渲染技术参考
│   ├── openmaic/              # OpenMAIC 多 Agent 协作参考
│   ├── RuoYi-Vue-Plus-5.X/    # RuoYi Java 管理后台框架
│   └── ruoyi-plus-soybean-master/  # RuoYi React 版本
│
├── _bmad/                      # BMAD 开发流程系统
├── _bmad-output/               # BMAD 流程输出
│
├── package.json                # 单仓根配置
├── pnpm-workspace.yaml         # pnpm workspaces 配置
└── .gitignore                  # Git 忽略规则
```

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
