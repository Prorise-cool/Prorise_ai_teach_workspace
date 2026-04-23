/**
 * 课堂生成全屏等待浮层。
 *
 * Wave 2 Polish P1 Fix 3：对齐 video-generating-page 的沉浸式等待体验，但因
 * classroom 的 useClassroomCreate() 在完成前同步阻塞提交 Promise（5min 轮询），
 * 不需要独立路由，只需在 classroom-input-page 顶层根据 progress > 0 挂一层
 * 全屏浮层即可。
 *
 * 视觉：卡片式 + 品牌 logo + 渐变顶带 + 大号百分比 + 动态进度条 + tip。
 */
import { Sparkles } from 'lucide-react';
import type { FC } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export interface ClassroomGeneratingOverlayProps {
  /** 0-100，当前课堂生成进度。 */
  progress: number;
  /** 后端返回的阶段文案；可为 null。 */
  message: string | null;
}

export const ClassroomGeneratingOverlay: FC<ClassroomGeneratingOverlayProps> = ({
  progress,
  message,
}) => {
  const { t } = useAppTranslation();
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)]">
        {/* 品牌彩带 */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

        <div className="px-6 pb-6 pt-7 text-center">
          {/* 动态图标 */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/60 dark:bg-amber-900/20 dark:ring-amber-700/30">
            <Sparkles className="h-7 w-7 animate-pulse text-amber-500 dark:text-amber-400" />
          </div>

          <h2 className="mb-1.5 text-lg font-bold tracking-tight text-foreground">
            {t('classroom.generation.overlayTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message ?? t('classroom.generation.overlaySubtitle')}
          </p>

          {/* 进度条 */}
          <div className="mt-6">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('classroom.generation.progressLabel')}
              </span>
              <span className="font-bold tabular-nums text-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            {t('classroom.generation.overlayTip')}
          </p>
        </div>
      </div>
    </div>
  );
};
