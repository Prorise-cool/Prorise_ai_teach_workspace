---
stepsCompleted: [1, 2]
inputDocuments:
  - prd.md
  - product-brief-小麦-2026-03-22.md
  - ux-design-specification.md
  - market-AI教学视频智能体-research-2026-03-20.md
  - domain-AI教学视频智能体-2026-03-20.md
  - technical-AI教学视频智能体-research-2026-03-21.md
  - openmaic-issue-pr-audit-2026-03-23.md
  - brainstorming-session-2026-03-18-142300.md
  - M1里程碑-开发进度跟踪.md
  - 腾讯文档协作方案.md
  - references/INDEX.md
workflowType: 'architecture'
project_name: '小麦 - AI教学视频智能体'
user_name: 'Prorise'
date: '2026-03-24'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### 🔴 关键架构澄清：UI 风格 vs Agent 风格

> **开发者必读：这是最常被误解的架构决策，必须在开发前彻底理解。**

#### 错误理解（❌）

> "小麦有 4 种 CSS 主题，用户选择不同的 AI 老师时，整个页面切换为蓝色/橙色/绿色/紫色主题。"

#### 正确理解（✅）

**小麦的前端只有一种视觉设计风格** —— 小麦品牌设计系统（暖黄色主色 `#f5c547`），所有页面、所有组件统一使用。

**4 种 AI 老师（严肃/幽默/耐心/高效）的差异不在 UI 层面，而在业务数据层面**，通过 `AgentConfig` 数据预设实现：

| 差异维度 | 实现方式 | 所在层 | 前端开发者需要做什么 |
|----------|----------|--------|---------------------|
| **语气/用词/举例** | `AgentConfig.persona`（不同的 System Prompt） | 后端 LLM 调用 | **无需关注**，后端传入不同 prompt |
| **头像** | `AgentConfig.avatar`（不同的图片 URL 或 emoji） | 前端 Avatar 组件 | 根据 config 数据渲染不同头像 |
| **装饰色** | `AgentConfig.color`（如 `#4a6fa5`） | 前端局部点缀 | 用于头像边框、发言指示器、Agent 标签的 `borderColor`/`backgroundColor`，**仅限这些局部元素** |
| **TTS 语音** | Agent 关联的 TTS 参数（语速、音色、音调） | 后端 TTS 调用 | **无需关注**，后端根据风格选择 TTS 配置 |

#### 参考实现：OpenMAIC AgentConfig 模型

OpenMAIC 源码中（`lib/orchestration/registry/types.ts`），每个 Agent 是一个数据对象：

```typescript
// OpenMAIC AgentConfig 接口（参考设计模式，不直接复制代码）
interface AgentConfig {
  id: string;         // 唯一标识
  name: string;       // 显示名称
  role: string;       // 角色（teacher / student / assistant）
  persona: string;    // 完整的 System Prompt（决定语气、人格）
  avatar: string;     // 头像（emoji 或图片 URL）
  color: string;      // 装饰色（HEX）
  allowedActions: string[];  // 允许的动作
  priority: number;   // 发言优先级
}
```

OpenMAIC 的 6 个默认 Agent 全部使用**同一套 UI 组件**（`Roundtable`、`AgentAvatar`、`AgentBar`），差异仅体现在：
- 头像边框颜色：`style={{ borderColor: agent.color }}`
- 发言气泡的角色标识：根据 `role` 字段决定气泡位置（teacher 左侧 / student 右侧）
- 发言内容风格：由 `persona`（System Prompt）驱动 LLM 生成

**整个 OpenMAIC 前端没有 CSS 主题切换机制。**

#### 小麦的 4 种 AI 老师 = 4 个 AgentConfig 预设

| 风格 | `persona` 要点 | `avatar` | `color` | TTS 参数 |
|------|---------------|----------|---------|----------|
| **严肃型** | 专业严谨、逻辑清晰 | `/avatars/serious.png` | `#4a6fa5`（蓝） | 标准语速、正式音色 |
| **幽默型** | 轻松有趣、举例生动 | `/avatars/humorous.png` | `#ff9500`（橙） | 偏快语速、活泼音色 |
| **耐心型** | 步骤详细、反复解释 | `/avatars/patient.png` | `#52c41a`（绿） | 偏慢语速、温和音色 |
| **高效型** | 直击要点、省时高效 | `/avatars/efficient.png` | `#722ed1`（紫） | 快速语速、干练音色 |

用户在课堂/视频生成前通过下拉选择器选择风格，系统将对应的 `AgentConfig` 传入后端 LLM 和 TTS 流水线。

#### UX 规范中 CSS 变量的实际用途

UX 设计文稿第 7 节定义的 `--style-color` CSS 变量，用途范围**非常有限**：

```css
/* 仅用于局部装饰效果 */
.glow-effect { background-color: var(--style-color); }       /* 背景光晕（极低透明度） */
.chat-box:focus-within { border-color: var(--style-color); }  /* 输入框聚焦边框 */
```

这是当前选中 Agent 的"点缀色"，**不是页面级主题切换**。页面整体的背景（`#f5ede1`）、卡片（`#ffffff`）、文字（`#3b1701`）、按钮（`#f5c547`）、导航等元素在任何 Agent 风格下都保持不变。

---

### Requirements Overview

#### Functional Requirements

| 域 | FR 数量 | 核心需求 | 复用来源 |
|----|---------|----------|----------|
| **用户管理 (FR-UM)** | 4 | 注册/登录、JWT 共享 Redis 认证、个人资料、权限控制 | RuoYi 90% |
| **课堂服务 (FR-CS)** | 7 | 主题→课堂生成、Agent 风格选择（数据级预设）、幻灯片、测验、多 Agent 讨论、SSE 进度、白板 | OpenMAIC 70% |
| **视频服务 (FR-VS)** | 9 | 题目理解、分镜、Manim 代码生成/自动修复/渲染、多 TTS、视频合成、COS 上传、OCR | ManimToVideoClaw 80% |
| **视频播放器 (FR-VP)** | 4 | 播放/倍速/进度/全屏 | Video.js 封装 |
| **学习记录 (FR-LR)** | 3 | 历史记录、收藏管理、删除 | 全新开发 |
| **前端 UI (FR-UI)** | 6 | 首页双入口、课堂页（参考 Roundtable）、视频生成页、播放器页、个人中心、i18n | 组件复用 + 风格重写 |

**总计**：33 个功能需求

#### Non-Functional Requirements

| 类别 | NFR 数量 | 关键项 |
|------|----------|--------|
| **架构规范** | 6 | Feature-Sliced Design、Clean Architecture、Monorepo（pnpm workspace） |
| **技术选型** | 9 | React 19、FastAPI、Shadcn/ui、Zustand、Alova |
| **性能** | 8 | API P95 < 200ms、视频 P95 < 5min、FCP < 1.5s、可用性 ≥ 99% |
| **安全** | 6 | JWT 共享 Redis、HTTPS、API 限流、XSS 防护、内容审核 |
| **多 Agent** | 7 | Provider 抽象工厂、缓存策略、failover 降级 |
| **部署** | 3 | Linux 容器化、开发/生产环境分离 |
| **合规** | 4 | AGPL-3.0 合规、WCAG AA、隐私保护 |

**总计**：43+ 个非功能需求

---

### Scale & Complexity

| 维度 | 评估 | 说明 |
|------|------|------|
| **复杂度** | 高 | 双入口、双后端、多 Agent 编排、Manim 渲染、多外部服务集成 |
| **架构类型** | 全栈 Web App | React SPA + FastAPI + RuoYi Spring Boot + 腾讯云 |
| **团队规模** | 1-2 人 | 全栈开发 |
| **复用比例** | ~60% | OpenMAIC + ManimToVideoClaw + RuoYi |
| **关键约束** | 赛事截止 4/25 | 5 周内必须交付公测版 |
| **主要技术域** | 全栈（前端 + 双后端 + AI 服务编排） | |

---

### Technical Constraints & Dependencies

| 约束/依赖 | 架构影响 | 优先级 |
|-----------|----------|--------|
| **双入口松耦合** | 课堂服务与视频服务共享 LLM/TTS 抽象层，但业务逻辑独立、零直接 import | P0 |
| **Agent 风格 = 数据预设** | AgentConfig 数据模型统一管理，前端通过 config 属性渲染差异，不需要 CSS 主题系统 | P1 |
| **Manim 渲染低成功率** | Pass@1 约 60-80%，需 3 次自动修复流水线 + RAG 代码模板库 + 降级方案 | P0 |
| **双后端共存** | FastAPI（8090 功能服务）+ RuoYi（8080 管理服务），JWT 通过共享 Redis 验证，Nginx 统一路由 | P0 |
| **SSE 实时进度** | 课堂生成、视频渲染、多 Agent 讨论均走 SSE 流式推送 | P0 |
| **Provider 可插拔** | LLM（Gemini↔Claude）、TTS（豆包→百度→Spark→Kokoro）抽象工厂 + failover 链 | P1 |
| **AGPL-3.0 合规** | 参考 OpenMAIC 设计模式，不直接复制代码 | P0 |
| **RuoYi 不可修改** | 管理后端仅通过 API 对接，不修改其源码 | P0 |
| **腾讯云绑定** | COS（视频存储）、SCF（异步任务）、TencentDB，赛事基础设施 | P1 |

---

### Cross-Cutting Concerns Identified

| 关注点 | 涉及范围 | 说明 |
|--------|----------|------|
| **AgentConfig 数据管理** | 前端 Zustand store + 后端配置/数据库 | 前后端共享同一数据模型定义，Agent 预设通过配置管理 |
| **Provider 抽象层** | 后端课堂服务 + 视频服务 | LLM/TTS 的工厂模式 + failover 链 + 缓存策略，两个服务模块共享 |
| **错误恢复** | 后端全链路 | Manim 渲染 3 次自动修复、TTS failover、SSE 断线重连 |
| **国际化 (i18n)** | 前端所有页面 | react-i18next，W2 阶段集成，中/英双语 |
| **认证鉴权** | 前端 + FastAPI + RuoYi | JWT 共享 Redis，前端携带 token，FastAPI 从 Redis 验证，无 HTTP 调用 RuoYi |
| **日志与监控** | 后端全链路 | APM 链路追踪（request ID 贯穿），Error Budget 消耗监控 |

---

### UX Architectural Implications

| UX 要求 | 对开发者的具体含义 |
|---------|-------------------|
| **"输入即惊喜"核心体验** | 前端输入→后端生成→SSE 推送进度→结果呈现，端到端 P95 < 5min |
| **统一品牌风格** | 所有页面使用小麦品牌色系（暖黄 `#f5c547`），Shadcn/ui 组件库，不做多主题 |
| **Agent 头像/颜色差异** | 课堂页 Roundtable 组件中，不同 Agent 通过 `avatar` 和 `color` 字段区分，局部点缀而非全局主题 |
| **透明等待体验** | SSE 推送分阶段进度："理解题目 → 生成脚本 → 渲染动画 → 合成视频"，前端展示进度条 + 阶段文案 |
| **极简首页** | 双入口首页，智能推荐入口，不做复杂导航 |
| **B站式播放器** | Video.js 封装，倍速/进度/全屏，对标 B站交互习惯 |
| **毛玻璃材质** | Glassmorphism 效果（`backdrop-blur`），用于悬浮导航和核心对话框 |
| **WCAG AA 无障碍** | 色彩对比度 4.5:1、键盘导航、ARIA 标签、`prefers-reduced-motion` 媒体查询 |
