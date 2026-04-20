/**
 * Companion 智能侧栏领域类型。
 * Story 6.1/6.2 冻结：Ask 请求/响应、上下文来源、白板动作、持久化状态。
 */

/* ---------- 锚点上下文 ---------- */

export interface CompanionAnchor {
  /** 视频 task ID。 */
  taskId: string;
  /** 当前播放秒数。 */
  seconds: number;
  /** 当前 section 标题（可选）。 */
  sectionTitle?: string;
}

/* ---------- 上下文来源 ---------- */

export const COMPANION_CONTEXT_SOURCE_VALUES = [
  'redis',
  'local_file',
  'cos',
  'degraded',
] as const;

export type CompanionContextSource =
  (typeof COMPANION_CONTEXT_SOURCE_VALUES)[number];

/* ---------- 持久化状态 ---------- */

export const COMPANION_PERSISTENCE_STATUS_VALUES = [
  'complete_success',
  'whiteboard_degraded',
  'reference_missing',
  'partial_failure',
  'overall_failure',
] as const;

export type CompanionPersistenceStatus =
  (typeof COMPANION_PERSISTENCE_STATUS_VALUES)[number];

/* ---------- 白板动作 ---------- */

export const WHITEBOARD_ACTION_TYPE_VALUES = [
  'draw_function',
  'highlight_region',
  'animate_step',
  'draw_shape',
  'show_equation',
] as const;

export type WhiteboardActionType =
  (typeof WHITEBOARD_ACTION_TYPE_VALUES)[number];

export interface WhiteboardActionRecord {
  actionType: WhiteboardActionType;
  payload: Record<string, unknown>;
  renderUri?: string | null;
}

/* ---------- 请求 ---------- */

export interface CompanionAskRequest {
  sessionId: string;
  anchor: CompanionAnchor;
  questionText: string;
  parentTurnId?: string | null;
  frameBase64?: string | null;
}

/* ---------- 响应 ---------- */

export interface CompanionAskResponse {
  turnId: string;
  answerText: string;
  anchor: CompanionAnchor;
  whiteboardActions: WhiteboardActionRecord[];
  sourceRefs: Record<string, unknown>[];
  persistenceStatus: CompanionPersistenceStatus;
  contextSourceHit: CompanionContextSource;
}

/* ---------- Bootstrap ---------- */

export interface CompanionBootstrapResponse {
  taskId: string;
  sessionId: string;
  contextSource: CompanionContextSource;
  knowledgePoints: string[];
  topicSummary: string;
}

/* ---------- 侧栏交互状态 ---------- */

export const COMPANION_INTERACTION_STATE_VALUES = [
  'empty',
  'asking',
  'first_ask',
  'follow_up',
  'whiteboard_success',
  'whiteboard_degraded',
  'service_unavailable',
] as const;

export type CompanionInteractionState =
  (typeof COMPANION_INTERACTION_STATE_VALUES)[number];

/* ---------- Mock 场景 ---------- */

export const COMPANION_MOCK_SCENARIO_VALUES = [
  'first_ask',
  'follow_up',
  'whiteboard_success',
  'whiteboard_degraded',
  'no_context_degraded',
  'service_error',
] as const;

export type CompanionMockScenario =
  (typeof COMPANION_MOCK_SCENARIO_VALUES)[number];

export function isCompanionMockScenario(
  value: unknown,
): value is CompanionMockScenario {
  return COMPANION_MOCK_SCENARIO_VALUES.some((s) => s === value);
}

/* ---------- 对话轮次 ---------- */

export interface CompanionTurn {
  turnId: string;
  questionText: string;
  answerText: string;
  anchor: CompanionAnchor;
  whiteboardActions: WhiteboardActionRecord[];
  persistenceStatus: CompanionPersistenceStatus;
  timestamp: number;
}
