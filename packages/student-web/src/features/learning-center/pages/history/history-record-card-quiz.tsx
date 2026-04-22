import { Link } from 'react-router-dom';
import { FileCheck2, RotateCcw, Trash2 } from 'lucide-react';

import { extractFirstNumber, formatHistoryShortTime, getHistoryTypeLabel } from './history-utils';
import type { HistoryRecordCardBaseProps } from './history-record-card-props';

export function HistoryRecordCardQuiz({ record, t, onRemoveHistory }: HistoryRecordCardBaseProps) {
  const score = extractFirstNumber(record.summary);

  // quizId 优先取 detailRef（xm_quiz_result.quiz_id），否则回退 sourceResultId。
  // 两个字段目前都是 RuoYi `LearningCenterRecordVo` 已返回的内容。
  const quizId = (record.detailRef?.trim() || record.sourceResultId?.trim() || '').trim();
  const sessionId = record.sourceSessionId;
  const reviewTo = quizId ? `/quiz/${sessionId}/review/${quizId}` : null;

  const retakeParams = new URLSearchParams();
  retakeParams.set('sourceType', 'quiz');
  retakeParams.set('sourceSessionId', sessionId);
  if (record.displayTitle) retakeParams.set('topicHint', record.displayTitle);
  retakeParams.set('returnTo', '/history');
  const retakeTo = `/coach/${encodeURIComponent(sessionId)}?${retakeParams.toString()}`;

  return (
    <div
      className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
    >
      <div className="w-full sm:w-40 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex flex-col items-center justify-center shrink-0">
        <span className="text-3xl font-black font-mono text-text-primary dark:text-text-primary-dark tracking-tighter">
          {score ?? '—'}
          {score !== null ? <span className="text-sm font-sans ml-0.5">分</span> : null}
        </span>
        <span className="text-[11px] font-bold text-error mt-1 bg-error/10 dark:bg-error/20 px-2 py-0.5 rounded">
          {t('learningCenter.history.quizBadge')}
        </span>
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
          <div className="flex items-center gap-2">
            {reviewTo ? (
              <Link
                to={reviewTo}
                className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-3 py-2 rounded-lg text-[12px] font-bold hover:border-text-primary dark:hover:border-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" /> 查看原卷
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="bg-secondary/60 dark:bg-bg-dark/60 border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary/70 dark:text-text-secondary-dark/70 px-3 py-2 rounded-lg text-[12px] font-bold shadow-sm flex items-center gap-1.5 cursor-not-allowed"
              >
                <FileCheck2 className="w-3.5 h-3.5" /> 查看原卷
              </span>
            )}
            <Link
              to={retakeTo}
              className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark border border-text-primary dark:border-text-primary-dark px-3 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 btn-transition shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 再测一次
            </Link>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-bold">
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

