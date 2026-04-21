import type { LearningCenterRecord } from '@/types/learning-center';

import { HistoryRecordCardClassroom } from './history-record-card-classroom';
import { HistoryRecordCardDefault } from './history-record-card-default';
import { HistoryRecordCardQuiz } from './history-record-card-quiz';
import { HistoryRecordCardVideo } from './history-record-card-video';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

type HistoryRecordListProps = {
  viewStatus: ViewStatus;
  records: LearningCenterRecord[];
  t: (key: string) => string;
  onToggleFavorite: (record: LearningCenterRecord) => Promise<void> | void;
  onRemoveHistory: (record: LearningCenterRecord) => Promise<void> | void;
};

export function HistoryRecordList({
  viewStatus,
  records,
  t,
  onToggleFavorite,
  onRemoveHistory,
}: HistoryRecordListProps) {
  return (
    <div className="flex flex-col gap-4 view-enter stagger-3">
      {viewStatus === 'loading' ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
          {t('learningCenter.page.recentLoading')}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
          {t('learningCenter.history.empty')}
        </div>
      ) : (
        records.map((record) => {
          if (record.resultType === 'video') {
            return (
              <HistoryRecordCardVideo
                key={record.recordId}
                record={record}
                t={t}
                onToggleFavorite={onToggleFavorite}
                onRemoveHistory={onRemoveHistory}
              />
            );
          }

          if (record.resultType === 'classroom') {
            return (
              <HistoryRecordCardClassroom
                key={record.recordId}
                record={record}
                t={t}
                onToggleFavorite={onToggleFavorite}
                onRemoveHistory={onRemoveHistory}
              />
            );
          }

          if (record.resultType === 'quiz') {
            return (
              <HistoryRecordCardQuiz
                key={record.recordId}
                record={record}
                t={t}
                onRemoveHistory={onRemoveHistory}
              />
            );
          }

          return (
            <HistoryRecordCardDefault
              key={record.recordId}
              record={record}
              t={t}
              onToggleFavorite={onToggleFavorite}
              onRemoveHistory={onRemoveHistory}
            />
          );
        })
      )}
    </div>
  );
}

