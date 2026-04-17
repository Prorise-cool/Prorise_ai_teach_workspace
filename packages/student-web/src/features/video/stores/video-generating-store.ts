/**
 * 文件说明：视频等待页状态机 store。
 * 同时管理全局任务状态与 section 级渐进 preview 状态，支持 snapshot/SSE/preview 三路汇合。
 */
import { create } from 'zustand';

import {
	readBooleanProperty,
	readNumberProperty,
	readRecord,
} from '@/lib/type-guards';
import type { TaskLifecycleStatus, TaskSnapshot } from '@/types/task';
import {
	isVideoPipelineStage,
	type VideoPipelineStage,
	type VideoPreviewSection,
	type VideoTaskPreview,
} from '@/types/video';

export interface VideoGeneratingError {
  errorCode: string | null;
  errorMessage: string | null;
  failedStage: VideoPipelineStage | null;
  retryable: boolean;
}

export interface VideoGeneratingState {
  taskId: string | null;
  currentStage: VideoPipelineStage | null;
  stageLabel: string;
  progress: number;
  status: TaskLifecycleStatus;
  hasHydratedRuntime: boolean;
  error: VideoGeneratingError | null;
  sseConnected: boolean;
  degradedToPolling: boolean;
  fixAttempt: number;
  fixTotal: number;
  previewAvailable: boolean;
  previewVersion: number;
  totalSections: number;
  summary: string;
  knowledgePoints: string[];
  sections: VideoPreviewSection[];
}

export interface VideoGeneratingActions {
  updateProgress: (payload: {
    progress: number;
    currentStage?: VideoPipelineStage | null;
    stageLabel?: string;
  }) => void;
  updateStage: (payload: {
    currentStage: VideoPipelineStage;
    stageLabel: string;
    progress: number;
    fixAttempt?: number;
    fixTotal?: number;
  }) => void;
  setFailed: (error: VideoGeneratingError) => void;
  setCompleted: () => void;
  restoreSnapshot: (snapshot: TaskSnapshot) => void;
  setPreview: (preview: VideoTaskPreview) => void;
  setPreviewSignal: (payload: {
    previewAvailable?: boolean;
    previewVersion?: number;
    totalSections?: number;
  }) => void;
  upsertSection: (section: Partial<VideoPreviewSection> & {
    sectionId: string;
    sectionIndex?: number;
    status?: VideoPreviewSection['status'];
    totalSections?: number;
  }) => void;
  setDegradedPolling: (degraded: boolean) => void;
  setSseConnected: (connected: boolean) => void;
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
  previewAvailable: false,
  previewVersion: 0,
  totalSections: 0,
  summary: '',
  knowledgePoints: [],
  sections: [],
};

function mergeSection(
  current: VideoPreviewSection | undefined,
  incoming: Partial<VideoPreviewSection> & { sectionId: string; sectionIndex?: number },
): VideoPreviewSection {
  return {
    sectionId: incoming.sectionId,
    sectionIndex: incoming.sectionIndex ?? current?.sectionIndex ?? 0,
    title: incoming.title ?? current?.title ?? '',
    lectureLines: incoming.lectureLines ?? current?.lectureLines ?? [],
    visualNotes: incoming.visualNotes ?? current?.visualNotes ?? [],
    status: incoming.status ?? current?.status ?? 'pending',
    audioUrl: incoming.audioUrl ?? current?.audioUrl ?? null,
    clipUrl: incoming.clipUrl ?? current?.clipUrl ?? null,
    errorMessage: incoming.errorMessage ?? current?.errorMessage ?? null,
    fixAttempt: incoming.fixAttempt ?? current?.fixAttempt ?? null,
    updatedAt: incoming.updatedAt ?? current?.updatedAt ?? new Date().toISOString(),
  };
}

function mergeSectionList(
  sections: VideoPreviewSection[],
  incoming: Partial<VideoPreviewSection> & { sectionId: string; sectionIndex?: number },
): VideoPreviewSection[] {
  const next = [...sections];
  const currentIndex = next.findIndex((section) => section.sectionId === incoming.sectionId);

  if (currentIndex >= 0) {
    next[currentIndex] = mergeSection(next[currentIndex], incoming);
  } else {
    next.push(mergeSection(undefined, incoming));
  }

  return next.sort((left, right) => left.sectionIndex - right.sectionIndex);
}

function readPreviewSignal(snapshot: TaskSnapshot) {
  const context = readRecord(snapshot.context) ?? null;

  return {
    previewAvailable: context ? readBooleanProperty(context, 'previewAvailable') : undefined,
    previewVersion: context ? readNumberProperty(context, 'previewVersion') : undefined,
  };
}

export const useVideoGeneratingStore = create<VideoGeneratingState & VideoGeneratingActions>()(
  (set) => ({
    ...INITIAL_STATE,

    updateProgress: ({ progress, currentStage, stageLabel }) =>
      set((state) => ({
        status: 'processing',
        progress,
        currentStage: currentStage ?? state.currentStage,
        stageLabel: stageLabel ?? state.stageLabel,
        hasHydratedRuntime: true,
      })),

    updateStage: ({ currentStage, stageLabel, progress, fixAttempt, fixTotal }) =>
      set((state) => ({
        status: 'processing',
        currentStage,
        stageLabel,
        progress,
        hasHydratedRuntime: true,
        fixAttempt: fixAttempt ?? state.fixAttempt,
        fixTotal: fixTotal ?? state.fixTotal,
      })),

    setFailed: (error) => set({ status: 'failed', hasHydratedRuntime: true, error }),

    setCompleted: () =>
      set({
        status: 'completed',
        progress: 100,
        stageLabel: 'video.generating.completed',
        hasHydratedRuntime: true,
        error: null,
      }),

    restoreSnapshot: (snapshot) =>
      set((state) => {
        const snapshotStageValue = snapshot.currentStage ?? snapshot.stage;
        const snapshotStage = isVideoPipelineStage(snapshotStageValue)
          ? snapshotStageValue
          : null;
        const snapshotStageLabel =
          snapshot.stageLabel ?? snapshot.currentStage ?? snapshot.stage ?? 'video.generating.preparing';
        const previewSignal = readPreviewSignal(snapshot);
        const sameTask = state.taskId === null || state.taskId === snapshot.taskId;
        const preservedPreview = sameTask
          ? {
              previewAvailable: state.previewAvailable,
              previewVersion: state.previewVersion,
              totalSections: state.totalSections,
              summary: state.summary,
              knowledgePoints: state.knowledgePoints,
              sections: state.sections,
            }
          : {
              previewAvailable: false,
              previewVersion: 0,
              totalSections: 0,
              summary: '',
              knowledgePoints: [],
              sections: [],
            };

        return {
          ...INITIAL_STATE,
          ...preservedPreview,
          taskId: snapshot.taskId,
          status: snapshot.status === 'pending' ? 'pending' : snapshot.status,
          progress: snapshot.status === 'completed' ? 100 : snapshot.progress,
          currentStage: snapshotStage,
          stageLabel: snapshot.status === 'completed' ? 'video.generating.completed' : snapshotStageLabel,
          hasHydratedRuntime: true,
          error:
            snapshot.status === 'failed' || snapshot.status === 'cancelled'
              ? {
                  errorCode: snapshot.errorCode ?? null,
                  errorMessage: snapshot.message ?? null,
                  failedStage: snapshotStage,
                  retryable: false,
                }
              : null,
          previewAvailable: previewSignal.previewAvailable ?? preservedPreview.previewAvailable,
          previewVersion: Math.max(
            preservedPreview.previewVersion,
            previewSignal.previewVersion ?? 0,
          ),
        };
      }),

    setPreview: (preview) =>
      set({
        previewAvailable: preview.previewAvailable,
        previewVersion: preview.previewVersion,
        totalSections: preview.totalSections,
        summary: preview.summary,
        knowledgePoints: preview.knowledgePoints,
        sections: preview.sections,
      }),

    setPreviewSignal: ({ previewAvailable, previewVersion, totalSections }) =>
      set((state) => ({
        previewAvailable: previewAvailable ?? state.previewAvailable,
        previewVersion: Math.max(state.previewVersion, previewVersion ?? 0),
        totalSections: Math.max(state.totalSections, totalSections ?? 0),
      })),

    upsertSection: ({ totalSections, ...section }) =>
      set((state) => ({
        totalSections: Math.max(state.totalSections, totalSections ?? 0),
        sections: mergeSectionList(state.sections, section),
      })),

    setDegradedPolling: (degraded) => set({ degradedToPolling: degraded }),
    setSseConnected: (connected) => set({ sseConnected: connected }),
    resetState: (taskId) => set({ ...INITIAL_STATE, taskId: taskId ?? null }),
  }),
);
