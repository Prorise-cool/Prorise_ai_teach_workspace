/**
 * 文件说明：视频流水线 8 阶段映射配置（对齐 Story 4.1 pipeline-stages 契约）。
 * 定义 stage 枚举到 displayLabel、progress 区间与预估时长的对应关系。
 */
import type { VideoPipelineStage } from '@/types/video';

/** 视频流水线阶段配置。 */
export interface VideoStageConfig {
  /** 阶段枚举值。 */
  key: VideoPipelineStage;
  /** 阶段中文名称。 */
  label: string;
  /** progress 区间起点（含）。 */
  progressStart: number;
  /** progress 区间终点（含）。 */
  progressEnd: number;
  /** 预估时长范围（秒）。 */
  estimatedDuration: string;
  /** 是否为条件阶段。 */
  conditional: boolean;
  /** 日志标签。 */
  tag: string;
}

/**
 * 视频流水线 8 阶段配置（Story 4.1 冻结）。
 *
 * 区间定义（连续不重叠，总覆盖 0–100）：
 * - understanding:  0–12
 * - storyboard:    13–25
 * - manim_gen:     26–45
 * - manim_fix:     46–55 (conditional)
 * - render:        56–70
 * - tts:           71–84
 * - compose:       85–94
 * - upload:        95–100
 */
export const VIDEO_STAGES: readonly VideoStageConfig[] = [
  { key: 'understanding', label: '理解题目', progressStart: 0, progressEnd: 12, estimatedDuration: '3-8s', conditional: false, tag: 'Understanding' },
  { key: 'storyboard', label: '生成分镜', progressStart: 13, progressEnd: 25, estimatedDuration: '5-10s', conditional: false, tag: 'Storyboard' },
  { key: 'manim_gen', label: '生成动画脚本', progressStart: 26, progressEnd: 45, estimatedDuration: '8-20s', conditional: false, tag: 'Manim Gen' },
  { key: 'manim_fix', label: '修复动画脚本', progressStart: 46, progressEnd: 55, estimatedDuration: '5-15s', conditional: true, tag: 'Auto-Fix' },
  { key: 'render', label: '渲染动画', progressStart: 56, progressEnd: 70, estimatedDuration: '15-40s', conditional: false, tag: 'Render' },
  { key: 'tts', label: '生成旁白', progressStart: 71, progressEnd: 84, estimatedDuration: '8-20s', conditional: false, tag: 'TTS' },
  { key: 'compose', label: '合成视频', progressStart: 85, progressEnd: 94, estimatedDuration: '5-12s', conditional: false, tag: 'Compose' },
  { key: 'upload', label: '上传结果', progressStart: 95, progressEnd: 100, estimatedDuration: '3-10s', conditional: false, tag: 'Upload' },
] as const;

/** stage 枚举到配置的查找表。 */
const STAGE_MAP = new Map<VideoPipelineStage, VideoStageConfig>(
  VIDEO_STAGES.map((s) => [s.key, s]),
);

/**
 * 根据 stage 枚举值查找阶段配置。
 *
 * @param stage - 阶段枚举值。
 * @returns 匹配的阶段配置；未匹配时返回 null。
 */
export function getStageConfig(stage: VideoPipelineStage): VideoStageConfig | null {
  return STAGE_MAP.get(stage) ?? null;
}

/**
 * 根据进度值查找当前所在阶段。
 *
 * @param progress - 当前进度（0–100）。
 * @returns 匹配的阶段配置；未匹配时返回最后一个阶段。
 */
export function resolveVideoStage(progress: number): VideoStageConfig {
  const clamped = Math.max(0, Math.min(100, progress));

  for (const stage of VIDEO_STAGES) {
    if (clamped >= stage.progressStart && clamped <= stage.progressEnd) {
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

/**
 * 获取非条件阶段列表（用于日志渲染时排除条件阶段）。
 *
 * @returns 非条件阶段配置列表。
 */
export function getRequiredStages(): VideoStageConfig[] {
  return VIDEO_STAGES.filter((s) => !s.conditional);
}
