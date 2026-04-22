import { Link } from 'react-router-dom';
import { Activity, TrendingUp } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type LearningCenterSidebarQuizHealthProps = {
  averageQuizScore: number | null;
};

export function LearningCenterSidebarQuizHealth({ averageQuizScore }: LearningCenterSidebarQuizHealthProps) {
  const { t } = useAppTranslation();

  const hasScore = averageQuizScore !== null && Number.isFinite(averageQuizScore);
  const displayScore = hasScore ? averageQuizScore! : 0;
  const circleCircumference = 2 * Math.PI * 42;
  const dashOffset = circleCircumference * (1 - Math.min(100, Math.max(0, displayScore)) / 100);

  return (
    <section className="view-enter stagger-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4" /> {t('learningCenter.page.quizHealthTitle')}
      </h2>

      <div className="flex items-center gap-5 mb-6">
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className="stroke-bg-light dark:stroke-bg-dark"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className="stroke-success circle-progress"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-black font-mono text-text-primary dark:text-text-primary-dark tracking-tighter">
              {hasScore ? averageQuizScore : '—'}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark mb-1">
            {t('learningCenter.page.quizHealthAverage')}
          </p>
          {hasScore ? (
            <p className="text-xs font-bold text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {t('learningCenter.page.quizHealthTrend')}
            </p>
          ) : (
            <p className="text-xs font-bold text-text-secondary dark:text-text-secondary-dark">
              完成 quiz 解锁能力视图
            </p>
          )}
        </div>
      </div>

      {hasScore && (
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-6 font-medium">
          {t('learningCenter.page.quizHealthHint')}
        </p>
      )}
      <Link
        to="/history?resultType=wrongbook"
        className="w-full border border-bordercolor-light dark:border-bordercolor-dark bg-bg-light dark:bg-bg-dark text-[13px] font-bold py-2.5 rounded-xl hover:border-text-primary dark:hover:border-text-primary-dark transition-colors text-text-primary dark:text-text-primary-dark shadow-sm flex items-center justify-center"
      >
        {t('learningCenter.page.quizHealthCta')}
      </Link>
    </section>
  );
}
