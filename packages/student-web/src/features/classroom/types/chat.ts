/**
 * 聊天与多智能体讨论相关类型。
 *
 * Wave 1：ChatRequest 与 FastAPI classroom.chat 后端 schema 对齐
 * （新增 agents / classroomContext / languageDirective），把原先
 * 各 hook 内自带的 `as any` 收口到类型层。
 */

import type { AgentProfile } from './agent';
import type { ClassroomChatContextPayload } from '../utils/build-classroom-context';

export type SessionType = 'qa' | 'discussion';
export type SessionStatus = 'idle' | 'active' | 'interrupted' | 'completed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  agentName?: string;
  agentAvatar?: string;
  agentColor?: string;
  createdAt: number;
  isStreaming?: boolean;
}

/**
 * 多智能体讨论请求体。
 *
 * - `messages`：完整对话历史（user + assistant）。
 * - `agents`：参与本轮讨论的智能体档案。
 * - `classroomContext`：把当前场景与课程上下文摘成一行字符串，供
 *   Director 理解学生提问的语境（与后端 ChatRequest.classroom_context
 *   字段对齐）。
 * - `storeState` / `config`：历史字段，保留以兼容旧版后端。
 */
export interface ChatRequest {
  messages: Array<Pick<ChatMessage, 'role' | 'content' | 'agentId'>>;
  agents?: AgentProfile[];
  /**
   * Phase 4：支持两种形式 —— 旧 str（向下兼容旧前端）或结构化
   * `ClassroomChatContextPayload`（后端 Pydantic Union 承接）。
   */
  classroomContext?: string | ClassroomChatContextPayload;
  languageDirective?: string;
  storeState?: {
    classroomId: string;
    currentSceneId: string | null;
  };
  config?: {
    agentIds: string[];
    sessionType: SessionType;
  };
  /** 任务 ID（broker 频道键）。 */
  taskId?: string;
}

/**
 * Phase 4 · 共享 Companion 侧栏向 classroom-adapter 发起 ask 时的参数。
 * 只带问题文本 + 上下文 payload（classroomContext 结构化形式）+ taskId/session。
 */
export interface CompanionAskParams {
  questionText: string;
  classroomContext: ClassroomChatContextPayload;
  agents?: AgentProfile[];
  languageDirective?: string;
  taskId?: string;
  /** 会话历史（若 consumer 愿意维护），省略则只发当前问题。 */
  history?: Array<Pick<ChatMessage, 'role' | 'content' | 'agentId'>>;
}

/** SSE 事件流事件类型 */
export type ChatEvent =
  | { type: 'agent_start'; data: { messageId: string; agentId: string; agentName: string; agentAvatar?: string; agentColor?: string } }
  | { type: 'text_delta'; data: { content: string; messageId?: string } }
  | { type: 'agent_end'; data: { messageId: string; agentId: string } }
  | { type: 'thinking'; data: { stage: 'director' | 'agent_loading'; agentId?: string } }
  | { type: 'done'; data: { totalAgents: number; totalTurns: number } }
  | { type: 'error'; data: { message: string } };

