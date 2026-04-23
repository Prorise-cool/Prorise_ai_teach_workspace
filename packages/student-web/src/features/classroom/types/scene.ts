/**
 * 场景类型定义（与 FastAPI openmaic backend schemas.py 对齐）。
 *
 * scene.type 作为运行时 discriminator；content 结构由 type 决定。
 */

import type { Action } from './action';

export type SceneType = 'slide' | 'quiz' | 'interactive' | 'pbl';

export type StageMode = 'autonomous' | 'playback';

/** 场景大纲（Stage 1 产出） */
export interface SceneOutline {
  id: string;
  type: SceneType;
  title: string;
  description?: string;
  keyPoints?: string[];
  teachingObjective?: string;
  estimatedDuration?: number;
  order: number;
  suggestedImageIds?: string[];
  languageNote?: string;
}

/** 幻灯片内容：背景 + 绝对定位元素数组 */
export interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'latex';
  left: number;
  top: number;
  width: number;
  height: number;
  content: string | null;
  extra?: Record<string, unknown>;
}

export interface SlideContent {
  background?: { type?: string; color?: string };
  elements?: SlideElement[];
}

/** 测验内容 */
export interface QuizOption {
  id: string;
  label: string; // "A" | "B" | ...
  content: string;
}

export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  stem: string;
  options?: QuizOption[];
  correctAnswers?: string[];
  explanation?: string;
  points?: number;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

/** 交互式（iframe srcDoc 或 URL） */
export interface InteractiveContent {
  html?: string;
  url?: string;
}

/** 项目制学习 */
export interface PBLIssue {
  id: string;
  title: string;
  description: string;
  assigneeRole?: string;
}

export interface PBLContent {
  projectTitle?: string;
  projectOverview?: string;
  issues?: PBLIssue[];
}

export type SceneContent = SlideContent | QuizContent | InteractiveContent | PBLContent;

/** Stage 元数据 */
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

/** 单个场景 —— 后端真实 shape */
export interface Scene {
  id: string;
  type: SceneType;
  title: string;
  content: SceneContent;
  actions?: Action[];
  outline?: SceneOutline;
  /** 前端渲染时注入的 1-based 序号（后端不发 order）。 */
  order?: number;
  stageId?: string;
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
