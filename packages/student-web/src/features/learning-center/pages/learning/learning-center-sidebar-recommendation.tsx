import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

export function LearningCenterSidebarRecommendation() {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-3 bg-brand/10 dark:bg-brand/10 border border-brand dark:border-brand-dark rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-5 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-dark dark:text-brand" /> {t('learningCenter.page.recommendTitle')}
      </h2>
      <div className="space-y-3">
        <Link
          to="/history?resultType=recommendation"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl hover:border-brand dark:hover:border-brand-dark btn-transition block shadow-sm"
        >
          <span className="text-[10px] font-bold bg-brand dark:bg-brand-dark text-primary-foreground px-1.5 py-0.5 rounded-sm mb-2 inline-block shadow-sm">
            {t('learningCenter.page.recommendBadge1')}
          </span>
          <h3 className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2">
            {t('learningCenter.page.recommendItem1')}
          </h3>
        </Link>
        <Link
          to="/favorites"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl hover:border-text-primary dark:hover:border-text-primary-dark btn-transition block shadow-sm"
        >
          <span className="text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded-sm mb-2 inline-block shadow-sm">
            {t('learningCenter.page.recommendBadge2')}
          </span>
          <h3 className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2">
            {t('learningCenter.page.recommendItem2')}
          </h3>
        </Link>
      </div>
    </section>
  );
}

