import { Trash2 } from 'lucide-react';

type HistoryPageHeaderProps = {
  isClearing: boolean;
  canClear: boolean;
  onClear: () => void;
  t: (key: string) => string;
};

export function HistoryPageHeader({ isClearing, canClear, onClear, t }: HistoryPageHeaderProps) {
  return (
    <div className="view-enter stagger-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
      <div>
        <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
          {t('learningCenter.history.title')}
        </h1>
        <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
          {t('learningCenter.history.subtitle')}
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={isClearing || !canClear}
        className="bg-error/10 dark:bg-error/20 border border-error/30 dark:border-error/20 text-error hover:bg-error hover:text-white dark:hover:bg-error dark:hover:text-white rounded-xl px-5 py-2.5 font-bold text-[13px] btn-transition shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />{' '}
        {isClearing ? t('learningCenter.history.clearing') : t('learningCenter.history.clear')}
      </button>
    </div>
  );
}

