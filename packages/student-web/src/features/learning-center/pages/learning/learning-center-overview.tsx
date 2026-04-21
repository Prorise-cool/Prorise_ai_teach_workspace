import { useAppTranslation } from '@/app/i18n/use-app-translation';

type LearningCenterOverviewProps = {
  countByType: Map<string, number>;
};

const RESULT_TYPE_I18N_KEYS: ReadonlyArray<readonly [string, string]> = [
  ['video', 'learningCenter.page.resultTypeVideo'],
  ['classroom', 'learningCenter.page.resultTypeClassroom'],
  ['companion', 'learningCenter.page.resultTypeCompanion'],
  ['evidence', 'learningCenter.page.resultTypeEvidence'],
  ['checkpoint', 'learningCenter.page.resultTypeCheckpoint'],
  ['quiz', 'learningCenter.page.resultTypeQuiz'],
  ['path', 'learningCenter.page.resultTypePath'],
  ['recommendation', 'learningCenter.page.resultTypeRecommendation'],
];

export function LearningCenterOverview({ countByType }: LearningCenterOverviewProps) {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-3 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
            {t('learningCenter.page.overviewTitle')}
          </h2>
          <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-1">
            {t('learningCenter.page.overviewSubtitle')}
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-brand/10 dark:bg-brand/5 border border-brand/20 dark:border-brand/10 text-[11px] font-bold text-text-primary dark:text-brand w-fit">
          {t('learningCenter.page.overviewCta')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {RESULT_TYPE_I18N_KEYS.map(([type, labelKey]) => (
          <span
            key={type}
            className="px-3 py-1.5 rounded-full bg-bg-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[12px] font-bold text-text-primary dark:text-text-primary-dark"
          >
            {t(labelKey)} {countByType.get(type) ?? 0}
          </span>
        ))}
      </div>
    </section>
  );
}

