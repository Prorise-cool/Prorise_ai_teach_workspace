/**
 * 课堂生成工具栏。
 * 展示生成进度和操作按钮。
 */
import { Loader2, Sparkles, X } from 'lucide-react';
import type { FC } from 'react';

interface GenerationToolbarProps {
  progress: number;
  message: string;
  isGenerating: boolean;
  onCancel?: () => void;
}

export const GenerationToolbar: FC<GenerationToolbarProps> = ({
  progress,
  message,
  isGenerating,
  onCancel,
}) => {
  if (!isGenerating) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-full max-w-sm px-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{message}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-right font-mono text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
};
