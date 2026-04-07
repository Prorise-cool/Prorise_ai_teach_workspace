/**
 * 文件说明：等待页失败态卡片（Story 4.7）。
 * 基于 failedStage 展示可解释失败信息、重新生成和返回输入页按钮。
 */
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Button } from '@/components/ui/button';
import { getTaskErrorMessage } from '@/lib/error-messages';
import { cn } from '@/lib/utils';
import type { VideoPipelineStage } from '@/types/video';

import { getStageFailureKey } from '../constants/stage-labels';

export interface GeneratingFailureCardProps {
  /** 错误码。 */
  errorCode: string | null;
  /** 原始错误消息。 */
  errorMessage: string | null;
  /** 失败所在阶段。 */
  failedStage: VideoPipelineStage | null;
  /** 是否可重试。 */
  retryable: boolean;
  /** 点击"重新生成"。 */
  onRetry?: () => void;
  /** 点击"返回输入页"。 */
  onReturn?: () => void;
  /** 额外 className。 */
  className?: string;
}

/**
 * 渲染等待页失败态卡片。
 *
 * @param props - 卡片属性。
 * @returns 失败态卡片 UI。
 */
export function GeneratingFailureCard({
  errorCode,
  errorMessage,
  failedStage,
  retryable,
  onRetry,
  onReturn,
  className,
}: GeneratingFailureCardProps) {
  const { t } = useAppTranslation();
  const stageLabel = t(getStageFailureKey(failedStage));
  const errorDetail = getTaskErrorMessage(errorCode) ?? errorMessage ?? t('video.errors.fallback');

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
        <h3 className="text-lg font-semibold text-foreground">{stageLabel}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {errorDetail}
        </p>
      </div>

      <div className="flex gap-3">
        {retryable && onRetry && (
          <Button variant="default" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('video.common.regenerate')}
          </Button>
        )}
        {onReturn && (
          <Button variant="outline" onClick={onReturn} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('video.common.returnToInput')}
          </Button>
        )}
      </div>
    </div>
  );
}
