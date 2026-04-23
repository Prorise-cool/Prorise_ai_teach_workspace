/**
 * 场景类型定义（与 FastAPI classroom backend schemas.py 对齐）。
 *
 * scene.type 作为运行时 discriminator；content 结构由 type 决定。
 *
 * Wave 1：移除 'quiz' — quiz 渲染已下放给 learning_coach 模块，
 * 课堂主舞台不再嵌入测验场景。`features/classroom/types/quiz.ts`
 * 仍保留 QuizGradeRequest / QuizGradeResult 等类型，供 adapter 层
 * 桥接 learning_coach 自动评分服务。
 */

import type { Action } from './action';

export type SceneType = 'slide' | 'interactive' | 'pbl';

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

export type SceneContent = SlideContent | InteractiveContent | PBLContent;

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

/**
 * 场景基础字段。
 * Scene 通过 `type` 作为 discriminator，content 类型由 type 决定。
 * 直接消费场景 content 时应先 narrow scene.type 再访问 scene.content，
 * 避免 `as any` 强制断言。
 */
interface SceneBase {
  id: string;
  title: string;
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

export interface SlideScene extends SceneBase {
  type: 'slide';
  content: SlideContent;
}

export interface InteractiveScene extends SceneBase {
  type: 'interactive';
  content: InteractiveContent;
}

export interface PBLScene extends SceneBase {
  type: 'pbl';
  content: PBLContent;
}

/** 单个场景 —— 后端真实 shape，按 type discriminator 收紧 content 类型 */
export type Scene = SlideScene | InteractiveScene | PBLScene;

/** 播放状态 */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'live' | 'completed';
