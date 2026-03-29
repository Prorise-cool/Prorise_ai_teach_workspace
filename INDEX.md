# Workspace Global Index

> 唯一事实来源：`_bmad-output/`
>
> 开发总结与维护文档落点：`docs/01开发人员手册/`

## Directory Tree

```text
Prorise_ai_teach_workspace/
├─ AGENTS.md
├─ ARCHITECTURE.md
├─ INDEX.md
├─ _bmad-output/
│  ├─ INDEX.md
│  ├─ brainstorming/
│  ├─ implementation-artifacts/
│  ├─ planning-artifacts/
│  └─ research/
├─ contracts/
├─ docs/
│  └─ 01开发人员手册/
│     └─ 0000-AI快速导航索引.md
├─ mocks/
├─ packages/
│  ├─ INDEX.md
│  ├─ student-web/
│  ├─ fastapi-backend/
│  ├─ RuoYi-Vue-Plus-5.X/
│  └─ ruoyi-plus-soybean/
└─ references/
   ├─ INDEX.md
   ├─ OpenMAIC/
   └─ manim-to-video-claw/
```

## Files

- **[AGENTS.md](./AGENTS.md)** - 工作约定、事实源与目录职责说明
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 架构入口导航文件
- **[README.md](./README.md)** - 项目总览与快速开始说明
- **[package.json](./package.json)** - 根脚本与工作区命令配置
- **[pnpm-workspace.yaml](./pnpm-workspace.yaml)** - pnpm Monorepo 工作区定义

## Key Directories

### _bmad-output/

- **[INDEX.md](./_bmad-output/INDEX.md)** - BMAD 输出总入口与唯一事实源导航
- **[planning-artifacts/index.md](./_bmad-output/planning-artifacts/index.md)** - PRD、UX、架构与 Epic 的分片入口
- **[implementation-artifacts/](./_bmad-output/implementation-artifacts/)** - Story 文件与 Sprint 状态快照
- **[research/](./_bmad-output/research/)** - 补充技术研究与外部审计记录

### docs/

- **[01开发人员手册/0000-AI快速导航索引.md](./docs/01开发人员手册/0000-AI快速导航索引.md)** - 开发手册快速导航入口
- **[01开发人员手册/](./docs/01开发人员手册/)** - 开发总结、规范、环境与模块说明文档

### contracts/

- **[README.md](./contracts/README.md)** - 契约资产目录入口与版本、命名规则
- **[_shared/](./contracts/_shared/)** - 共享版本、错误码与状态枚举规则

### mocks/

- **[README.md](./mocks/README.md)** - Mock 资产目录入口与状态规则
- **[_shared/](./mocks/_shared/)** - 共享 Mock 状态与命名规则

### packages/

- **[INDEX.md](./packages/INDEX.md)** - 主代码工作区总索引
- **[student-web/](./packages/student-web/)** - 学生端 React 19 应用
- **[fastapi-backend/](./packages/fastapi-backend/)** - FastAPI + LangGraph 后端
- **[RuoYi-Vue-Plus-5.X/](./packages/RuoYi-Vue-Plus-5.X/)** - Java 管理后台后端基座
- **[ruoyi-plus-soybean/](./packages/ruoyi-plus-soybean/)** - Vue 管理端前端基座与内部共享包工作区

### references/

- **[INDEX.md](./references/INDEX.md)** - 参考项目与照抄来源总索引
- **[OpenMAIC/](./references/OpenMAIC/)** - 多智能体互动课堂参考项目
- **[manim-to-video-claw/](./references/manim-to-video-claw/)** - Manim 视频生成流水线参考项目

## Usage Order

1. 先查 `_bmad-output/`，确认需求、架构与 Story 事实。
2. 再查 `contracts/` 与 `mocks/`，确认契约和 Mock 事实。
3. 再查 `docs/01开发人员手册/0000-AI快速导航索引.md`，确认开发手册入口。
4. 进入 `packages/` 执行代码工作。
5. 需要借鉴实现时，再进入 `references/`。
