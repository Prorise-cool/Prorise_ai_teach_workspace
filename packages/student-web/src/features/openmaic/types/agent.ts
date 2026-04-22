/**
 * 智能体档案类型定义。
 */

export type AgentPersonality = 'efficient' | 'humorous' | 'patient' | 'serious';

/** 智能体颜色（对应 UI design token） */
export const AGENT_COLORS: Record<AgentPersonality, string> = {
  efficient: '#6D5DF4',
  humorous: '#FFB020',
  patient: '#00C48C',
  serious: '#0091FF',
};

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  persona: string;
  avatar: string;
  color: string;
  personality?: AgentPersonality;
  priority?: number;
  isGenerated?: boolean;
  allowedActions?: string[];
}

/** 用于创建请求的精简 Agent 描述 */
export interface AgentProfileRequest {
  requirement: string;
  sceneCount: number;
  style?: string;
}

/** 默认教师 agent */
export const DEFAULT_TEACHER_AGENT: AgentProfile = {
  id: 'teacher',
  name: '老师',
  role: '主讲教师',
  persona: '经验丰富、条理清晰、善用比喻',
  avatar: '',
  color: AGENT_COLORS.serious,
  personality: 'serious',
  priority: 1,
};
