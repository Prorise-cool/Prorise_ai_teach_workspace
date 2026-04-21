import { Link } from 'react-router-dom';
import { Activity, TrendingUp } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

// TODO(epic-9): quizHealthTrend / quizHealthHint 目前是 i18n 里的占位模拟文案
// ("较上周提升 12%"、"隐函数求导模块失分较多")，后端没有对应统计接口。
// 后续 Story 需把 quizScore 改为从 xm_quiz_result.score 聚合，
// 把 trend 改为真实环比，hint 从 xm_learning_wrongbook 的高频错题维度聚合。
type LearningCenterSidebarQuizHealthProps = {
  quizScore: number;
};

export function LearningCenterSidebarQuizHealth({ quizScore }: LearningCenterSidebarQuizHealthProps) {
  const { t } = useAppTranslation();

  const circleCircumference = 2 * Math.PI * 42;
  const dashOffset = circleCircumference * (1 - Math.min(100, Math.max(0, quizScore)) / 100);

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
              {quizScore}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark mb-1">
            {t('learningCenter.page.quizHealthAverage')}
          </p>
          <p className="text-xs font-bold text-success flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {t('learningCenter.page.quizHealthTrend')}
          </p>
        </div>
      </div>

      <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-6 font-medium">
        {t('learningCenter.page.quizHealthHint')}
      </p>
      <Link
        to="/history?resultType=wrongbook"
        className="w-full border border-bordercolor-light dark:border-bordercolor-dark bg-bg-light dark:bg-bg-dark text-[13px] font-bold py-2.5 rounded-xl hover:border-text-primary dark:hover:border-text-primary-dark transition-colors text-text-primary dark:text-text-primary-dark shadow-sm flex items-center justify-center"
      >
        {t('learningCenter.page.quizHealthCta')}
      </Link>
    </section>
  );
}

