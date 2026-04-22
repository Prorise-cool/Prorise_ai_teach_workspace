/**
 * 智能体动作联合类型。
 * 对应 OpenMAIC lib/types/action.ts，精简去除 Deep Interactive Mode 相关类型。
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

export interface WbOpenAction extends ActionBase {
  type: 'wb_open';
}

export interface WbDrawTextAction extends ActionBase {
  type: 'wb_draw_text';
  elementId?: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
}

export interface WbDrawShapeAction extends ActionBase {
  type: 'wb_draw_shape';
  elementId?: string;
  shape: 'rectangle' | 'circle' | 'triangle';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
}

export interface WbDrawLatexAction extends ActionBase {
  type: 'wb_draw_latex';
  elementId?: string;
  latex: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

export interface WbDrawLineAction extends ActionBase {
  type: 'wb_draw_line';
  elementId?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed';
  points?: ['', 'arrow'] | ['arrow', ''] | ['arrow', 'arrow'] | ['', ''];
}

export interface WbClearAction extends ActionBase {
  type: 'wb_clear';
}

export interface WbDeleteAction extends ActionBase {
  type: 'wb_delete';
  elementId: string;
}

export interface WbCloseAction extends ActionBase {
  type: 'wb_close';
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
  | WbOpenAction
  | WbDrawTextAction
  | WbDrawShapeAction
  | WbDrawLatexAction
  | WbDrawLineAction
  | WbClearAction
  | WbDeleteAction
  | WbCloseAction
  | DiscussionAction;

export type ActionType = Action['type'];

export const FIRE_AND_FORGET_ACTIONS: ActionType[] = ['spotlight', 'laser'];

export const SYNC_ACTIONS: ActionType[] = [
  'speech',
  'wb_open',
  'wb_draw_text',
  'wb_draw_shape',
  'wb_draw_latex',
  'wb_draw_line',
  'wb_clear',
  'wb_delete',
  'wb_close',
  'discussion',
];
