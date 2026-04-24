/**
 * 智能体动作联合类型。
 * 对应 OpenMAIC lib/types/action.ts，精简去除 Deep Interactive Mode 相关类型。
 *
 * 已删除：白板（wb_*）所有动作类型——产品决策移除白板功能。
 */

export interface ActionBase {
  id: string;
  title?: string;
  description?: string;
}

// 即发即忘类动作
export interface SpotlightAction extends ActionBase {
  type: 'spotlight';
  elementId: string;
  dimOpacity?: number;
}

export interface LaserAction extends ActionBase {
  type: 'laser';
  elementId: string;
  color?: string;
}

// 同步类动作（必须等待完成）
export interface SpeechAction extends ActionBase {
  type: 'speech';
  text: string;
  audioId?: string;
  audioUrl?: string;
  voice?: string;
  speed?: number;
}

export interface DiscussionAction extends ActionBase {
  type: 'discussion';
  topic: string;
  prompt?: string;
  agentId?: string;
}

export type Action =
  | SpotlightAction
  | LaserAction
  | SpeechAction
  | DiscussionAction;

export type ActionType = Action['type'];

export const FIRE_AND_FORGET_ACTIONS: ActionType[] = ['spotlight', 'laser'];

export const SYNC_ACTIONS: ActionType[] = ['speech', 'discussion'];
