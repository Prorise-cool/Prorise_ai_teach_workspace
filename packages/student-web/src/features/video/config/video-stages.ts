/**
 * 文件说明：视频流水线 8 阶段映射配置（对齐 Story 4.1 pipeline-stages 契约）。
 * 定义 stage 枚举到 displayLabel、progress 区间与预估时长的对应关系。
 */
import type { VideoPipelineStage } from '@/types/video';

/** 视频流水线阶段配置。 */
export interface VideoStageConfig {
  /** 阶段枚举值。 */
  key: VideoPipelineStage;
  /** 阶段显示名称（i18n key，消费端使用 t(stage.label) 获取翻译文案）。 */
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
 * label 值为 i18n key，消费端通过 t(stage.label) 获取翻译文案。
 *
 * 区间定义（连续无间隙，总覆盖 0–100）：
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
  { key: 'understanding', label: 'video.stages.understanding', progressStart: 0, progressEnd: 12, estimatedDuration: '3-8s', conditional: false, tag: 'Understanding' },
  { key: 'storyboard', label: 'video.stages.storyboard', progressStart: 13, progressEnd: 25, estimatedDuration: '5-10s', conditional: false, tag: 'Storyboard' },
  { key: 'manim_gen', label: 'video.stages.manim_gen', progressStart: 26, progressEnd: 45, estimatedDuration: '8-20s', conditional: false, tag: 'Manim Gen' },
  { key: 'manim_fix', label: 'video.stages.manim_fix', progressStart: 46, progressEnd: 55, estimatedDuration: '5-15s', conditional: true, tag: 'Auto-Fix' },
  { key: 'render', label: 'video.stages.render', progressStart: 56, progressEnd: 70, estimatedDuration: '15-40s', conditional: false, tag: 'Render' },
  { key: 'tts', label: 'video.stages.tts', progressStart: 71, progressEnd: 84, estimatedDuration: '8-20s', conditional: false, tag: 'TTS' },
  { key: 'compose', label: 'video.stages.compose', progressStart: 85, progressEnd: 94, estimatedDuration: '5-12s', conditional: false, tag: 'Compose' },
  { key: 'upload', label: 'video.stages.upload', progressStart: 95, progressEnd: 100, estimatedDuration: '3-10s', conditional: false, tag: 'Upload' },
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
 * 使用 Math.floor 将浮点进度映射为整数，消除阶段间的间隙。
 *
 * @param progress - 当前进度（0–100）。
 * @returns 匹配的阶段配置；未匹配时返回最后一个阶段。
 */
export function resolveVideoStage(progress: number): VideoStageConfig {
  const clamped = Math.floor(Math.max(0, Math.min(100, progress)));

  for (const stage of VIDEO_STAGES) {
    if (clamped >= stage.progressStart && clamped <= stage.progressEnd) {
      return stage;
    }
  }

  return VIDEO_STAGES[VIDEO_STAGES.length - 1];
}

/**
 * 根据进度值估算预计剩余时间的 i18n key。
 * 返回 i18n key，由消费端使用 t(key) 获取翻译文案。
 *
 * @param progress - 当前进度（0–100）。
 * @returns 对应的 i18n key。
 */
export function estimateEtaText(progress: number): string {
  if (progress >= 100) {
    return 'video.generating.redirecting';
  }

  if (progress >= 90) {
    return 'video.eta.almostDone';
  }

  if (progress >= 60) {
    return 'video.eta.aboutOneMinute';
  }

  if (progress >= 30) {
    return 'video.eta.aboutTwoMinutes';
  }

  if (progress >= 10) {
    return 'video.eta.aboutThreeMinutes';
  }

  return 'video.eta.initializing';
}

/**
 * 获取非条件阶段列表（用于日志渲染时排除条件阶段）。
 *
 * @returns 非条件阶段配置列表。
 */
export function getRequiredStages(): VideoStageConfig[] {
  return VIDEO_STAGES.filter((s) => !s.conditional);
}

/** 日志条目类型（供等待页日志面板使用）。 */
export interface StageLogItem {
  id: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  text: string;
  tag?: string;
}

/**
 * 根据当前阶段和进度构建日志列表。
 *
 * @param currentStage - 当前阶段枚举值。
 * @param progress - 全局进度（0-100）。
 * @param labelFn - 文案生成函数，接收 stage label 和是否完成标志，返回显示文本。
 * @returns 日志列表。
 */
export function buildStageLog(
  currentStage: string | null,
  progress: number,
  labelFn: (label: string, completed: boolean) => string,
): StageLogItem[] {
  const logs: StageLogItem[] = [];
  let passedCurrent = false;

  for (const stage of VIDEO_STAGES) {
    if (passedCurrent) {
      break;
    }

    if (currentStage === stage.key) {
      passedCurrent = true;
      logs.push({
        id: stage.key,
        status: 'pending',
        text: labelFn(stage.label, false),
        tag: stage.tag,
      });
    } else if (progress > stage.progressEnd) {
      logs.push({
        id: stage.key,
        status: 'success',
        text: labelFn(stage.label, true),
        tag: stage.tag,
      });
    }
    // 还没到这个阶段，且不是条件阶段 -> 不显示
  }

  return logs;
}
