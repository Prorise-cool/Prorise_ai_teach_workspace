/**
 * 文件说明：通用错误态展示组件。
 *
 * 与 EmptyState 视觉骨架一致，但标题着色使用 `text-destructive`
 * 以提示失败上下文，并提供可选的 `onRetry` 重试按钮。Wave 0.2 仅新建
 * 组件并导出，**未强制迁移**现有内联实现，新增 UI 时优先使用本组件。
 */
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  /** 标题，留空时使用默认 “出现错误”。 */
  title?: string;
  /** 详细错误信息，必填以便用户判断重试还是反馈。 */
  message: string;
  /** 重试回调，提供时渲染重试按钮。 */
  onRetry?: () => void;
  /** 重试按钮文案，默认 “重试”。 */
  retryLabel?: string;
  /** 额外 className，可覆盖布局或外间距。 */
  className?: string;
}

/**
 * 通用错误态组件。
 *
 * @param props - {@link ErrorStateProps}
 */
export function ErrorState({
  title = '出现错误',
  message,
  onRetry,
  retryLabel = '重试',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
