import { Link } from 'react-router-dom';
import { Play, PlayCircle, Star, Trash2 } from 'lucide-react';

import { formatHistoryShortTime, getHistoryTypeLabel } from './history-utils';
import type { HistoryRecordCardWithFavoriteProps } from './history-record-card-props';

export function HistoryRecordCardVideo({
  record,
  t,
  onToggleFavorite,
  onRemoveHistory,
}: HistoryRecordCardWithFavoriteProps) {
  return (
    <div
      className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
    >
      <div className="w-full sm:w-40 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center relative overflow-hidden shrink-0">
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400"
          className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity"
          alt=""
        />
        <div className="w-10 h-10 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center border border-transparent dark:border-bordercolor-dark z-10 shadow-md">
          <Play className="w-4 h-4 fill-surface-light text-surface-light ml-0.5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full h-full justify-between">
        <div>
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                {getHistoryTypeLabel(record.resultType)}
              </span>
              <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark truncate max-w-[200px] md:max-w-sm">
                {record.displayTitle}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
              {formatHistoryShortTime(record.sourceTime)}
            </span>
          </div>
          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
            {record.summary}
          </p>
        </div>

        <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-2 border-t border-bordercolor-light dark:border-bordercolor-dark md:border-t-0 md:border-transparent">
          <Link
            to={`/video/${record.detailRef}`}
            className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 btn-transition shadow-sm flex items-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5" /> {t('learningCenter.history.playback')}
          </Link>
          <div className="flex items-center gap-4 text-[12px] font-bold">
            <button
              type="button"
              onClick={() => void onToggleFavorite(record)}
              className={
                record.favorite
                  ? 'text-brand-dark dark:text-brand flex items-center gap-1'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:text-brand-dark dark:hover:text-brand btn-transition flex items-center gap-1'
              }
            >
              <Star className={record.favorite ? 'w-3.5 h-3.5 fill-brand' : 'w-3.5 h-3.5'} />{' '}
              {record.favorite ? t('learningCenter.history.favorited') : t('learningCenter.history.favorite')}
            </button>
            <button
              type="button"
              onClick={() => void onRemoveHistory(record)}
              className="text-text-secondary dark:text-text-secondary-dark hover:text-error dark:hover:text-error btn-transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('learningCenter.history.remove')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

