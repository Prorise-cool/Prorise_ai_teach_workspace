import { Link } from 'react-router-dom';
import { BookX, History, Paperclip, Star } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

type LearningCenterLibraryProps = {
  total: number;
  favoritesTotal: number | null;
};

/**
 * Library 区只承接"回看历史"类入口：生成历史 / 收藏 / 错题本 / 依据溯源。
 *
 * 故意不在这里放 Coach / Checkpoint / Quiz / Path 的创建入口——按产品设计，
 * 这些是视频或课堂会话结束后触发的"学后环节"，应该从 /video/:taskId
 * 结果页的 `learningCoachTo` CTA 进入，带上真实 sourceSessionId + topicHint；
 * 从学习中心直接进入会丢失会话上下文，LLM 也无法按真实知识点出题。
 */
export function LearningCenterLibrary({ total, favoritesTotal }: LearningCenterLibraryProps) {
  const { t } = useAppTranslation();

  return (
    <section className="view-enter stagger-4">
      <h2 className="text-[15px] font-black mb-4 flex items-center gap-2 text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
        {t('learningCenter.page.librarySectionTitle')}
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

        <div
          role="link"
          aria-disabled="true"
          title={t('learningCenter.page.libraryWrongbookSubtitle')}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 flex flex-col justify-between h-36 relative overflow-hidden shadow-sm opacity-60 cursor-not-allowed pointer-events-none select-none"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <BookX className="w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
            </div>
            <span className="text-[10px] font-black bg-bordercolor-light dark:bg-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-1 rounded-sm uppercase tracking-widest">
              {t('learningCenter.page.libraryWrongbookBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-secondary dark:text-text-secondary-dark">
              {t('learningCenter.page.libraryWrongbookTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
              {t('learningCenter.page.libraryWrongbookSubtitle')}
            </p>
          </div>
        </div>

        <div
          role="link"
          aria-disabled="true"
          title={t('learningCenter.page.libraryEvidenceSubtitle')}
          className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 flex flex-col justify-between h-36 relative overflow-hidden shadow-sm opacity-60 cursor-not-allowed pointer-events-none select-none"
        >
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
              <Paperclip className="w-5 h-5 text-text-tertiary dark:text-text-tertiary-dark" />
            </div>
            <span className="text-[10px] font-black bg-bordercolor-light dark:bg-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-1 rounded-sm uppercase tracking-widest">
              {t('learningCenter.page.libraryEvidenceBadge')}
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <h3 className="font-black text-[16px] text-text-secondary dark:text-text-secondary-dark">
              {t('learningCenter.page.libraryEvidenceTitle')}
            </h3>
            <p className="text-[12px] font-medium text-text-tertiary dark:text-text-tertiary-dark mt-0.5">
              {t('learningCenter.page.libraryEvidenceSubtitle')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
