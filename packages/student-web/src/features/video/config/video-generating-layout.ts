/**
 * 文件说明：视频等待页的压缩式展示布局配置。
 * 把后端 10 段流水线阶段压缩成用户真正可消费的 3 个高层阶段。
 */
import type { TaskLifecycleStatus } from '@/types/task';
import type { VideoPipelineStage } from '@/types/video';

export const VIDEO_GENERATING_LAYOUT_STAGE_KEYS = [
  'summary',
  'storyboard',
  'renderFlow',
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
    key: 'storyboard',
    labelKey: 'video.generating.stageTabs.storyboard',
    statusKey: 'video.generating.stageStatus.storyboard',
    subtitleKey: 'video.generating.stageSubtitles.storyboard',
  },
  {
    key: 'renderFlow',
    labelKey: 'video.generating.stageTabs.renderFlow',
    statusKey: 'video.generating.stageStatus.renderFlow',
    subtitleKey: 'video.generating.stageSubtitles.renderFlow',
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
  if (
    status === 'completed' ||
    status === 'cancelled' ||
    currentStage === 'render' ||
    currentStage === 'render_verify' ||
    currentStage === 'manim_fix' ||
    currentStage === 'compose' ||
    currentStage === 'upload'
  ) {
    return 'renderFlow';
  }

  if (
    currentStage === 'solve' ||
    currentStage === 'storyboard' ||
    currentStage === 'manim_gen' ||
    currentStage === 'tts'
  ) {
    return 'storyboard';
  }

  return 'summary';
}
