import { ChevronDown, FileText, LayoutTemplate, MessageSquare, PlaySquare } from 'lucide-react';

type HistoryTimeRange = '7d' | '30d' | 'all';

type HistoryFilterBarProps = {
  activeType: string | null;
  total: number;
  timeRange: HistoryTimeRange;
  onSelectType: (type: string | null) => void;
  onSelectTimeRange: (range: HistoryTimeRange) => void;
  t: (key: string) => string;
};

export function HistoryFilterBar({
  activeType,
  total,
  timeRange,
  onSelectType,
  onSelectTimeRange,
  t,
}: HistoryFilterBarProps) {
  return (
    <div className="view-enter stagger-2 sticky top-4 z-30 bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-bordercolor-light dark:border-bordercolor-dark flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
        <button
          type="button"
          onClick={() => onSelectType(null)}
          className={
            activeType === null
              ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
              : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
          }
        >
          {t('learningCenter.history.filterAll')} ({total})
        </button>
        <button
          type="button"
          onClick={() => onSelectType('video')}
          className={
            activeType === 'video'
              ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
          }
        >
          <PlaySquare className="w-3.5 h-3.5" /> {t('learningCenter.history.filterVideo')}
        </button>
        <button
          type="button"
          onClick={() => onSelectType('classroom')}
          className={
            activeType === 'classroom'
              ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
          }
        >
          <LayoutTemplate className="w-3.5 h-3.5" /> {t('learningCenter.history.filterClassroom')}
        </button>
        <button
          type="button"
          onClick={() => onSelectType('quiz')}
          className={
            activeType === 'quiz'
              ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
          }
        >
          <FileText className="w-3.5 h-3.5" /> {t('learningCenter.history.filterQuiz')}
        </button>
        <button
          type="button"
          onClick={() => onSelectType('companion')}
          className={
            activeType === 'companion'
              ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
          }
        >
          <MessageSquare className="w-3.5 h-3.5" /> {t('learningCenter.history.filterCompanion')}
        </button>
      </div>

      <div className="relative shrink-0 w-full md:w-auto">
        <select
          value={timeRange}
          onChange={(event) => onSelectTimeRange(event.target.value as HistoryTimeRange)}
          className="w-full md:w-auto bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 pr-10 rounded-lg text-[13px] font-bold shadow-sm outline-none cursor-pointer"
        >
          <option value="7d">{t('learningCenter.history.range7d')}</option>
          <option value="30d">{t('learningCenter.history.range30d')}</option>
          <option value="all">{t('learningCenter.history.rangeAll')}</option>
        </select>
        <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

