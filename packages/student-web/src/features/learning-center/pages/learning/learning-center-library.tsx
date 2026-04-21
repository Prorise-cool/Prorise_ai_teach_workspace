import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookX, ClipboardCheck, History, Map, Paperclip, Sparkles, Star } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

// 手动入口的固定 sessionId：学习中心直接进入 Coach / Quiz / Path 时没有视频或课堂来源上下文，
// 统一用 manual-entry 作为 sourceSessionId，sourceType=manual，FastAPI 端据此走自主练习语义。
const MANUAL_SESSION_ID = 'manual-entry';
const MANUAL_SOURCE_TYPE = 'manual';
const MANUAL_QUICK_QUIZ_COUNT = 5;
const MANUAL_PATH_CYCLE_DAYS = 7;

type LearningCenterLibraryProps = {
  total: number;
  favoritesTotal: number | null;
};

export function LearningCenterLibrary({ total, favoritesTotal }: LearningCenterLibraryProps) {
  const { t } = useAppTranslation();

  const manualBaseQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('sourceType', MANUAL_SOURCE_TYPE);
    params.set('sourceSessionId', MANUAL_SESSION_ID);
    params.set('topicHint', t('learningCenter.page.manualSessionTopicHint'));
    return params;
  }, [t]);

  const coachTo = `/coach/${MANUAL_SESSION_ID}?${manualBaseQuery.toString()}`;

  const quickQuizTo = useMemo(() => {
    const params = new URLSearchParams(manualBaseQuery);
    params.set('questionCount', String(MANUAL_QUICK_QUIZ_COUNT));
    return `/quiz/${MANUAL_SESSION_ID}?${params.toString()}`;
  }, [manualBaseQuery]);

  const pathTo = useMemo(() => {
    const params = new URLSearchParams(manualBaseQuery);
    params.set('goal', t('learningCenter.page.manualSessionPathGoal'));
    params.set('cycleDays', String(MANUAL_PATH_CYCLE_DAYS));
    return `/path?${params.toString()}`;
  }, [manualBaseQuery, t]);

  return (
    <section className="view-enter stagger-4">
      <h2 className="text-[15px] font-black mb-4 flex items-center gap-2 text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
        {t('learningCenter.page.librarySectionTitle')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Link
          to={coachTo}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-brand/15 dark:bg-brand/20 flex items-center justify-center border border-brand/30">
              <Sparkles className="w-5 h-5 text-brand-dark dark:text-brand" />
            </div>
            <span className="text-[10px] font-black bg-brand text-primary-foreground px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {t('learningCenter.page.libraryCoachBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryCoachTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryCoachSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-brand/10 dark:bg-brand/15 rounded-full z-0" />
        </Link>

        <Link
          to={quickQuizTo}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <ClipboardCheck className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {t('learningCenter.page.libraryQuickQuizBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryQuickQuizTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryQuickQuizSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
        </Link>

        <Link
          to={pathTo}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <Map className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {t('learningCenter.page.libraryPathBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
              {t('learningCenter.page.libraryPathTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
              {t('learningCenter.page.libraryPathSubtitle')}
            </p>
          </div>
          <div className="absolute -bottom-6 -right-2 w-20 h-10 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
        </Link>

        <Link
          to="/history"
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <History className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
            </div>
            <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
              {total} {t('learningCenter.page.libraryHistoryBadgeSuffix')}
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
              {favoritesTotal === null ? '-' : favoritesTotal} {t('learningCenter.page.libraryFavoritesBadgeSuffix')}
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
              {t('learningCenter.page.libraryEvidenceBadge')}
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
