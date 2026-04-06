/**
 * 文件说明：视频生成六阶段映射配置。
 * 定义 progress 区间到阶段名称、图标标识与 i18n 键的对应关系。
 */

/** 视频生成阶段定义。 */
export interface VideoStage {
  /** 阶段标识键。 */
  key: string;
  /** 阶段中文名称。 */
  label: string;
  /** progress 区间起点（含）。 */
  min: number;
  /** progress 区间终点（含）。 */
  max: number;
  /** 对应日志标签。 */
  tag: string;
}

/**
 * 视频生成六阶段配置。
 *
 * 区间定义：
 * - 题目理解：0–10%
 * - 分镜生成：10–30%
 * - 动画生成：30–50%
 * - 沙箱渲染：50–60%
 * - 语音合成：60–80%
 * - 视频合成：80–100%
 */
export const VIDEO_STAGES: readonly VideoStage[] = [
  { key: 'understanding', label: '题目理解与知识库检索', min: 0, max: 10, tag: 'Understanding' },
  { key: 'storyboard', label: '分镜与代码生成', min: 10, max: 30, tag: 'Storyboard' },
  { key: 'animation', label: '动画生成', min: 30, max: 50, tag: 'Animation' },
  { key: 'sandbox', label: '沙箱渲染', min: 50, max: 60, tag: 'Sandbox' },
  { key: 'tts', label: '语音合成', min: 60, max: 80, tag: 'TTS' },
  { key: 'compositing', label: '视频合成', min: 80, max: 100, tag: 'Compositing' },
] as const;

/**
 * 根据进度值查找当前所在阶段。
 *
 * @param progress - 当前进度（0–100）。
 * @returns 匹配的阶段定义；未匹配时返回最后一个阶段。
 */
export function resolveVideoStage(progress: number): VideoStage {
  const clamped = Math.max(0, Math.min(100, progress));

  for (const stage of VIDEO_STAGES) {
    if (clamped >= stage.min && clamped <= stage.max) {
      return stage;
    }
  }

  return VIDEO_STAGES[VIDEO_STAGES.length - 1];
}

/**
 * 根据进度值估算预计剩余时间文案。
 *
 * @param progress - 当前进度（0–100）。
 * @returns 用户可读的剩余时间提示。
 */
export function estimateEtaText(progress: number): string {
  if (progress >= 100) {
    return '正在跳转到结果页...';
  }

  if (progress >= 90) {
    return '马上就好！即将为您展现最终内容...';
  }

  if (progress >= 60) {
    return '预计还需要 1 分钟';
  }

  if (progress >= 30) {
    return '预计还需要 2 分钟';
  }

  if (progress >= 10) {
    return '预计还需要 3 分钟';
  }

  return '初始化中，即将开始任务...';
}
