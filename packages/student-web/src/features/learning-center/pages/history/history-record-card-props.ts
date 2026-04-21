import type { LearningCenterRecord } from '@/types/learning-center';

export type HistoryRecordCardBaseProps = {
  record: LearningCenterRecord;
  t: (key: string) => string;
  onRemoveHistory: (record: LearningCenterRecord) => Promise<void> | void;
};

export type HistoryRecordCardWithFavoriteProps = HistoryRecordCardBaseProps & {
  onToggleFavorite: (record: LearningCenterRecord) => Promise<void> | void;
};

