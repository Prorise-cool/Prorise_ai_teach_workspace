/**
 * 文件说明：视频流水线 stage → 中文失败说明映射（Story 4.7）。
 * 集中管理 failedStage → 用户可读中文说明，便于后续 i18n 扩展。
 */
import type { VideoPipelineStage } from '@/types/video';

/** failedStage → 用户可读中文失败说明。 */
const STAGE_FAILURE_LABELS: Record<VideoPipelineStage, string> = {
  understanding: '题目理解失败',
  storyboard: '分镜生成失败',
  manim_gen: '动画脚本生成失败',
  manim_fix: '动画脚本修复失败',
  render: '动画渲染失败',
  tts: '语音合成失败',
  compose: '视频合成失败',
  upload: '视频上传失败',
};

/**
 * 根据失败阶段返回用户可读中文说明。
 *
 * @param failedStage - 失败所在阶段。
 * @returns 中文失败说明；未匹配时返回通用说明。
 */
export function getStageFailureLabel(failedStage: VideoPipelineStage | null | undefined): string {
  if (!failedStage) {
    return '视频生成失败';
  }

  return STAGE_FAILURE_LABELS[failedStage] ?? '视频生成失败';
}
