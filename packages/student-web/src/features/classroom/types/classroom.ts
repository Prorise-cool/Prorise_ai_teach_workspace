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
  taskId?: string; // FastAPI 后端任务 ID（Wave 1: 统一 task framework 命名）
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

/** 后端任务状态（与 FastAPI openmaic job_runner.py 对齐） */
export type JobStatus =
  | 'pending'
  | 'generating_outline'
  | 'generating_scenes'
  | 'running'
  | 'ready'
  | 'completed'
  | 'failed';

export interface ClassroomJobResponse {
  taskId: string;
  status: JobStatus;
  /** 完成状态下后端回传的完整课堂 JSON（含 scenes / agents / outline 等）。 */
  classroom?: Record<string, unknown> & {
    id?: string;
    name?: string;
    requirement?: string;
    generatedAt?: number;
    scenes?: unknown[];
    agents?: unknown[];
  };
  /** 历史字段，保留兼容。 */
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
