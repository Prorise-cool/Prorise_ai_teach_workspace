# Story 6.2: 视频页 Companion 侧栏接入真实数据

Status: ready-for-dev

## Story

As a 正在学习的用户，
I want 在视频播放页看到基于当前播放时间点的 Companion 侧栏实时更新，
So that 我能围绕"现在这一秒"精准提问。

## Acceptance Criteria

1. Companion 侧栏锚点区显示当前播放时间点（如"T=01:23"）和对应 section 标题，播放进度变化时实时更新。
2. 用户在输入框输入问题并发送后，请求携带当前 `anchor`（`video_timestamp` + 时间秒数）发送到 Ask API（mock handler），侧栏显示用户消息气泡和 AI 回答气泡。
3. Mock 模式下至少演示 6 种状态：空态、首轮提问成功、连续追问、白板成功、白板降级、服务不可用。
4. 追问过程中视频播放不被打断，用户仍可继续看视频。

## Tasks / Subtasks

- [ ] CompanionSidebar 组件重构（AC: 1, 2, 4）
  - [ ] 新增 props：`currentTime: number`、`activeSection: { sectionId: string; title: string; startTime: number; endTime: number } | null`
  - [ ] 替换硬编码锚点文本为动态计算：`T={mm:ss} / {sectionId} / {sectionTitle}`
  - [ ] 移除 `readOnly` textarea 限制，接入受控输入状态
  - [ ] 发送按钮绑定 `onAsk` 回调，传递 `{ question_text, anchor }` 给父组件
- [ ] Ask API adapter + mock handler（AC: 2, 3）
  - [ ] 在 `packages/student-web/src/features/video/api/` 创建 `companion-adapter.ts`
  - [ ] 定义 `askCompanion(request: AskRequest): Promise<AskResponse>` 函数
  - [ ] 实现 mock handler：根据 question_text 特征返回不同场景的 mock 数据
  - [ ] Mock handler 支持模拟延迟（500-1500ms）以模拟真实网络
- [ ] 聊天消息状态管理（AC: 2, 3）
  - [ ] 定义 `CompanionMessage` 类型：`{ role: 'user' | 'assistant'; content: string; whiteboardActions?: []; timestamp: number }`
  - [ ] 使用 `useState` 管理消息列表（`CompanionMessage[]`）
  - [ ] 渲染用户消息气泡（右对齐）和 AI 回答气泡（左对齐 + markdown 渲染）
- [ ] 6 种交互状态闭环（AC: 3）
  - [ ] 空态：仅显示锚点区和输入框，无聊天记录
  - [ ] 首轮提问成功：用户消息 + AI 回答（persistence_status=complete_success）
  - [ ] 连续追问：第二条用户消息 + AI 回答（含 parent_turn_id 引用）
  - [ ] 白板成功：AI 回答中含 whiteboard_actions 渲染区
  - [ ] 白板降级：AI 回答标注降级状态，退回纯文本
  - [ ] 服务不可用：显示错误提示 + 重试按钮
- [ ] video-result-page 集成（AC: 1, 4）
  - [ ] 将 `playbackState.currentTimeSeconds` 和 `activeSection` 传入 CompanionSidebar
  - [ ] 确认侧栏交互不影响视频播放（事件隔离）
- [ ] 快速标签交互（AC: 2）
  - [ ] "没听懂"标签 → 自动填入"这段没听懂，请更通俗地解释"
  - [ ] "举个例子"标签 → 自动填入"请举个例子说明"
  - [ ] "画板演示"标签 → 自动填入"请用画板演示这个过程"

### Story Metadata

- Story ID: `6.2`
- Story Type: `Frontend Story`
- Epic: `Epic 6`
- Depends On: `6.1` 契约
- Blocks: 无
- FRs: FR-CP-001、FR-CP-002
- UX-DRs: UX-DR-010、UX-DR-014、UX-DR-015、UX-DR-016

## Dev Notes

### 已有代码起点

- `companion-sidebar.tsx` 已有完整 UI 壳层：header（品牌 + 主题切换 + 菜单）、anchor 区、chat 区（硬编码 mock 气泡）、input-area（快速标签 + textarea + 工具栏 + 发送按钮）
- `video-result-page.tsx` 已挂载 `<CompanionSidebar isOpen={companionOpen} onClose={...} />`，且已跟踪 `playbackState.currentTimeSeconds` 和计算 `activeSection`（通过 `getActivePlaybackSection()`）
- 当前 CompanionSidebar 缺少 `currentTime` 和 `activeSection` props，需要补充

### 关键文件映射

```
packages/student-web/src/features/video/
├── components/
│   └── companion-sidebar.tsx          ← 重构：接收新 props + 状态管理
├── pages/
│   └── video-result-page.tsx          ← 传递 currentTime + activeSection
├── api/
│   └── companion-adapter.ts           ← 新建：Ask API adapter + mock handler
└── mocks/
    └── companion-turns.mock.ts        ← 新建：5 种场景 mock 数据（来自 Story 6.1）
```

### 状态管理策略

- 使用组件内 `useState` + `useCallback` 管理聊天状态
- 不引入全局 store（Companion 状态局部于视频结果页）
- Mock 模式通过环境变量或 feature flag 控制：`import.meta.env.VITE_USE_MOCK === 'true'`

### 技术约束

- 不改动视频播放器组件内部逻辑
- 侧栏提问/回答期间视频继续播放不暂停（UX-DR-016）
- 所有文案使用 i18n（`useAppTranslation`）
- CSS 类名遵循现有 `xm-companion__*` 命名规范
- textarea 支持回车发送（Shift+Enter 换行）

### References

- [Source: _bmad-output/planning-artifacts/epics/23-epic-6.md#Story 6.2]
- [Source: packages/student-web/src/features/video/components/companion-sidebar.tsx]
- [Source: packages/student-web/src/features/video/pages/video-result-page.tsx]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/09-8-companion-layer-ux会话伴学层.md]
