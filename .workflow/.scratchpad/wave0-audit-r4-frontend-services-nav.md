# Wave 0 R4 — 前端 services/api + GlobalTopNav 统一性审计

## 总览

| 维度 | 状态 | 详情 |
|------|------|------|
| apiClient 使用 | ✓ 广泛 | video / profile / learning-* 等 9 个 features 用 fastapiClient 或 apiClient |
| 自建 fetch | ⚠️ P0 | openmaic-adapter.ts 三处 fetch SSE（lines 81/138/168）|
| SSE 客户端 | ⚠️ | video 用 services/sse/real-stream；openmaic 自建 fetch + AsyncGenerator |
| GlobalTopNav 引入 | ⚠️ P0 | 仅 5 页直接引入；classroom-input/video-input 通过 WorkspaceInputShell 间接引入 |
| entryNav.workspaceRoutes | ⚠️ P0 | 仅含 video/input + learning；classroom/input 被注释隐藏（entry-page-content.ts:77）|
| ASR | ✓ 统一 | useBrowserAsr 在 components/input-page/hooks 定义 |
| TTS/speechSynthesis | ⚠️ P1 | openmaic/hooks/use-action-player.ts 直接 window.speechSynthesis（line 157/193）|
| store/types 重复 | ⚠️ P1 | openmaic/types 与 types/task 概念重叠但目前独立无冲突 |

## entryNav.workspaceRoutes 当前状态

`packages/student-web/src/app/i18n/resources/entry-page-content.ts:78-89` 当前数组：

```typescript
workspaceRoutes: [
  { label: '单题讲解', href: '/video/input', icon: 'video' },
  { label: '学习中心', href: '/learning', icon: 'book-open' }
]
```

问题：
1. 注释阻塞（line 77）：`/* 「主题课堂」入口已从 nav 隐藏（/classroom/input 路由保留，但尚无完整逻辑）*/`
2. classroom 不在列表 — 但 classroom-input-page 已有完整逻辑
3. 依赖 i18n：被 video/classroom input pages 共享消费（classroom-input-page.tsx:67-69）

---

## 详细发现

### F1: features/openmaic — P0 重点

- HTTP 调用: 大部分用 fastapiClient ✅，三处直接 fetch 做 SSE ❌
  - openmaic-adapter.ts:81 streamSceneOutlines → fetch /generate/scene-outlines-stream
  - openmaic-adapter.ts:138 streamChat → fetch /chat
  - openmaic-adapter.ts:168 parsePdf → fetch /parse-pdf
  - 根因：fastapiClient response 不直接支持 ReadableStream，adapter 自建 parseSseStream（lines 49-73）
- SSE 客户端: ❌ 自建 AsyncGenerator，不用 services/sse/real-stream（无重连/无 polling fallback）
- GlobalTopNav: 
  - openmaic-classroom-page.tsx ❌ 未引入
  - openmaic-settings-page.tsx ✅ `links={[]} variant="surface"`
- TTS: ❌ use-action-player.ts:157/193 直接 window.speechSynthesis
- types 重复: openmaic/types/scene+agent+classroom+chat 与 types/task/video 概念重叠但独立

### F2: features/video — ✅ 模范

- HTTP: ✅ fastapiClient + services/api/adapters/video-*-adapter.ts
- SSE: ✅ use-video-task-sse.ts 调 services/sse/resolveTaskEventStream
- GlobalTopNav: 通过 WorkspaceInputShell 内部引入（components/input-page/workspace-input-shell.tsx:14）
- ASR: ✅ useBrowserAsr
- 错误: ✅ isApiClientError

### F3: features/classroom — ⚠️ 不完整

- HTTP: ClassroomInputPage 用 useClassroomCreate → openmaic-adapter（透传到 fastapiClient）
- GlobalTopNav: 通过 WorkspaceInputShell 间接引入
- ASR: ✅
- 持久化: 当前用 IndexedDB（classroom-db.ts），需迁后端 RuoYi（Wave 1）

### F4: features/home — ✅
- GlobalTopNav: home-page.tsx:150-152 variant="home"

### F5: features/learning-center — ✅
- GlobalTopNav: 多页面 variant="workspace"

### F6: features/profile — ✅
- HTTP: profile-api.ts 用 apiClient

### F7: features/learning-coach — 仅 pages 目录，无 API
### F8: features/auth — 登录页独立

---

## 推荐 Wave 0 热修清单

### [P0] entry-page-content.ts — 取消隐藏 classroom 入口
- 删除 line 77 注释
- 在 workspaceRoutes 数组**首位**插入 `{ label: '主题课堂', href: '/classroom/input', icon: 'layers' }`（icon 需在 WORKSPACE_ICON_MAP 注册）
- 工作量：5 min

### [P0] openmaic-adapter.ts SSE fetch 替换
- 三处 fetch 改用 services/sse/real-stream（或拆 services/sse/openmaic-stream.ts wrapper）
- 工作量：3-4h（要先研究 real-stream 接口形状是否兼容 openmaic 事件格式）

### [P0] openmaic-classroom-page.tsx 补 GlobalTopNav
- 参考 openmaic-settings-page.tsx:15
- 工作量：10 min

---

## 留到 Wave 1+ 的大重构

### [P1] openmaic types → 主类型系统统一
### [P1] TTS/speechSynthesis 库化（拆 useBrowserTts hook）
### [P1] GlobalTopNav 与 WorkspaceInputShell 导航对称性指南
### [P2] openmaic 引入 isApiClientError 错误处理

---

## 审计总结

| 指标 | 成熟度 |
|------|--------|
| apiClient 复用 | A |
| SSE 基础设施 | B（video 完美，openmaic 自建） |
| GlobalTopNav 覆盖 | C（input pages 通过 shell 补漏） |
| ASR/TTS | C（ASR 统一，TTS 分散） |
| types 管理 | C（openmaic 独立无冲突但不优雅） |
| 错误处理 | B |

关键阻塞：openmaic SSE fetch 自建 + GlobalTopNav 缺失（P0）+ entry-page-content 注释（配置）
