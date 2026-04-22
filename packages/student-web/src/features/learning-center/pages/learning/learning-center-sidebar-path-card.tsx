import { Link } from 'react-router-dom';
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
      <Link
        to="/history?resultType=path"
        className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow relative overflow-hidden block shadow-md"
      >
        <div className="absolute -right-6 -top-6 opacity-[0.08]">
          <Compass className="w-32 h-32 text-surface-light dark:text-brand" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-light/70 dark:text-text-secondary-dark mb-6">
            {t('learningCenter.page.currentPathSectionTitle')}
          </h2>
          <h3 className="text-xl md:text-2xl font-black mb-3 tracking-tight">
            还没有学习路径
          </h3>
          <p className="text-[13px] font-medium text-surface-light/70 dark:text-text-secondary-dark leading-relaxed">
            去规划一条，让小麦陪你一步步攻坚。
          </p>
        </div>
      </Link>
    );
  }

  const { completedStepCount, totalStepCount, title } = path;
  const progressPercent =
    totalStepCount > 0 ? Math.round((completedStepCount / totalStepCount) * 100) : 0;
  const progressRatio = `${completedStepCount}/${totalStepCount}`;

  return (
    <Link
      to="/history?resultType=path"
      className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow relative overflow-hidden block shadow-md"
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
    </Link>
  );
}
