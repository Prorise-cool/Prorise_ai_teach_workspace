# 技术架构讨论记录：OpenMAIC 融合方案

**日期**: 2026-03-19
**参与者**: Prorise + Mary (Business Analyst)
**状态**: 讨论中，**非最终决策**

---

## 一、讨论背景

### 1.1 起因
Prorise 发现清华的 OpenMAIC 项目（AGPL-3.0 协议），该项目是多 Agent 协作的 AI 教学视频生成平台，与现有的 ManimToVideoClaw 项目存在技术互补性。

### 1.2 目标
探索如何将 OpenMAIC 的核心能力融入现有项目，同时保持商业化路径（ToC + ToB）的可行性。

### 1.3 现有项目
| 项目 | 技术栈 | 核心能力 |
|------|--------|----------|
| **ManimToVideoClaw** | Python FastAPI + Manim | 高质量 3B1B 风格视频渲染 |
| **OpenMAIC** | Next.js + LangGraph | 多 Agent 协作 + 两阶段生成流水线 |

---

## 二、核心讨论议题

### 议题 1: OpenMAIC 的技术栈问题

**发现**:
- OpenMAIC 后端采用 Next.js API Routes（前后端一体化）
- OpenMAIC 前端组件可复用，但设计风格技术化、深色系

**讨论结论**:
- ❌ Next.js 不适合做"纯前端"——失去了 SSR 优势，复杂度却没减少
- ✅ OpenMAIC 的价值在于**代码逻辑**（LangGraph + 流水线），而非技术栈
- ✅ 应该提取其核心逻辑，用 FastAPI 重构后端

### 议题 2: ManimToVideoClaw 的定位

**发现**:
- ManimToVideoClaw 目前是 4 个独立 FastAPI 服务（scenext-forwarding/storyboard/scenext/manimtovideo）
- 部署在 4 个不同端口

**讨论结论**:
- ❌ 多个端口增加部署复杂度和网络延迟
- ✅ Python → Python 调用不应走 HTTP
- ✅ **建议合并为一个 FastAPI 应用，内部按包管理**
  - `packages/openmaic` - LangGraph + 流水线
  - `packages/manim` - Manim 渲染器

### 议题 3: ToB 管理端的技术选型

**发现**:
- RuoYi-Vue-Plus (Java, 15,961 Stars) 提供成熟的多租户 + RBAC 管理后台
- 但其前端是 Vue 技术栈

**备选发现**:
- ruoyi-plus-soybean: React 版本的 RuoYi（907 Stars）
- 技术栈: React 19 + Vite + TypeScript + UnoCSS

**讨论结论**:
- ✅ 若采用 ruoyi-plus-soybean，可统一前端技术栈（全部 React）
- ✅ RuoYi-Vue-Plus 只做管理服务和基础设施，不做业务逻辑
- ⚠️ 需要确认 ruoyi-plus-soybean 的维护状态和功能完整性

### 议题 4: 前端结构

**问题**: ToC 用户端是否应该在 RuoYi 前端包内开发？

**分析**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| **A: 放在同一包内** | 复用登录/权限代码 | 风格冲突（管理后台深色/ToC浅色）、部署耦合 |
| **B: Monorepo 分离** | 完全隔离、独立部署、共享基础设施 | 需要新建项目 |

**讨论结论**:
- ⚠️ **推荐方案 B: Monorepo 分离**
- 共享: `ui-common` + `auth` + `api-client`
- 分离: `packages/admin` + `packages/user`
- 优势: 风格隔离、独立部署、未来可扩展 `packages/teacher`

---

## 三、当前最优方案（讨论中，非决策）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        架构方向（讨论中）                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                      前端 Monorepo (待确认)                                  │ │
│  │                                                                            │ │
│  │  packages/                                                                │ │
│  │  ├── ui-common/      ← 共享 UI 组件库                                     │ │
│  │  ├── auth/          ← 统一登录/RBAC 上下文                                 │ │
│  │  ├── api-client/    ← 对接两个后端                                         │ │
│  │  ├── admin/         ← 管理后台 (基于 ruoyi-plus-soybean 或 Vue 版)         │ │
│  │  └── user/          ← ToC 用户端 (品牌化新开发)                            │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                        │                                           │
│                      ┌─────────────────┴─────────────────┐                          │
│                      │                                   │                          │
│                      ▼                                   ▼                          │
│  ┌─────────────────────────────────┐   ┌────────────────────────────────────┐     │
│  │   RuoYi-Vue-Plus (Java)        │   │   OpenMAIC-FastAPI (Python)        │     │
│  │   Port: 8080                   │   │   Port: 8090                       │     │
│  │                                │   │                                    │     │
│  │   【管理服务】                  │   │   【功能微服务】                    │     │
│  │   ├─ 用户/租户                │   │   ├─ packages/openmaic/            │     │
│  │   ├─ RBAC 权限                │   │   │   │   (LangGraph + Pipeline)      │     │
│  │   ├─ 菜单/部门                │   │   │   │                              │     │
│  │   ├─ 日志/OSS                │   │   │   └─ packages/manim/             │     │
│  │   └─ 系统配置                  │   │   │       (Manim 渲染器)            │     │
│  │                                │   │   │                                │     │
│  └─────────────────────────────────┘   └────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 四、关键待确认事项

| 事项 | 优先级 | 说明 |
|------|--------|------|
| **ruoyi-plus-soybean 维护状态** | P0 | 907 Stars，需确认活跃度和功能完整性 |
| **Monorepo 方案可行性** | P1 | 是否值得为前后端分离建新项目 |
| **OpenMAIC FastAPI 重构工作量** | P1 | 移除 Next.js 前端，重构 API Routes |
| **用户体系打通方案** | P2 | 共享用户表 vs OAuth2/SSO |

---

## 五、决策分歧点（需后续决策）

| 分歧点 | 方案 A | 方案 B | 备注 |
|--------|--------|--------|------|
| **管理端前端技术** | ruoyi-plus-soybean (React) | RuoYi-Vue-Plus (Vue) | React 统一技术栈，但 Soybean 活跃度待确认 |
| **前端 Monorepo** | 新建独立项目 | 在 ruoyi-plus-soybean 内开发 | 风格隔离 vs 快速复用 |
| **OpenMAIC 部署** | 合并为单 FastAPI | 保持分离微服务 | 部署复杂度 vs 独立性 |

---

## 六、下一步行动

- [ ] 克隆并分析 ruoyi-plus-soybean，确认功能完整性和维护状态
- [ ] 详细评估 OpenMAIC FastAPI 重构工作量
- [ ] 设计用户体系打通的具体方案
- [ ] 评估 Monorepo 方案 vs 在现有项目内开发的复杂度

---

## 七、记录说明

> **本文件为讨论记录，不代表最终决策。**
> 所有架构决策需要在实际验证后确认。
> 请勿将本文档内容作为开发依据。

---

*最后更新: 2026-03-19*
*更新内容: 补充前端 Monorepo 讨论、ManimToVideoClaw 合并建议*
