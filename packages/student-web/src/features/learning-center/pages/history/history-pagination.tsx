type HistoryPaginationProps = {
  pageNum: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string) => string;
};

export function HistoryPagination({
  pageNum,
  totalPages,
  onSelectPage,
  onPrev,
  onNext,
  t,
}: HistoryPaginationProps) {
  return (
    <div className="mt-8 flex justify-center view-enter stagger-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={pageNum <= 1}
          className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary/50 dark:text-text-secondary-dark/50 px-3 py-1.5 rounded-lg text-[13px] font-bold shadow-sm disabled:cursor-not-allowed"
        >
          {t('learningCenter.history.prev')}
        </button>
        {Array.from({ length: Math.min(3, totalPages) }).map((_, index) => {
          const page = index + 1;
          const active = page === pageNum;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onSelectPage(page)}
              className={
                active
                  ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-3.5 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
                  : 'bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-3.5 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
              }
            >
              {page}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onNext}
          disabled={pageNum >= totalPages}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:border-text-primary dark:hover:border-text-primary-dark px-3 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {t('learningCenter.history.next')}
        </button>
      </div>
    </div>
  );
}

