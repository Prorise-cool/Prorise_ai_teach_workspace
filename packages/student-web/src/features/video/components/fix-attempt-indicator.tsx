/**
 * 文件说明：manim_fix 阶段修复尝试指示器（Story 4.7）。
 * 展示"正在尝试修复…第 N/M 次"提示，让用户感知系统正在积极修复。
 */
import { Wrench } from 'lucide-react';
import { motion } from 'motion/react';

export interface FixAttemptIndicatorProps {
  /** 当前修复尝试次数。 */
  attempt: number;
  /** 修复尝试上限。 */
  total: number;
}

/**
 * 渲染修复尝试指示器。
 *
 * @param props - 指示器属性。
 * @returns 修复指示器 UI。
 */
export function FixAttemptIndicator({ attempt, total }: FixAttemptIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[color:var(--xm-color-warning)]/10 border border-[color:var(--xm-color-warning)]/20 text-[color:var(--xm-color-warning)]"
    >
      <Wrench className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
      <span className="text-sm font-medium">
        正在尝试修复…第 {attempt}/{total} 次
      </span>
    </motion.div>
  );
}
