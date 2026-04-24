/**
 * 文件说明：视频侧任务等待页 Shell 薄封装。
 * Phase 2 重构：真正的布局 / 视觉层下沉到 `@/components/generating/TaskGeneratingShell`，
 * 这里只保留视频模块专属的 color scheme（amber）与文案默认值。
 */
import type { TaskGeneratingLogItem } from '@/components/generating';
import { TaskGeneratingShell } from '@/components/generating';

export type GeneratingLogItem = TaskGeneratingLogItem;

export type TaskGeneratingViewProps = {
  /** 任务主标题 */
  title: string;
  /** 剩余时间与细节文案 */
  etaText: string;
  /** 进度值 (0-100) */
  progress: number;
  /** 滚动日志列表 */
  logs: GeneratingLogItem[];
  /** 底部轮播提示池 */
  tips: string[];
  /** 返回键标签 */
  returnLabel?: string;
  /** 返回上级的动作回调 */
  onReturn?: () => void;
};

/**
 * 渲染视频模块的任务等待页（Shell 的薄 consumer）。
 */
export function TaskGeneratingView({
  title,
  etaText,
  progress,
  logs,
  tips,
  returnLabel,
  onReturn,
}: TaskGeneratingViewProps) {
  return (
    <TaskGeneratingShell
      title={title}
      progress={progress}
      stageLabel={etaText}
      logs={logs}
      tipsRotation={tips}
      returnLabel={returnLabel ?? '返回工作台'}
      onReturn={onReturn}
      colorScheme="amber"
    />
  );
}
