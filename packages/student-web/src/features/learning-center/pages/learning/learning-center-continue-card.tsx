import { Link } from 'react-router-dom';
import { ArrowRight, Clock, LayoutTemplate, Play } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LearningCenterRecord } from '@/types/learning-center';

import { formatShortTime, getRecordTypeLabel } from './learning-center-utils';

type LearningCenterContinueCardProps = {
  continueTo: string;
  latestRecord: LearningCenterRecord | null;
};

export function LearningCenterContinueCard({ continueTo, latestRecord }: LearningCenterContinueCardProps) {
  const { t } = useAppTranslation();

  return (
    <Link
      to={continueTo}
      className="view-enter stagger-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover-card-soft block shadow-sm"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark">
            {t('learningCenter.page.continueSection')}
          </h2>
        </div>
        <span className="text-xs font-medium text-text-secondary/80 dark:text-text-secondary-dark/80 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {latestRecord ? formatShortTime(latestRecord.sourceTime) : t('learningCenter.page.continueFallbackTime')}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="w-full sm:w-48 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center relative overflow-hidden">
          <img
            src={
              latestRecord?.resultType === 'classroom'
                ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400'
                : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400'
            }
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity"
            alt=""
          />
          <div className="w-10 h-10 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center border border-transparent dark:border-bordercolor-dark z-10 shadow-md">
            {latestRecord?.resultType === 'classroom' ? (
              <LayoutTemplate className="w-4 h-4 text-text-primary-dark dark:text-text-primary" />
            ) : (
              <Play className="w-4 h-4 fill-surface-light text-surface-light ml-0.5" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded text-text-secondary dark:text-text-secondary-dark bg-secondary/50 dark:bg-secondary">
              {latestRecord ? getRecordTypeLabel(latestRecord.resultType) : t('learningCenter.page.continueFallbackType')}
            </span>
            <h3 className="text-xl font-black text-text-primary dark:text-text-primary-dark tracking-tight">
              {latestRecord?.displayTitle ?? t('learningCenter.page.continueFallbackTitle')}
            </h3>
          </div>
          <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark mb-5 leading-relaxed">
            {latestRecord?.summary ?? t('learningCenter.page.continueFallbackSummary')}
          </p>
          <div className="bg-text-primary dark:bg-text-primary-dark text-bg-light dark:text-bg-dark rounded-lg px-6 py-2.5 font-bold text-[13px] hover:opacity-90 flex items-center gap-2 transition-opacity shadow-sm w-fit">
            {t('learningCenter.page.continueAction')}
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

