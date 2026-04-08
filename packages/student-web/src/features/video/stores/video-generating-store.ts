/**
 * 文件说明：视频等待页状态机 store（Story 4.7）。
 * 使用 zustand 管理等待页全部 UI 状态，包括 SSE 驱动的阶段进度、
 * 修复指示器、降级轮询标志和终态信息。
 * 不使用 persist 中间件——状态恢复依赖 SSE snapshot 或 status 查询。
 */
import { create } from 'zustand';

import { readRecord } from '@/lib/type-guards';
import type { TaskLifecycleStatus, TaskSnapshot } from '@/types/task';
import {
  isVideoPipelineStage,
  type VideoPipelineStage,
} from '@/types/video';

/** 等待页任务错误信息。 */
export interface VideoGeneratingError {
  /** 错误码。 */
  errorCode: string | null;
  /** 用户可读错误消息。 */
  errorMessage: string | null;
  /** 失败所在阶段。 */
  failedStage: VideoPipelineStage | null;
  /** 是否可重试。 */
  retryable: boolean;
}

/** 等待页状态机状态。 */
export interface VideoGeneratingState {
  /** 当前任务 ID。 */
  taskId: string | null;
  /** 当前流水线阶段。 */
  currentStage: VideoPipelineStage | null;
  /** 当前阶段显示名（i18n key，消费端使用 t(stageLabel) 获取翻译文案）。 */
  stageLabel: string;
  /** 全局进度（0–100）。 */
  progress: number;
  /** 任务生命周期状态。 */
  status: TaskLifecycleStatus;
  /** 是否已经由 snapshot 或事件恢复过运行态。 */
  hasHydratedRuntime: boolean;
  /** 错误信息（仅 failed 时有值）。 */
  error: VideoGeneratingError | null;
  /** SSE 是否已连接。 */
  sseConnected: boolean;
  /** 是否已降级到轮询。 */
  degradedToPolling: boolean;
  /** 当前修复尝试次数（manim_fix 阶段）。 */
  fixAttempt: number;
  /** 修复尝试上限。 */
  fixTotal: number;
}

/** 等待页状态机 actions。 */
export interface VideoGeneratingActions {
  /** 更新进度和阶段信息。 */
  updateProgress: (payload: {
    progress: number;
    currentStage?: VideoPipelineStage | null;
    stageLabel?: string;
    message?: string;
  }) => void;
  /** 更新阶段（含修复上下文）。 */
  updateStage: (payload: {
    currentStage: VideoPipelineStage;
    stageLabel: string;
    progress: number;
    fixAttempt?: number;
    fixTotal?: number;
  }) => void;
  /** 标记任务失败。 */
  setFailed: (error: VideoGeneratingError) => void;
  /** 标记任务完成。 */
  setCompleted: () => void;
  /** 从任务快照恢复当前状态。 */
  restoreSnapshot: (snapshot: TaskSnapshot) => void;
  /** 标记已降级到轮询。 */
  setDegradedPolling: (degraded: boolean) => void;
  /** 标记 SSE 连接状态。 */
  setSseConnected: (connected: boolean) => void;
  /** 重置为初始状态。 */
  resetState: (taskId?: string) => void;
}

const INITIAL_STATE: VideoGeneratingState = {
  taskId: null,
  currentStage: null,
  stageLabel: 'video.generating.preparing',
  progress: 0,
  status: 'pending',
  hasHydratedRuntime: false,
  error: null,
  sseConnected: false,
  degradedToPolling: false,
  fixAttempt: 0,
  fixTotal: 2,
};

/** 视频等待页状态机 store。 */
export const useVideoGeneratingStore = create<
  VideoGeneratingState & VideoGeneratingActions
>()((set) => ({
  ...INITIAL_STATE,

  updateProgress: (payload) =>
    set((state) => ({
      status: 'processing',
      progress: payload.progress,
      currentStage: payload.currentStage ?? state.currentStage,
      stageLabel: payload.stageLabel ?? state.stageLabel,
      hasHydratedRuntime: true,
    })),

  updateStage: (payload) =>
    set({
      status: 'processing',
      currentStage: payload.currentStage,
      stageLabel: payload.stageLabel,
      progress: payload.progress,
      hasHydratedRuntime: true,
      fixAttempt: payload.fixAttempt ?? 0,
      fixTotal: payload.fixTotal ?? 2,
    }),

  setFailed: (error) =>
    set({
      status: 'failed',
      hasHydratedRuntime: true,
      error,
    }),

  setCompleted: () =>
    set({
      status: 'completed',
      progress: 100,
      stageLabel: 'video.generating.completed',
      hasHydratedRuntime: true,
      error: null,
    }),

  restoreSnapshot: (snapshot) =>
    set(() => {
      const snapshotStageValue = snapshot.currentStage ?? snapshot.stage;
      const snapshotStage = isVideoPipelineStage(snapshotStageValue)
        ? snapshotStageValue
        : null;
      const snapshotStageLabel =
        snapshot.stageLabel ?? snapshot.currentStage ?? snapshot.stage ?? undefined;
      const snapshotContext = readRecord(snapshot.context) ?? null;
      const baseState = {
        ...INITIAL_STATE,
        taskId: snapshot.taskId,
        hasHydratedRuntime: true,
        fixAttempt:
          typeof snapshotContext?.attemptNo === 'number' ? snapshotContext.attemptNo : 0,
        fixTotal:
          typeof snapshotContext?.fixTotal === 'number' ? snapshotContext.fixTotal : 2,
      };

      if (snapshot.status === 'completed') {
        return {
          ...baseState,
          status: 'completed' as const,
          progress: 100,
          currentStage: snapshotStage ?? null,
          stageLabel: snapshotStageLabel ?? 'video.generating.completed',
        };
      }

      if (snapshot.status === 'failed' || snapshot.status === 'cancelled') {
        return {
          ...baseState,
          status: snapshot.status,
          progress: snapshot.progress,
          currentStage: snapshotStage ?? null,
          stageLabel: snapshotStageLabel ?? 'video.generating.preparing',
          error: {
            errorCode: snapshot.errorCode ?? null,
            errorMessage: snapshot.message ?? null,
            failedStage: snapshotStage ?? null,
            retryable: false,
          },
        };
      }

      return {
        ...baseState,
        status: snapshot.status === 'pending' ? 'pending' : 'processing',
        progress: snapshot.progress,
        currentStage: snapshotStage ?? null,
        stageLabel: snapshotStageLabel ?? 'video.generating.preparing',
        error: null,
      };
    }),

  setDegradedPolling: (degraded) =>
    set({ degradedToPolling: degraded }),

  setSseConnected: (connected) =>
    set({ sseConnected: connected }),

  resetState: (taskId) =>
    set({ ...INITIAL_STATE, taskId: taskId ?? null }),
}));
