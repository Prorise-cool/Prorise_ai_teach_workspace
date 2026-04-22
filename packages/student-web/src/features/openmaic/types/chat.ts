/**
 * 聊天与多智能体讨论相关类型。
 */

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

export interface ChatRequest {
  messages: ChatMessage[];
  storeState: {
    classroomId: string;
    currentSceneId: string | null;
  };
  config: {
    agentIds: string[];
    sessionType: SessionType;
  };
}

/** SSE 事件流事件类型 */
export type ChatEvent =
  | { type: 'agent_start'; data: { messageId: string; agentId: string; agentName: string; agentAvatar?: string; agentColor?: string } }
  | { type: 'text_delta'; data: { content: string; messageId?: string } }
  | { type: 'agent_end'; data: { messageId: string; agentId: string } }
  | { type: 'thinking'; data: { stage: 'director' | 'agent_loading'; agentId?: string } }
  | { type: 'done'; data: { totalAgents: number; totalTurns: number } }
  | { type: 'error'; data: { message: string } };

/** 课堂笔记条目 */
export interface LectureNoteEntry {
  sceneId: string;
  sceneTitle: string;
  sceneOrder: number;
  items: LectureNoteItem[];
  completedAt: number;
}

export type LectureNoteItem =
  | { kind: 'speech'; text: string }
  | { kind: 'action'; type: string; label?: string };
