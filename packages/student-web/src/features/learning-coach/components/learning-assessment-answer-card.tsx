import { Send } from 'lucide-react';

import type { LearningCoachJudgeItem, LearningCoachQuestion } from '@/types/learning';

import type { AssessmentMode, SubmitState } from '../utils/assessment-snapshot';

function buildAnswerGridButtonClass(params: {
  status: 'unanswered' | 'correct' | 'wrong';
  active: boolean;
}) {
  const { status, active } = params;
  let classes =
    'w-full aspect-square rounded-lg font-bold text-[13px] flex items-center justify-center shadow-sm btn-hover-scale transition-all duration-300 ';

  if (status === 'correct') {
    classes += 'bg-success text-white';
  } else if (status === 'wrong') {
    classes += 'bg-error text-white';
  } else {
    classes +=
      'bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:border-text-primary dark:hover:border-text-primary-dark';
  }

  if (active) {
    classes +=
      ' ring-2 ring-text-primary dark:ring-text-primary-dark ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark';
  }

  return classes.trim();
}

export function LearningAssessmentAnswerCard(props: {
  mode: AssessmentMode;
  questions: LearningCoachQuestion[];
  judgeByQuestionId: Map<string, LearningCoachJudgeItem>;
  answers: Record<string, string>;
  submitState: SubmitState | null;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  submitting: boolean;
  onSelectIndex: (index: number) => void;
  onSubmit: () => void;
}) {
  const {
    mode,
    questions,
    judgeByQuestionId,
    answers,
    submitState,
    currentIndex,
    totalCount,
    answeredCount,
    submitting,
    onSelectIndex,
    onSubmit,
  } = props;

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-full shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[24px] shadow-sm p-5 transition-all">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark tracking-tight">答题卡</h3>
        <span className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark px-2.5 py-1 rounded-md shadow-sm">
          {Math.min(currentIndex + 1, totalCount)} / {totalCount || '--'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-5 text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark border-b border-bordercolor-light dark:border-bordercolor-dark pb-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-success shadow-sm" />
          正确
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-error shadow-sm" />
          错误
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark" />
          未答
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2 mb-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question, idx) => {
            const judge = judgeByQuestionId.get(question.questionId);
            const selected = answers[question.questionId];
            const status: 'unanswered' | 'correct' | 'wrong' =
              submitState && judge ? (judge.isCorrect ? 'correct' : 'wrong') : selected ? 'unanswered' : 'unanswered';

            return (
              <button
                key={question.questionId}
                type="button"
                className={buildAnswerGridButtonClass({
                  status,
                  active: idx === currentIndex,
                })}
                onClick={() => onSelectIndex(idx)}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={totalCount === 0 || submitting || answeredCount === 0}
        className="w-full shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark font-bold text-[13px] py-3 rounded-xl hover:opacity-90 btn-transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" /> {submitting ? '提交中...' : mode === 'checkpoint' ? '提交热身' : '提交答卷'}
      </button>
    </aside>
  );
}

