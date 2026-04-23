/**
 * 文件说明：通用加载态展示组件。
 *
 * 提供 inline / default / fullscreen 三种摆放变体，统一现有页面散落的
 * `Loader2 + animate-spin + 文案` 组合，避免每个 feature 自己实现一份。
 *
 * Wave 0.2 仅新建组件并导出，**未强制迁移**已有用法（迁移留待 Wave 1.5
 * 推广，避免 PR 影响面过大）。新增 UI 时优先使用本组件。
 */
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Loading 尺寸预设，对应 spinner 与文字字号。 */
export type LoadingStateSize = 'sm' | 'md' | 'lg';

/** Loading 摆放变体。 */
export type LoadingStateVariant = 'default' | 'inline' | 'fullscreen';

export interface LoadingStateProps {
  /** spinner 尺寸预设，默认 `md`。 */
  size?: LoadingStateSize;
  /** spinner 右侧/下方文案，留空仅显示 spinner。 */
  message?: string;
  /**
   * 摆放变体：
   * - `default`：垂直居中、上下留白，用于卡片或 section 内部加载。
   * - `inline`：横向 inline-flex，用于按钮内或行内提示。
   * - `fullscreen`：充满父容器并垂直居中，用于整页 loading。
   */
  variant?: LoadingStateVariant;
  /** 额外 className，可覆盖布局或外间距。 */
  className?: string;
}

const SPINNER_SIZE: Record<LoadingStateSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

const TEXT_SIZE: Record<LoadingStateSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const VARIANT_CONTAINER: Record<LoadingStateVariant, string> = {
  default: 'flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground',
  inline: 'inline-flex items-center gap-1.5 text-muted-foreground',
  fullscreen:
    'flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground',
};

/**
 * 通用加载态组件。
 *
 * @param props - {@link LoadingStateProps}
 */
export function LoadingState({
  size = 'md',
  message,
  variant = 'default',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(VARIANT_CONTAINER[variant], className)}
    >
      <Loader2 className={cn(SPINNER_SIZE[size], 'animate-spin text-primary')} />
      {message ? <span className={cn(TEXT_SIZE[size])}>{message}</span> : null}
    </div>
  );
}
