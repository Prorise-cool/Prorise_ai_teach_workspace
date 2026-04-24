import { Compass } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { ActiveLearningPath } from '@/types/learning-center';

type LearningCenterSidebarPathCardProps = {
  path: ActiveLearningPath | null;
};

export function LearningCenterSidebarPathCard({ path }: LearningCenterSidebarPathCardProps) {
  const { t } = useAppTranslation();

  if (!path) {
    return (
      <section
        aria-disabled="true"
        className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 relative overflow-hidden block shadow-md opacity-60 cursor-not-allowed select-none"
      >
        <div className="absolute -right-6 -top-6 opacity-[0.08]">
          <Compass className="w-32 h-32 text-surface-light dark:text-brand" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-surface-light/70 dark:text-text-secondary-dark">
              {t('learningCenter.page.currentPathSectionTitle')}
            </h2>
            <span className="text-[10px] font-bold bg-surface-light/20 dark:bg-bordercolor-dark text-surface-light dark:text-text-secondary-dark px-2 py-0.5 rounded">
              即将开放
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black mb-3 tracking-tight">
            还没有学习路径
          </h3>
          <p className="text-[13px] font-medium text-surface-light/70 dark:text-text-secondary-dark leading-relaxed">
            学习路径规划功能开发中，敬请期待。
          </p>
        </div>
      </section>
    );
  }

  const { completedStepCount, totalStepCount, title } = path;
  const progressPercent =
    totalStepCount > 0 ? Math.round((completedStepCount / totalStepCount) * 100) : 0;
  const progressRatio = `${completedStepCount}/${totalStepCount}`;

  return (
    <section
      className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 relative overflow-hidden block shadow-md"
    >
      <div className="absolute -right-6 -top-6 opacity-[0.08]">
        <Compass className="w-32 h-32 text-surface-light dark:text-brand" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-light/70 dark:text-text-secondary-dark">
            {t('learningCenter.page.currentPathSectionTitle')}
          </h2>
          <span className="text-[10px] font-bold bg-brand text-primary-foreground px-2 py-0.5 rounded shadow-sm">
            {t('learningCenter.page.currentPathTargetBadge')}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-8 tracking-tight">
          {title}
        </h3>
        <div className="flex justify-between text-xs font-bold mb-3 text-surface-light/80 dark:text-text-secondary-dark">
          <span>{t('learningCenter.page.pathProgressLabel')}</span>
          <span>{progressPercent}% ({progressRatio})</span>
        </div>
        <div className="w-full h-1.5 bg-text-secondary dark:bg-bg-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
