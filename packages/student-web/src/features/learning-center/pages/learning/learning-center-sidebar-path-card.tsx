import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export function LearningCenterSidebarPathCard() {
  const { t } = useAppTranslation();

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
            Current Path
          </h2>
          <span className="text-[10px] font-bold bg-brand text-primary-foreground px-2 py-0.5 rounded shadow-sm">
            Target
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-black mb-8 tracking-tight">
          {t('learningCenter.page.pathFallbackTitleLine1')}
          <br />
          {t('learningCenter.page.pathFallbackTitleLine2')}
        </h3>
        <div className="flex justify-between text-xs font-bold mb-3 text-surface-light/80 dark:text-text-secondary-dark">
          <span>{t('learningCenter.page.pathProgressLabel')}</span>
          <span>25% (1/4)</span>
        </div>
        <div className="w-full h-1.5 bg-text-secondary dark:bg-bg-dark rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full w-[25%]" />
        </div>
      </div>
    </Link>
  );
}

