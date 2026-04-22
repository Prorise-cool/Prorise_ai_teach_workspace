/**
 * 课堂场景相关类型定义。
 * 对应 OpenMAIC lib/types/stage.ts 中的核心类型，适配 Prorise 架构。
 */

export type SceneType = 'slide' | 'quiz' | 'interactive' | 'pbl';

export type StageMode = 'autonomous' | 'playback';

/** 场景提纲（Stage 1 生成结果） */
export interface SceneOutline {
  id: string;
  type: SceneType;
  title: string;
  description: string;
  order: number;
  estimatedDuration?: number; // 秒
}

/** 幻灯片内容场景 */
export interface SlideContent {
  type: 'slide';
  canvas: Record<string, unknown>; // Slide 数据结构（PPT canvas）
}

/** 测验内容场景 */
export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  question: string;
  options?: QuizOption[];
  answer?: string[];
  analysis?: string;
  commentPrompt?: string;
  hasAnswer?: boolean;
  points?: number;
}

/** 交互式场景（iframe 沙箱） */
export interface InteractiveContent {
  type: 'interactive';
  url?: string;
  html?: string;
}

/** 项目制学习场景 */
export interface PBLContent {
  type: 'pbl';
  projectConfig: Record<string, unknown>;
}

export type SceneContent = SlideContent | QuizContent | InteractiveContent | PBLContent;

/** 课堂 Stage（整个课程） */
export interface ClassroomStage {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  languageDirective?: string;
  style?: string;
  agentIds?: string[];
  generatedAgentConfigs?: AgentConfig[];
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  persona: string;
  avatar: string;
  color: string;
  priority: number;
}

/** 单个场景 */
export interface Scene {
  id: string;
  stageId: string;
  type: SceneType;
  title: string;
  order: number;
  content: SceneContent;
  actions?: import('./action').Action[];
  multiAgent?: {
    enabled: boolean;
    agentIds: string[];
    directorPrompt?: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

/** 播放状态 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'live' | 'completed';
