/**
 * 生成进度面板 —— 视觉对标 OpenMAIC `components/generation/generating-progress.tsx`。
 *
 * 纯 props-driven 组件，两步里程碑（outline 就绪 → 首幕就绪）+ 状态文案 + 错误提示。
 * 颜色全部走 token（primary / destructive / muted-foreground / green-500）。
 */
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GeneratingProgressProps {
  /** 大纲是否生成完毕 */
  readonly outlineReady: boolean;
  /** 首幕是否生成完毕 */
  readonly firstPageReady: boolean;
  /** 下方的状态文案 */
  readonly statusMessage?: string;
  /** 错误信息；非空时进入错误态 */
  readonly error?: string | null;
}

interface StatusItemProps {
  readonly completed: boolean;
  readonly inProgress: boolean;
  readonly hasError: boolean;
  readonly label: string;
}

const StatusItem: FC<StatusItemProps> = ({ completed, inProgress, hasError, label }) => {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-shrink-0">
        {hasError ? (
          <XCircle className="size-6 text-destructive" />
        ) : completed ? (
          <CheckCircle2 className="size-6 text-green-500" />
        ) : inProgress ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : (
          <Circle className="size-6 text-muted-foreground" />
        )}
      </div>
      <span
        className={
          hasError
            ? 'text-base text-destructive'
            : completed
              ? 'text-base font-medium text-green-600'
              : inProgress
                ? 'text-base font-medium text-primary'
                : 'text-base text-muted-foreground'
        }
      >
        {label}
      </span>
    </div>
  );
};

export const GeneratingProgress: FC<GeneratingProgressProps> = ({
  outlineReady,
  firstPageReady,
  statusMessage,
  error,
}) => {
  const { t } = useAppTranslation();
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!error && !firstPageReady) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
      }, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [error, firstPageReady]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {error ? (
              <>
                <XCircle className="size-5 text-destructive" />
                {t('classroom.generation.generationFailed')}
              </>
            ) : firstPageReady ? (
              <>
                <CheckCircle2 className="size-5 text-green-500" />
                {t('classroom.generation.openingClassroom')}
              </>
            ) : (
              <>
                <Loader2 className="size-5 animate-spin" />
                {t('classroom.generation.generatingCourse')}
                {dots}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border">
            <StatusItem
              completed={outlineReady}
              inProgress={!outlineReady && !error}
              hasError={!outlineReady && !!error}
              label={
                outlineReady
                  ? t('classroom.generation.outlineReady')
                  : t('classroom.generation.generatingOutlines')
              }
            />
            <StatusItem
              completed={firstPageReady}
              inProgress={outlineReady && !firstPageReady && !error}
              hasError={outlineReady && !firstPageReady && !!error}
              label={
                firstPageReady
                  ? t('classroom.generation.firstPageReady')
                  : t('classroom.generation.generatingFirstPage')
              }
            />
          </div>

          {statusMessage && !error && (
            <div className="border-t border-border pt-2">
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
