import { Link } from 'react-router-dom';
import { BookX, History, Paperclip, Star } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type LearningCenterLibraryProps = {
  total: number;
  favoritesTotal: number | null;
};

export function LearningCenterLibrary({ total, favoritesTotal }: LearningCenterLibraryProps) {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-4">
      <h2 className="text-[15px] font-black mb-4 flex items-center gap-2 text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
        Library
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/history"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <History className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {total} Files
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryHistoryTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryHistorySubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
        </Link>

        <Link
          to="/favorites"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <Star className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {favoritesTotal === null ? '-' : favoritesTotal} Saved
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryFavoritesTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryFavoritesSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-bg-light dark:bg-bg-dark rotate-45 rounded-2xl z-0" />
        </Link>

        <Link
          to="/history?resultType=wrongbook"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-error/10 dark:bg-error/20 flex items-center justify-center border border-error/30 dark:border-error/20">
              <BookX className="w-5 h-5 text-error" />
            </div>
            <span className="text-[10px] font-black bg-error text-white px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {t('learningCenter.page.libraryWrongbookBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryWrongbookTitle')}
            </h3>
            <p className="text-[12px] font-bold text-error mt-0.5">
              {t('learningCenter.page.libraryWrongbookSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-error/10 dark:bg-error/20 rotate-12 rounded-xl z-0" />
        </Link>

        <Link
          to="/history?resultType=evidence"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <Paperclip className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-1 rounded-sm uppercase tracking-widest">
              Demo
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryEvidenceTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryEvidenceSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-2 w-20 h-10 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
        </Link>
      </div>
    </section>
  );
}

