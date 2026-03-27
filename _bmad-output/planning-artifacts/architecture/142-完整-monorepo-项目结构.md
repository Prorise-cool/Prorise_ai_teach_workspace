# 14.2 完整 Monorepo 项目结构

```text
Prorise_ai_teach_workspace/
├── docs/                                    # 📚 项目文档
│   ├── 01开发人员手册/
│   │   ├── 001-项目概述.md
│   │   ├── 002-需求分析.md
│   │   ├── 003-架构设计.md
│   │   ├── 004-开发规范.md
│   │   ├── 005-环境搭建.md
│   │   ├── 006-模块开发指南/
│   │   │   ├── 01-课堂服务.md
│   │   │   ├── 02-视频服务.md
│   │   │   ├── 03-AI-LLM集成.md
│   │   │   ├── 04-TTS集成.md
│   │   │   └── 05-Manim渲染.md
│   │   ├── 007-测试策略.md
│   │   ├── 008-部署与运维.md
│   │   ├── 009-里程碑与进度.md
│   │   └── 010-附录/
│   │       ├── 000-腾讯云产品文档/
│   │       ├── ADR记录.md
│   │       └── FAQ.md
│   ├── 02团队协作规范/
│   ├── 03UI:UX设计素材/
│   └── INDEX.md
│
├── packages/                                # 📦 代码包
│   │
│   ├── fastapi-backend/                     # 🔴 FastAPI 功能服务 (8090)
│   │   ├── app/
│   │   │   ├── main.py                     # FastAPI 应用入口
│   │   │   │
│   │   │   ├── core/                       # 核心配置与基础设施
│   │   │   │   ├── config.py               # pydantic-settings 配置
│   │   │   │   ├── security.py             # JWT 验证、密码哈希
│   │   │   │   ├── lifespan.py             # 应用生命周期管理
│   │   │   │   ├── errors.py               # 统一异常处理
│   │   │   │   ├── sse.py                  # SSE 基础设施
│   │   │   │   └── logging.py              # loguru 日志配置
│   │   │   │
│   │   │   ├── infra/                      # 基础设施层
│   │   │   │   ├── http/                   # HTTP 客户端抽象
│   │   │   │   │   ├── protocols.py        # HttpClient Protocol
│   │   │   │   │   ├── httpx_client.py     # httpx 实现
│   │   │   │   │   └── retry.py            # tenacity 重试策略
│   │   │   │   ├── redis_client.py         # redis-py 客户端
│   │   │   │   └── sse_broker.py           # SSE 事件分发器
│   │   │   │
│   │   │   ├── providers/                  # Provider 抽象层
│   │   │   │   ├── protocols.py            # LLM/TTS Protocol 定义
│   │   │   │   ├── llm/                    # LLM 实现
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── factory.py          # LLM Provider 工厂
│   │   │   │   │   ├── gemini_provider.py  # Gemini 实现
│   │   │   │   │   ├── claude_provider.py  # Claude 实现
│   │   │   │   │   └── deepseek_provider.py
│   │   │   │   └── tts/                    # TTS 实现
│   │   │   │       ├── __init__.py
│   │   │   │       ├── factory.py          # TTS Provider 工厂
│   │   │   │       ├── doubao_provider.py  # 豆包 TTS
│   │   │   │       ├── baidu_provider.py   # 百度 TTS
│   │   │   │       ├── spark_provider.py   # Spark TTS
│   │   │   │       └── kokoro_provider.py  # Kokoro 本地 TTS
│   │   │   │
│   │   │   ├── features/                   # 业务功能模块
│   │   │   │   ├── classroom/              # 课堂服务模块
│   │   │   │   │   ├── routes.py           # 路由定义
│   │   │   │   │   ├── service.py          # 课堂生成逻辑
│   │   │   │   │   ├── schemas.py          # Pydantic 模型
│   │   │   │   │   ├── agents/             # Agent 编排
│   │   │   │   │   │   ├── orchestrator.py # LangGraph 编排器
│   │   │   │   │   │   ├── styles.py       # AgentConfig 定义
│   │   │   │   │   │   └── prompts.py      # Persona 模板
│   │   │   │   │   └── workers/            # 课堂异步任务
│   │   │   │   │       └── classroom_task.py
│   │   │   │   │
│   │   │   │   └── video/                  # 视频服务模块
│   │   │   │       ├── routes.py           # 路由定义
│   │   │   │       ├── service.py          # 视频生成逻辑
│   │   │   │       ├── schemas.py          # Pydantic 模型
│   │   │   │       ├── pipeline/           # 视频流水线
│   │   │   │       │   ├── stages.py       # 阶段定义
│   │   │   │       │   ├── understanding.py # 题目理解
│   │   │   │       │   ├── storyboard.py   # 分镜生成
│   │   │   │       │   ├── manim_gen.py    # Manim 代码生成
│   │   │   │       │   ├── manim_fix.py    # Manim 修复链
│   │   │   │       │   ├── render.py       # 渲染执行
│   │   │   │       │   └── compose.py      # FFmpeg 合成
│   │   │   │       ├── sandbox/            # Manim 沙箱
│   │   │   │       │   ├── executor.py     # 安全执行器
│   │   │   │       │   ├── resource_limits.py
│   │   │   │       │   └── security_policy.py
│   │   │   │       └── workers/            # 视频异步任务
│   │   │   │           └── video_task.py
│   │   │   │
│   │   │   └── shared/                     # 共享模块
│   │   │       ├── agent_config.py         # AgentConfig 预设数据
│   │   │       ├── ruoyi_client.py         # RuoYi API 客户端
│   │   │       ├── cos_client.py           # 腾讯云 COS 客户端
│   │   │       ├── tencent_adp.py          # 腾讯云智能体平台适配器
│   │   │       └── task_framework/         # 统一任务框架
│   │   │           ├── base.py             # BaseTask 基类
│   │   │           ├── status.py           # TaskStatus 枚举
│   │   │           ├── context.py          # TaskContext
│   │   │           ├── events.py           # TaskProgressEvent
│   │   │           └── scheduler.py        # TaskScheduler
│   │   │
│   │   ├── tests/                          # 测试
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── conftest.py
│   │   │
│   │   ├── pyproject.toml                  # 项目配置
│   │   ├── requirements.txt                # 依赖清单
│   │   ├── Dockerfile                      # 容器化配置
│   │   └── .env.example                    # 环境变量示例
│   │
│   ├── student-web/                         # 🔵 React 19 学生端前台 (5173)
│   │   ├── src/
│   │   │   ├── main.tsx                    # 应用入口
│   │   │   ├── App.tsx                     # 根组件
│   │   │   │
│   │   │   ├── pages/                      # 页面组件
│   │   │   │   ├── Home.tsx                # 首页双入口
│   │   │   │   ├── VideoGenerator.tsx      # 视频生成页
│   │   │   │   ├── VideoPlayer.tsx         # 视频播放页
│   │   │   │   ├── Classroom.tsx           # 课堂页
│   │   │   │   ├── KnowledgeQA.tsx         # 知识问答页
│   │   │   │   ├── LearningCenter.tsx      # 学习中心
│   │   │   │   └── Profile.tsx             # 个人中心
│   │   │   │
│   │   │   ├── components/                 # 组件
│   │   │   │   ├── ui/                     # Shadcn/ui 组件
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── layout/                 # 布局组件
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── Sidebar.tsx
│   │   │   │   ├── video/                  # 视频相关组件
│   │   │   │   │   ├── TaskProgress.tsx    # SSE 进度展示
│   │   │   │   │   ├── VideoPlayer.tsx     # Video.js 封装
│   │   │   │   │   └── TaskList.tsx
│   │   │   │   ├── classroom/              # 课堂相关组件
│   │   │   │   │   ├── AgentAvatar.tsx     # Agent 头像
│   │   │   │   │   ├── ChatPanel.tsx       # 对话面板
│   │   │   │   │   └── SlideViewer.tsx     # 幻灯片查看器
│   │   │   │   └── agent/                  # Agent 风格组件
│   │   │   │       ├── AgentSelector.tsx   # Agent 选择器
│   │   │   │       └── AgentStyleWrapper.tsx
│   │   │   │
│   │   │   ├── hooks/                      # 自定义 Hooks
│   │   │   │   ├── useSSE.ts               # SSE 连接管理
│   │   │   │   ├── useVideoTask.ts         # 视频任务状态
│   │   │   │   └── useAuth.ts              # 认证状态
│   │   │   │
│   │   │   ├── stores/                     # Zustand 状态
│   │   │   │   ├── authStore.ts            # 认证状态
│   │   │   │   ├── agentStore.ts           # Agent 配置
│   │   │   │   └── taskStore.ts            # 任务状态
│   │   │   │
│   │   │   ├── services/                   # API 服务
│   │   │   │   ├── api/                    # HTTP 客户端
│   │   │   │   │   ├── client.ts           # ky/alova 封装
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── video.ts                # 视频服务 API
│   │   │   │   ├── classroom.ts            # 课堂服务 API
│   │   │   │   └── auth.ts                 # 认证 API
│   │   │   │
│   │   │   ├── router/                     # 路由配置
│   │   │   │   ├── index.tsx
│   │   │   │   └── routes.ts
│   │   │   │
│   │   │   ├── styles/                     # 样式
│   │   │   │   ├── globals.css             # Tailwind 入口
│   │   │   │   └── agent-colors.css        # Agent 点缀色变量
│   │   │   │
│   │   │   ├── lib/                        # 工具库
│   │   │   │   ├── utils.ts                # 工具函数
│   │   │   │   ├── constants.ts            # 常量
│   │   │   │   └── katex.ts                # KaTeX 配置
│   │   │   │
│   │   │   └── types/                      # TypeScript 类型
│   │   │       ├── api.ts
│   │   │       ├── video.ts
│   │   │       └── classroom.ts
│   │   │
│   │   ├── public/
│   │   │   ├── avatars/                    # Agent 头像图片
│   │   │   │   ├── serious.png
│   │   │   │   ├── humorous.png
│   │   │   │   ├── patient.png
│   │   │   │   └── efficient.png
│   │   │   └── favicon.ico
│   │   │
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .env.example
│   │
│   ├── ruoyi-plus-soybean-master/           # 🟢 ToB 管理前端 (已有，不动)
│   │
│   └── RuoYi-Vue-Plus-5.X/                  # 🟡 RuoYi Java 后端 (8080)
│       ├── ruoyi-admin/                     # 管理后台模块
│       ├── ruoyi-common/                    # 公共模块
│       ├── ruoyi-system/                    # 系统模块
│       ├── ruoyi-framework/                 # 框架核心
│       │
│       └── ruoyi-xiaomai/                   # 🆕 小麦业务模块 (新增)
│           ├── src/main/java/
│           │   └── org/ruoyi/xiaomai/
│           │       ├── domain/              # 实体类
│           │       │   ├── XmVideoTask.java
│           │       │   ├── XmClassroomSession.java
│           │       │   ├── XmLearningRecord.java
│           │       │   ├── XmLearningFavorite.java
│           │       │   └── XmQuizResult.java
│           │       ├── mapper/              # MyBatis Mapper
│           │       ├── service/             # 业务服务
│           │       ├── controller/          # REST 接口
│           │       └── vo/                  # VO 对象
│           └── src/main/resources/
│               └── mapper/                  # XML 映射文件
│
├── references/                              # 📖 参考项目 (只读)
│   ├── openmaic/                           # OpenMAIC 多 Agent 课堂
│   ├── manim-to-video-claw/                # Manim 视频生成流水线
│   └── INDEX.md
│
├── _bmad/                                   # BMAD 开发流程系统
│   ├── bmm/
│   │   ├── agents/
│   │   ├── config.yaml
│   │   └── workflows/
│   └── tasks/
│
├── _bmad-output/                            # BMAD 流程产出物
│   ├── planning-artifacts/
│   │   ├── prd.md                          # ✅ 已完成
│   │   ├── ux-design-specification.md      # ✅ 已完成
│   │   ├── architecture.md                 # ✅ 已完成 (本文档)
│   │   └── product-brief-*.md
│   ├── implementation-artifacts/
│   └── research/
│
├── .serena/                                 # Serena 项目记忆
│
├── CLAUDE.md                                # Claude Code 项目指令
├── pnpm-workspace.yaml                      # pnpm workspace 配置
├── package.json                             # 根 package.json
└── README.md
```
