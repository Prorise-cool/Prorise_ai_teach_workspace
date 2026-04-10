/**
 * 文件说明：视频流水线 stage → i18n 失败说明 key 映射（Story 4.7）。
 * 集中管理 failedStage → i18n key，由调用方通过 t(key) 获取翻译文本。
 */
import type { VideoPipelineStage } from '@/types/video';

/** failedStage → i18n key 映射。 */
const STAGE_FAILURE_KEYS: Record<VideoPipelineStage, string> = {
  understanding: 'video.stageFailures.understanding',
  solve: 'video.stageFailures.solve',
  storyboard: 'video.stageFailures.storyboard',
  manim_gen: 'video.stageFailures.manim_gen',
  tts: 'video.stageFailures.tts',
  manim_fix: 'video.stageFailures.manim_fix',
  render: 'video.stageFailures.render',
  render_verify: 'video.stageFailures.render_verify',
  compose: 'video.stageFailures.compose',
  upload: 'video.stageFailures.upload',
};

/**
 * 根据失败阶段返回对应的 i18n key。
 * 调用方使用 t(key) 获取翻译文本。
 *
 * @param failedStage - 失败所在阶段。
 * @returns i18n key；未匹配时返回通用失败 key。
 */
export function getStageFailureKey(failedStage: VideoPipelineStage | null | undefined): string {
  if (!failedStage) {
    return 'video.stageFailures.fallback';
  }

  return STAGE_FAILURE_KEYS[failedStage] ?? 'video.stageFailures.fallback';
}
