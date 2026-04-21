import { Link } from 'react-router-dom';
import { Bot, ChevronRight, MessageSquare, PlaySquare } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LearningCenterRecord } from '@/types/learning-center';

import { formatShortTime } from './learning-center-utils';

type LearningCenterRecentActivityProps = {
  viewStatus: 'loading' | 'ready' | 'error';
  recentActivity: LearningCenterRecord[];
  resolveDetailTo: (record: LearningCenterRecord) => string;
};

export function LearningCenterRecentActivity({
  viewStatus,
  recentActivity,
  resolveDetailTo,
}: LearningCenterRecentActivityProps) {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
          {t('learningCenter.page.recentActivityTitle')}
        </h2>
        <Link
          to="/history"
          className="text-xs font-bold text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark transition-colors"
        >
          {t('learningCenter.page.recentViewAll')} &rarr;
        </Link>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-2 shadow-sm">
        {recentActivity.length === 0 ? (
          <div className="p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            {viewStatus === 'loading' ? t('learningCenter.page.recentLoading') : t('learningCenter.page.recentEmpty')}
          </div>
        ) : (
          recentActivity.map((record) => (
            <Link
              key={record.recordId}
              to={resolveDetailTo(record)}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-light dark:hover:bg-bg-dark btn-transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center text-text-secondary dark:text-text-secondary-dark shadow-sm">
                  {record.resultType === 'video' ? (
                    <PlaySquare className="w-5 h-5" />
                  ) : record.resultType === 'companion' ? (
                    <Bot className="w-5 h-5" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[14px] text-text-primary dark:text-text-primary-dark">
                    {record.displayTitle}
                  </h4>
                  <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1 font-medium">
                    {formatShortTime(record.sourceTime)} · {record.summary}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

