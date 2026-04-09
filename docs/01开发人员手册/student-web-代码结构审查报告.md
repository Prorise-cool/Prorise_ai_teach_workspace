# Student Web 前端代码结构审查报告

> 审查日期: 2026-04-09 | 审查范围: `packages/student-web/src/` | 组件行数阈值: 300 行

---

## 1. 总览

| 指标 | 数值 |
|------|------|
| 技术栈 | React 19 + Vite 6 + TailwindCSS 4 + Zustand 5 + TanStack Query 5 + Radix UI + React Router 7 + TypeScript 5.9 |
| 源文件数（.ts/.tsx/.vue） | 221 |
| 总行数 | 31,244 |
| Feature 模块数 | 5 |
| 超过 300 行的文件 | **22 个** |
| 超过 500 行的文件 | **3 个** |
| 超过 1000 行的文件 | **2 个** |

---

## 2. 超标文件清单

### 2.1 严重超标（>500 行）

| 优先级 | 文件路径 | 行数 | 类型 | 核心问题 |
|--------|----------|------|------|----------|
| **P0** | `services/sse/index.ts` | **1130** | 服务层 | SSE 解析、Mock/Real 流、重连逻辑全混一起 |
| **P1** | `services/api/adapters/auth-adapter.ts` | **573** | 适配器 | 登录/注册/验证码 + 映射函数混合 |
| - | `app/i18n/resources/entry-page-content.ts` | **1306** | i18n 数据 | 翻译数据文件，可接受 |

### 2.2 超过 300 行的源文件（非测试/非数据）

| 优先级 | 文件路径 | 行数 | 问题 |
|--------|----------|------|------|
| **P1** | `features/home/components/landing-contact.tsx` | 479 | 表单+提交+验证混合 |
| **P1** | `services/api/client.ts` | 474 | HTTP + 加密 + 认证混合 |
| **P2** | `components/navigation/global-top-nav.tsx` | 413 | 桌面/移动端一个组件 |
| **P2** | `services/api/adapters/video-public-adapter.ts` | 407 | 重复的 fallback 逻辑 |
| **P2** | `features/auth/components/require-auth-route.tsx` | 373 | 6 个 useEffect 管理多个关注点 |
| **P2** | `features/profile/api/profile-api.ts` | 369 | API + fallback 混合 |
| **P2** | `features/video/components/video-input-card.tsx` | 350 | 拖放+粘贴+验证全在一个组件 |
| **P2** | `shared/feedback/feedback-provider.tsx` | 328 | Toast + Spotlight + LoadingBar 三合一 |
| **P2** | `features/auth/pages/login-page.tsx` | 328 | 布局 + 业务逻辑混合 |
| **P2** | `services/api/adapters/task-adapter.ts` | 324 | 适配器，结构尚可 |
| **P2** | `components/community-feed/community-feed.tsx` | 308 | 动画内联 |
| **P2** | `features/video/pages/video-generating-page.tsx` | 301 | 进度+SSE+错误状态复杂编排 |

### 2.3 类型文件和测试文件（可接受范围）

| 文件 | 行数 | 说明 |
|------|------|------|
| `types/video.ts` | 372 | 类型定义，集中管理合理 |
| `features/auth/pages/login-page.test.tsx` | 467 | 测试文件，综合覆盖 |
| `features/video/pages/video-input-page.test.tsx` | 463 | 测试文件 |
| `services/api/adapters/auth-adapter.test.ts` | 392 | 测试文件 |
| `services/mock/fixtures/task.ts` | 495 | Mock 数据，集中管理合理 |
| `services/mock/fixtures/auth.ts` | 493 | Mock 数据 |

---

## 3. 超标文件详细拆分建议

### 3.1 `services/sse/index.ts` — 1130 行（最高优先级）

**当前职责**: SSE 事件解析 + Mock 流实现 + Real 流实现 + 重连/轮询 + 类型守卫

**建议拆分**:
```
services/sse/
├── index.ts              # 公共导出 + 类型定义
├── parsers.ts            # normalizeTaskEventPayload (~130行), parseSseMessages
├── mock-stream.ts        # createMockTaskEventStream, cloneMockEventSequence
├── real-stream.ts        # createRealTaskEventStream, streamPollingFallback
├── type-guards.ts        # isTaskEventName, isTaskLifecycleStatus 等
└── utils.ts              # buildTaskEventId, createAbortError 等
```

### 3.2 `services/api/adapters/auth-adapter.ts` — 573 行

**当前职责**: 9 个 API 函数 + 请求/响应映射 + 错误处理

**建议拆分**:
```
services/api/adapters/auth/
├── index.ts              # 公共导出
├── auth-mappers.ts       # mapRuoyiLoginToken, mapRuoyiUserInfo 等映射函数
├── auth-requests.ts      # requestCaptcha, requestRegisterEnabled 等请求函数
└── auth-adapter.ts       # 组合层，createRealAuthAdapter, createMockAuthAdapter
```

### 3.3 `services/api/client.ts` — 474 行

**当前职责**: HTTP 客户端 + 请求加密/解密 + 错误归一化 + 认证失败发射

**建议拆分**:
```
services/api/client/
├── index.ts              # createApiClient 导出
├── request-encryption.ts # 加密/解密辅助
├── response-parser.ts    # parseResponseBody
└── error-normalization.ts # parseErrorMessage
```

### 3.4 组件拆分建议

| 组件 | 行数 | 建议 |
|------|------|------|
| `landing-contact.tsx` | 479 | 提取 `useLandingContactSubmit` hook + 子组件 |
| `require-auth-route.tsx` | 373 | 提取 `useAuthValidation` + `useProfileCompletionCheck` hooks |
| `video-input-card.tsx` | 350 | 提取 `useVideoFileHandling` hook + `VideoImageUpload` 子组件 |
| `global-top-nav.tsx` | 413 | 拆为 `global-top-nav-desktop.tsx` + `global-top-nav-mobile.tsx` |
| `feedback-provider.tsx` | 328 | 提取 `useLoadingBar` hook |

---

## 4. 架构评估

### 4.1 当前目录结构

```
src/
├── app/                  # 应用入口（i18n, layouts, provider, router, routes）
├── components/           # 全局共享组件（ui, navigation, generating, input-page, community-feed）
├── features/             # Feature 模块
│   ├── auth/             # 认证（components, hooks, pages, schemas, shared, styles）
│   ├── classroom/        # 课堂（components, pages, styles）⚠️ 最简
│   ├── home/             # 首页（api, components, pages, schemas, shared, styles）
│   ├── profile/          # 个人（api, hooks, pages, schemas, shared, stores, styles）
│   └── video/            # 视频（components, config, constants, hooks, pages, schemas, stores, styles）
├── lib/                  # 工具库
├── services/             # 服务层（api, mock, sse, runtime）
├── shared/               # 共享模块（feedback, hooks）
├── stores/               # 全局状态（auth-session-store）
├── styles/               # 全局样式（tokens, globals, theme）
├── test/                 # 测试工具
└── types/                # 全局类型（auth, task, video）
```

### 4.2 Feature 模块一致性检查

| Feature | api | components | hooks | pages | schemas | stores | styles | shared |
|---------|-----|------------|-------|-------|---------|--------|--------|--------|
| auth | - | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| classroom | - | ✓ | - | ✓ | - | - | ✓ | - |
| home | ✓ | ✓ | - | ✓ | ✓ | - | ✓ | ✓ |
| profile | ✓ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| video | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |

**不一致点**:
- `classroom/` 缺少 hooks、schemas、shared、api、stores — 明显是早期阶段
- `video/` 和 `profile/` 有 stores（Zustand），但 `auth/` 的 store 放在全局 `/stores/`
- `home/` 缺少 hooks 文件夹
- `auth/` 和 `home/` 没有 `api/` 文件夹（auth 用 `/services/auth.ts`）

### 4.3 跨模块耦合分析

**发现双向依赖**:
- `auth` → `profile`（类型、store、API）— 登录后跳转个人设置
- `profile` → `auth`（组件、hooks、shared）— 需要 auth 上下文

**行业标准**: Feature 间不应直接导入，应通过 shared 层或事件机制解耦。

### 4.4 状态管理模式

| 状态类型 | 位置 | 模式 | 评价 |
|----------|------|------|------|
| Auth Session | `/stores/auth-session-store.ts` | 全局 Zustand + persist | ✓ 合理 |
| User Profile | `features/profile/stores/` | Feature co-located Zustand | ✓ 合理 |
| Video Generating | `features/video/stores/` | Feature co-located Zustand | ✓ 合理 |
| Server State | 各 feature hooks + TanStack Query | 分散在各 hooks | ✓ 合理 |

**评价**: 混合模式（全局 auth + Feature co-located）是行业推荐做法。

### 4.5 样式组织

**模式**: SCSS co-location + partials 分文件

```
feature-name/styles/
├── feature-page.scss          # @use partials
└── partials/
    ├── _feature-tokens.scss   # 设计 token
    ├── _feature-layout.scss   # 布局
    └── _feature-responsive.scss # 响应式
```

**评价**: 结构清晰，设计 token 集中在 `/styles/tokens/`。TailwindCSS 4 + SCSS 混用可接受但长期应统一。

### 4.6 测试覆盖

| 模块 | 单元测试 | 覆盖评估 |
|------|----------|----------|
| services/adapters | ✓ (5) | 良好 |
| services/sse | ✓ (1) | 良好 |
| features/auth | ✓ (pages + components) | 良好 |
| features/video | ✓ (pages + hooks) | 中等 |
| features/home | ✓ (api + pages) | 中等 |
| features/profile | ✓ (api + pages) | 中等 |
| features/classroom | ✓ (1 page) | **不足** |
| **components/** (全局) | - | **缺失** |
| shared/feedback | ✓ (1) | 良好 |

**测试盲区**:
- 全局 `components/` 下的组件（navigation, generating, input-page）无直接测试
- Feature 内组件大多通过 page 测试间接覆盖

---

## 5. 最佳实践对标（行业基准）

基于 2026 年 React + Vite + TypeScript 项目结构最佳实践调研：

### 5.1 行业标准 vs 当前状态

| 实践 | 行业标准 | 当前状态 | 符合度 |
|------|----------|----------|--------|
| **Feature-based 组织** | 按领域分组（Bulletproof React, FSD） | 已采用 feature/ 目录 | ✅ 符合 |
| **组件 < 200 行** | 单一职责，>200行拆分（Yakhilesh, Medium） | 多个组件 300-500 行 | ⚠️ 部分符合 |
| **服务文件 < 300 行** | 按功能拆分（OneUptime, CodeWithSeb） | SSE 1130行, client 474行 | ❌ 不符合 |
| **Feature 间无直接导入** | app → features → shared（CodeWithSeb） | auth ↔ profile 双向导入 | ⚠️ 部分违反 |
| **Barrel exports** | 每个 Feature 有 index.ts（Bulletproof React） | 仅 home 有，其他直接导入 | ⚠️ 部分符合 |
| **API 层集中化** | 每个 feature 有 api/ 或 service/（Pooja, Medium） | auth 无 api/，用全局 services/ | ⚠️ 部分符合 |
| **Mock/Real 切换模式** | Adapter 模式 + resolve（Bulletproof React） | 已实现，高度一致 | ✅ 符合 |
| **状态就近原则** | 全局状态 centralized + Feature 状态 co-located | auth 全局 + profile/video co-located | ✅ 符合 |
| **测试跟源码走** | 测试放在对应源码旁（Bulletproof React） | 已采用 .test.tsx 共存 | ✅ 符合 |
| **样式 co-location** | 样式放在组件旁（Bulletproof React） | 已采用 + partials | ✅ 符合 |
| **路径别名** | @/ 别名避免深层相对路径（DEV Community） | 已配置 @/ 别名 | ✅ 符合 |

### 5.2 关键行业建议引用

> "Split when component exceeds 200 lines. Probably doing too much. Hard to read and understand."
> — Yakhilesh, React Best Practices (2026)

> "Feature-first: colocate logic, UI, and types by feature. Barrel files (index.ts) define clear public APIs per folder."
> — DEV Community, A Practical React Project Structure (2025)

> "NEVER: shared/ → features/ (shared must not know about features). If feature A needs something from feature B, promote to shared."
> — Sebastian Sleczka, Modular Feature Design in React (2026)

> "The 2026 React stack: Vite + TypeScript + TanStack Query + Zustand + shadcn/ui + Tailwind."
> — PkgPulse, How to Set Up a Modern React Project (2026)

---

## 6. 改进建议总结

### 6.1 拆分优先级排序

| 优先级 | 文件 | 行数 | 建议操作 |
|--------|------|------|----------|
| **P0** | `services/sse/index.ts` | 1130 | 拆分为 5 个子模块 |
| **P1** | `services/api/adapters/auth-adapter.ts` | 573 | 拆分为 mappers + requests + adapter |
| **P1** | `services/api/client.ts` | 474 | 提取加密和错误处理模块 |
| **P1** | `features/home/components/landing-contact.tsx` | 479 | 提取表单 hook + 子组件 |
| **P2** | `features/auth/components/require-auth-route.tsx` | 373 | 提取 2 个自定义 hooks |
| **P2** | `features/video/components/video-input-card.tsx` | 350 | 提取文件处理 hook + 子组件 |
| **P2** | `components/navigation/global-top-nav.tsx` | 413 | 拆为 desktop + mobile |
| **P2** | `shared/feedback/feedback-provider.tsx` | 328 | 提取 loadingBar hook |

### 6.2 架构优化建议

1. **统一 Feature 内部结构** — 建立标准模板: `api/ | components/ | hooks/ | pages/ | schemas/ | stores/ | styles/ | shared/ | index.ts`
2. **解耦 auth ↔ profile** — 将共享逻辑提取到 `shared/` 层，禁止 Feature 间直接导入
3. **为每个 Feature 添加 barrel export** — 统一用 `index.ts` 定义公共 API
4. **合并 `services/auth.ts` 和 `auth-adapter.ts`** — 统一到 adapter 模式
5. **`components/generating/` 移入 `features/video/`** — TaskGeneratingView 是 video 特有的
6. **类型就近原则** — `types/video.ts` (372行) 考虑移入 `features/video/schemas/`

### 6.3 测试补充建议

| 优先级 | 模块 | 建议 |
|--------|------|------|
| **P0** | `components/navigation/` | 添加导航组件测试 |
| **P0** | `components/generating/` | 添加生成视图测试 |
| **P1** | `features/classroom/` | 补充 hooks、schemas |
| **P1** | `components/input-page/` | 添加共享输入页组件测试 |

---

## 7. 结论

前端项目架构**总体良好**：已采用 Feature-based 组织、Adapter 模式的 API 层、Zustand + TanStack Query 混合状态管理、SCSS co-location 样式方案。

**主要问题**:
1. **2 个文件过千行**（SSE 1130行、i18n 1306行），其中 SSE 必须拆分
2. **auth ↔ profile 双向依赖** 违反 Feature 隔离原则
3. **Feature 内部结构不一致**（classroom 过简，缺少 hooks/schemas）
4. **全局组件缺少测试**

**技术栈选型** 完全符合 2026 年行业标准（React 19 + Vite 6 + TanStack Query 5 + Zustand 5 + TailwindCSS 4），无需调整。核心改进方向是**文件拆分**和**Feature 边界治理**。
