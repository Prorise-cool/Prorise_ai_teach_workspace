/**
 * 文件说明：等待页阶段进度条组件（Story 4.7）。
 * 展示当前阶段标签、全局进度条与进度百分比。
 */
import { motion } from 'motion/react';

import { cn } from '@/lib/utils';

export interface StageProgressBarProps {
  /** 当前阶段中文标签。 */
  stageLabel: string;
  /** 全局进度（0–100）。 */
  progress: number;
  /** 预估剩余时间文案。 */
  etaText: string;
  /** 是否处于异常状态（警告/错误）。 */
  isWarning?: boolean;
  /** 是否处于错误状态。 */
  isError?: boolean;
}

/**
 * 渲染等待页阶段进度条。
 *
 * @param props - 进度条属性。
 * @returns 进度条 UI。
 */
export function StageProgressBar({
  stageLabel,
  progress,
  etaText,
  isWarning,
  isError,
}: StageProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="w-full max-w-2xl mb-10">
      <div className="flex justify-between items-end mb-4 px-1">
        <div className="flex flex-col gap-1.5">
          <span
            className={cn(
              'text-xl font-bold tracking-wide transition-colors duration-300',
              isWarning && 'text-[color:var(--xm-color-warning)] drop-shadow-[0_0_8px_rgba(255,103,0,0.4)]',
              isError && 'text-[color:var(--xm-color-error)]',
            )}
          >
            {stageLabel}
          </span>
          <span className="text-sm text-muted-foreground opacity-80 font-medium">
            {etaText}
          </span>
        </div>
        <span className="text-4xl font-black font-mono tracking-tighter text-primary drop-shadow-[0_0_16px_rgba(245,197,71,0.4)] transition-all">
          {clampedProgress}%
        </span>
      </div>

      <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden backdrop-blur-sm relative">
        <motion.div
          className={cn(
            'xm-generating-progress-fill h-full bg-primary rounded-full relative',
            isWarning && 'bg-[color:var(--xm-color-warning)]',
            isError && 'bg-[color:var(--xm-color-error)]',
          )}
          initial={false}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
