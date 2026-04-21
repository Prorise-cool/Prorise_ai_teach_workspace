import { Link } from 'react-router-dom';
import {
  FolderInput,
  LayoutTemplate,
  MessageSquare,
  Paperclip,
  Play,
  Star,
  StarOff,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import type { LearningCenterRecord } from '@/types/learning-center';

import { formatFavoriteTimeLabel, getTypeLabel } from './favorites-utils';

type FavoritesRecordCardProps = {
  record: LearningCenterRecord;
  resolveDetailTo: (record: LearningCenterRecord) => string;
  assignments: Record<string, string>;
  folderNameById: Map<string, string>;
  onOpenMoveDialog: (record: LearningCenterRecord) => void;
  onCancelFavorite: (record: LearningCenterRecord) => void;
};

export function FavoritesRecordCard({
  record,
  resolveDetailTo,
  assignments,
  folderNameById,
  onOpenMoveDialog,
  onCancelFavorite,
}: FavoritesRecordCardProps) {
  const { t } = useAppTranslation();

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl flex flex-col hover-card-soft shadow-sm overflow-hidden group">
      <Link
        to={resolveDetailTo(record)}
        className={
          record.resultType === 'companion' || record.resultType === 'evidence'
            ? 'w-full aspect-video bg-secondary dark:bg-bg-dark flex items-center justify-center relative overflow-hidden border-b border-bordercolor-light dark:border-bordercolor-dark p-6'
            : 'w-full aspect-video bg-secondary dark:bg-bg-dark flex items-center justify-center relative overflow-hidden border-b border-bordercolor-light dark:border-bordercolor-dark'
        }
      >
        {record.resultType === 'companion' || record.resultType === 'evidence' ? (
          <div className="flex flex-col items-center justify-center w-full h-full relative z-10 transition-transform duration-500 group-hover:scale-105">
            <div className="w-12 h-12 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center shadow-md border border-bordercolor-light dark:border-bordercolor-dark mb-4">
              {record.resultType === 'evidence' ? (
                <Paperclip className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
              ) : (
                <MessageSquare className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
              )}
            </div>
            <div className="text-center">
              <p className="text-[13px] font-black text-text-primary dark:text-text-primary-dark mb-1">
                {record.resultType === 'evidence'
                  ? t('learningCenter.favorites.previewEvidenceTitle')
                  : t('learningCenter.favorites.previewCompanionTitle')}
              </p>
              <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium line-clamp-2">
                {record.summary}
              </p>
            </div>
          </div>
        ) : (
          <>
            <img
              src={
                record.resultType === 'classroom'
                  ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600'
                  : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600'
              }
              className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
              alt=""
            />

            <div className="w-12 h-12 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center shadow-md z-10 border border-transparent dark:border-bordercolor-dark">
              {record.resultType === 'classroom' ? (
                <LayoutTemplate className="w-5 h-5 text-text-primary-dark dark:text-text-primary" />
              ) : (
                <Play className="w-5 h-5 fill-surface-light text-surface-light ml-1" />
              )}
            </div>
          </>
        )}

        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center z-10 shadow-sm">
          <Star className="w-4 h-4 text-brand-dark dark:text-brand fill-brand-dark dark:fill-brand" />
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={
              record.resultType === 'classroom'
                ? 'text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm tracking-wider'
                : 'text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded shadow-sm tracking-wider'
            }
          >
            {getTypeLabel(record.resultType)}
          </span>
          <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-bold ml-auto">
            {formatFavoriteTimeLabel(record.favoriteTime ?? record.sourceTime)}
          </span>
        </div>
        <Link
          to={resolveDetailTo(record)}
          className="text-[16px] font-black leading-snug mb-2 line-clamp-2 text-text-primary dark:text-text-primary-dark hover:text-brand-dark dark:hover:text-brand btn-transition"
        >
          {record.displayTitle}
        </Link>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-6 line-clamp-2 font-medium">
          {record.summary}
          {assignments[record.recordId]
            ? ` 当前所在文件夹：${folderNameById.get(assignments[record.recordId]) ?? ''}。`
            : ''}
        </p>

        <div className="mt-auto pt-4 flex gap-3 border-t border-bordercolor-light dark:border-bordercolor-dark">
          <button
            type="button"
            onClick={() => onOpenMoveDialog(record)}
            className="flex-1 bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary hover:bg-bordercolor-light dark:hover:text-text-primary-dark dark:hover:bg-bordercolor-dark py-2 rounded-xl text-[12px] font-bold btn-transition flex justify-center items-center gap-1.5 shadow-sm"
          >
            <FolderInput className="w-3.5 h-3.5" /> {t('learningCenter.favorites.move')}
          </button>
          <button
            type="button"
            onClick={() => void onCancelFavorite(record)}
            className="flex-1 bg-transparent border border-error/30 dark:border-error/20 text-error hover:bg-error hover:text-white dark:hover:bg-error dark:hover:text-white py-2 rounded-xl text-[12px] font-bold btn-transition flex justify-center items-center gap-1.5 shadow-sm"
          >
            <StarOff className="w-3.5 h-3.5" /> {t('learningCenter.favorites.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

