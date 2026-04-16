/**
 * 文件说明：视频等待页的 6 段式展示布局配置。
 * 把后端 10 段流水线阶段映射到设计稿里的 6 个高层阶段，供页面导航与内容编排复用。
 */
import type { TaskLifecycleStatus } from '@/types/task';
import type { VideoPipelineStage } from '@/types/video';

export const VIDEO_GENERATING_LAYOUT_STAGE_KEYS = [
  'summary',
  'steps',
  'storyboard',
  'assets',
  'renderFlow',
  'compose',
] as const;

export type VideoGeneratingLayoutStageKey =
  (typeof VIDEO_GENERATING_LAYOUT_STAGE_KEYS)[number];

export interface VideoGeneratingLayoutStageConfig {
  key: VideoGeneratingLayoutStageKey;
  labelKey: string;
  statusKey: string;
  subtitleKey: string;
}

export const VIDEO_GENERATING_LAYOUT_STAGES: readonly VideoGeneratingLayoutStageConfig[] = [
  {
    key: 'summary',
    labelKey: 'video.generating.stageTabs.summary',
    statusKey: 'video.generating.stageStatus.summary',
    subtitleKey: 'video.generating.stageSubtitles.summary',
  },
  {
    key: 'steps',
    labelKey: 'video.generating.stageTabs.steps',
    statusKey: 'video.generating.stageStatus.steps',
    subtitleKey: 'video.generating.stageSubtitles.steps',
  },
  {
    key: 'storyboard',
    labelKey: 'video.generating.stageTabs.storyboard',
    statusKey: 'video.generating.stageStatus.storyboard',
    subtitleKey: 'video.generating.stageSubtitles.storyboard',
  },
  {
    key: 'assets',
    labelKey: 'video.generating.stageTabs.assets',
    statusKey: 'video.generating.stageStatus.assets',
    subtitleKey: 'video.generating.stageSubtitles.assets',
  },
  {
    key: 'renderFlow',
    labelKey: 'video.generating.stageTabs.renderFlow',
    statusKey: 'video.generating.stageStatus.renderFlow',
    subtitleKey: 'video.generating.stageSubtitles.renderFlow',
  },
  {
    key: 'compose',
    labelKey: 'video.generating.stageTabs.compose',
    statusKey: 'video.generating.stageStatus.compose',
    subtitleKey: 'video.generating.stageSubtitles.compose',
  },
] as const;

export function getLayoutStageConfig(
  key: VideoGeneratingLayoutStageKey,
): VideoGeneratingLayoutStageConfig {
  return (
    VIDEO_GENERATING_LAYOUT_STAGES.find((stage) => stage.key === key) ??
    VIDEO_GENERATING_LAYOUT_STAGES[0]
  );
}

export function resolveVideoGeneratingLayoutStage(
  currentStage: VideoPipelineStage | null,
  status: TaskLifecycleStatus,
): VideoGeneratingLayoutStageKey {
  if (status === 'completed' || status === 'cancelled' || currentStage === 'compose' || currentStage === 'upload') {
    return 'compose';
  }

  if (
    currentStage === 'render' ||
    currentStage === 'render_verify' ||
    currentStage === 'manim_fix'
  ) {
    return 'renderFlow';
  }

  if (currentStage === 'tts') {
    return 'assets';
  }

  if (currentStage === 'storyboard' || currentStage === 'manim_gen') {
    return 'storyboard';
  }

  if (currentStage === 'solve') {
    return 'steps';
  }

  return 'summary';
}
