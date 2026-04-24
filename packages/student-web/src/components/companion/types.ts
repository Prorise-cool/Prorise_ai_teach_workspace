/**
 * 共享 Companion 侧栏类型定义。
 *
 * Phase 4：把视频侧原 `features/video/components/companion-sidebar-v2.tsx`
 * 的 VideoPlayer 耦合去掉，抽象成 adapter + context snapshot + 可选回调。
 * 课堂与视频两侧共用同一套 UI，各自注入领域数据。
 */

/** 问答一次 ask 的上下文快照（由 consumer 在发送前即时拼装）。 */
export interface CompanionContextSnapshot {
  /** 当前画面/场景的结构化描述（课堂侧为 build-classroom-context 产物）。 */
  text?: string;
  /** 当前画面帧的 base64（视频侧截帧用；课堂侧传 undefined）。 */
  imageBase64?: string | null;
  /** 领域特定的锚点信息，透传给底层 API adapter（视频侧是 {taskId, seconds, sectionTitle}）。 */
  metadata?: Record<string, unknown>;
}

/** Companion UI 侧看到的 ask 请求（由 consumer 的 adapter 负责实际发到后端）。 */
export interface CompanionAskParams {
  questionText: string;
  contextSnapshot: CompanionContextSnapshot;
  abortSignal?: AbortSignal;
}

/** Companion 的回复事件流（当前 MVP 只支持 one-shot text；后续可扩展 text_delta）。 */
export type CompanionEvent =
  | { type: 'text'; content: string }
  | { type: 'error'; message: string };

/**
 * Adapter：把一次 ask 变成异步可迭代事件流。
 * 视频侧包装 `companion-adapter.ask()`，课堂侧包装 `classroom-adapter.streamChat()`。
 */
export interface CompanionDataAdapter {
  ask(params: CompanionAskParams): AsyncIterable<CompanionEvent>;
}

/** Quick tag（侧栏下方的快捷问题）。 */
export interface CompanionQuickAction {
  /** 按钮可读标签。 */
  label: string;
  /** 可读的图标元素（已挂 size className 的 lucide icon 或自绘 svg）。 */
  icon?: React.ReactNode;
  /** 点击后直接作为问题发送。 */
  prompt: string;
}

/** 视觉主题。`amber` 与视频端品牌一致；`indigo` 是课堂侧（冷色）。 */
export type CompanionTheme = 'amber' | 'indigo';
