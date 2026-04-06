/**
 * 文件说明：视频任务失败态展示面板。
 * 展示错误信息与操作入口（重试、反馈），错误码映射到用户可读文案。
 */
import { AlertCircle, MessageSquare, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getTaskErrorMessage } from '@/lib/error-messages';
import { cn } from '@/lib/utils';
import type { TaskErrorCode } from '@/types/task';

export interface VideoFailurePanelProps {
  /** 错误码。 */
  errorCode: TaskErrorCode | null;
  /** 原始错误消息（作为 fallback）。 */
  errorMessage?: string | null;
  /** 点击"重新生成"。 */
  onRetry?: () => void;
  /** 点击"反馈问题"。 */
  onFeedback?: () => void;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染视频任务失败态面板。
 *
 * @param props - 面板属性。
 * @returns 失败态 UI。
 */
export function VideoFailurePanel({
  errorCode,
  errorMessage,
  onRetry,
  onFeedback,
  className,
}: VideoFailurePanelProps) {
  const displayMessage = getTaskErrorMessage(errorCode) || errorMessage || '任务处理异常';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-6 w-full max-w-md mx-auto py-10 px-6',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">生成失败</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {displayMessage}
        </p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <Button variant="default" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            重新生成
          </Button>
        )}
        {onFeedback && (
          <Button variant="outline" onClick={onFeedback} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            反馈问题
          </Button>
        )}
      </div>
    </div>
  );
}
