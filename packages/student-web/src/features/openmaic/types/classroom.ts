/**
 * 课堂元数据与顶层结构类型。
 */
import type { Scene, ClassroomStage } from './scene';

export type ClassroomStatus = 'generating' | 'ready' | 'failed';

/** 课堂完整结构（存入 IndexedDB） */
export interface Classroom {
  id: string;
  name: string;
  requirement: string;
  generatedAt: number;
  updatedAt: number;
  status: ClassroomStatus;
  stage: ClassroomStage;
  scenes: Scene[];
  agents: AgentSummary[];
  jobId?: string; // FastAPI 后端任务 ID
}

/** 轻量元数据（用于列表展示） */
export interface ClassroomMeta {
  id: string;
  name: string;
  requirement: string;
  generatedAt: number;
  status: ClassroomStatus;
  sceneCount: number;
  thumbnail?: string; // 第一个场景缩略图 URL
}

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
}

/** 后端任务状态 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ClassroomJobResponse {
  jobId: string;
  status: JobStatus;
  classroomId?: string;
  progress?: number;
  message?: string;
  error?: string;
}

/** 生成请求体 */
export interface ClassroomCreateRequest {
  requirement: string;
  pdfText?: string;
  enableWebSearch?: boolean;
  agentIds?: string[];
}
