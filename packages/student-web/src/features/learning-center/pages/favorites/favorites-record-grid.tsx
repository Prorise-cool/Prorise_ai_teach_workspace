import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LearningCenterRecord } from '@/types/learning-center';

import { FavoritesRecordCard } from './favorites-record-card';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

type FavoritesRecordGridProps = {
  viewStatus: ViewStatus;
  records: LearningCenterRecord[];
  resolveDetailTo: (record: LearningCenterRecord) => string;
  assignments: Record<string, string>;
  folderNameById: Map<string, string>;
  onOpenMoveDialog: (record: LearningCenterRecord) => void;
  onCancelFavorite: (record: LearningCenterRecord) => void;
};

export function FavoritesRecordGrid({
  viewStatus,
  records,
  resolveDetailTo,
  assignments,
  folderNameById,
  onOpenMoveDialog,
  onCancelFavorite,
}: FavoritesRecordGridProps) {
  const { t } = useAppTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      {viewStatus === 'loading' ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
          {t('learningCenter.page.recentLoading')}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
          {t('learningCenter.favorites.empty')}
        </div>
      ) : (
        records.map((record) => (
          <FavoritesRecordCard
            key={record.recordId}
            record={record}
            resolveDetailTo={resolveDetailTo}
            assignments={assignments}
            folderNameById={folderNameById}
            onOpenMoveDialog={onOpenMoveDialog}
            onCancelFavorite={onCancelFavorite}
          />
        ))
      )}
    </div>
  );
}

