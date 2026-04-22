import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LatestRecommendation } from '@/types/learning-center';

type LearningCenterSidebarRecommendationProps = {
  recommendation: LatestRecommendation | null;
};

export function LearningCenterSidebarRecommendation({
  recommendation,
}: LearningCenterSidebarRecommendationProps) {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-3 bg-brand/10 dark:bg-brand/10 border border-brand dark:border-brand-dark rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-5 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-dark dark:text-brand" /> {t('learningCenter.page.recommendTitle')}
      </h2>
      {recommendation ? (
        <div className="space-y-3">
          <Link
            to={`/history?resultType=recommendation&ref=${encodeURIComponent(recommendation.targetRefId)}`}
            className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl hover:border-brand dark:hover:border-brand-dark btn-transition block shadow-sm"
          >
            <span className="text-[10px] font-bold bg-brand dark:bg-brand-dark text-primary-foreground px-1.5 py-0.5 rounded-sm mb-2 inline-block shadow-sm">
              {t('learningCenter.page.recommendBadge1')}
            </span>
            <h3 className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2">
              {recommendation.summary}
            </h3>
          </Link>
        </div>
      ) : (
        <div className="bg-surface-light/60 dark:bg-surface-dark/60 border border-dashed border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl">
          <p className="text-[13px] font-medium text-text-secondary dark:text-text-secondary-dark leading-relaxed">
            完成一次 quiz 解锁下一步建议
          </p>
        </div>
      )}
    </section>
  );
}
