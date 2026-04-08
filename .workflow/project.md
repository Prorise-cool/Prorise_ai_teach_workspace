# Project: 小麦 - AI 教学视频智能体

## What This Is

小麦是一个面向高职学生和教师的 AI 教学视频智能体平台。用户可以通过文本或图片输入题目，系统自动生成教学讲解视频；也可以输入主题，生成包含幻灯片、讨论和白板的完整课堂。平台还提供会话伴学、证据溯源和学习巩固等能力。

## Core Value

**一键生成教学视频与课堂** —— 用户只需输入题目或主题，系统自动完成理解、分镜、渲染、合成全链路，产出可直接用于教学的高质量视频或课堂内容。

## Requirements

### Validated

- [x] 用户认证与登录态管理（Epic 1）
- [x] 首页课堂直达入口与顶栏导航分发（Epic 1）
- [x] 用户配置系统（个人简介与学习偏好）（Epic 1）
- [x] 统一任务框架、SSE 与 Provider 基础设施（Epic 2）
- [x] 视频任务创建与等待页主链路（Epic 3 Story 3.5）
- [x] RuoYi 持久化承接与业务表（Epic 10）

### Active

- [ ] 视频输入页壳层与多模态输入交互（Epic 3）
- [ ] 视频生成流水线与结果消费（Epic 4）
- [ ] 主题课堂学习闭环（Epic 5）

### Out of Scope

- 移动端原生应用 —— 当前聚焦 Web SPA，移动端通过响应式适配
- 离线模式 —— 所有功能依赖在线 AI 能力
- 多租户 SaaS —— 当前为单租户部署

## Context

项目采用双后端架构：FastAPI 负责功能执行与 AI 编排，RuoYi 负责业务持久化与管理后台。前端为 React 19 SPA，使用 Tailwind CSS 4 和 shadcn/ui 组件体系。

当前处于 MVP 阶段，Epic 0/1/2/10 已完成，Epic 3/4/5 进行中。视频创建主链路已打通，正在推进视频生成流水线和课堂闭环。

## Constraints

- **技术栈**: React 19 + FastAPI + RuoYi Spring Boot，不可随意引入新框架
- **认证真值**: 来自 RuoYi 真实配置，不由前端 mock 假设
- **契约稳定**: contracts/ 采用 x.y.z 版本语义，破坏性变更必须新建版本目录
- **样式体系**: theme.css 只承载设计令牌，feature 私有样式放 features/*/styles/

## Tech Stack

- **Language**: TypeScript 5.9 / Python 3.11+ / Java 21
- **Framework**: React 19 + Vite 6 / FastAPI 0.115+ / Spring Boot 3.5
- **Database**: MySQL (RuoYi) / Redis (运行态)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 双后端架构 | FastAPI 擅长 AI 编排，RuoYi 擅长业务持久化 | 已落地 |
| 统一 SSE 事件集 | 八类公开事件，支持断线恢复 | 已落地 |
| Video/Classroom Engine 独立 | 生成链路保持独立，共享基础设施 | 已落地 |
| Story 1.5 语义纠偏 | 从"老师风格选择"修正为"用户配置系统" | 已落地 |

## Stakeholders

- 高职学生 —— 主要用户，通过视频和课堂学习
- 高职教师 —— 内容创作者，使用平台生成教学资源
- 管理员 —— 后台管理，用户与内容审核

---
*Last updated: 2026-04-08 after initialization*