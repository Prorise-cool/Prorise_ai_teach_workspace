/**
 * 文件说明：Learning Coach 测评答题卡（左侧 aside，从 learning-assessment-page 拆分，wave-1.5 polish）。
 * 纯 props-driven：展示题号网格 + 提交按钮，所有状态/回调由父页面注入。
 */
import { Send } from 'lucide-react';
import type { FC } from 'react';

import type { LearningCoachJudgeItem, LearningCoachQuestion } from '@/types/learning';

type AssessmentMode = 'checkpoint' | 'quiz';

type SubmitSnapshot = {
  readonly items: LearningCoachJudgeItem[];
} | null;

type AssessmentQuestionListProps = {
  mode: AssessmentMode;
  questions: readonly LearningCoachQuestion[];
  judgeByQuestionId: Map<string, LearningCoachJudgeItem>;
  submitState: SubmitSnapshot;
  answers: Readonly<Record<string, string>>;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  submitting: boolean;
  disabled: boolean;
  onSelectIndex: (index: number) => void;
  onSubmit: () => void;
  buildAnswerGridButtonClass: (params: {
    status: 'unanswered' | 'correct' | 'wrong';
    active: boolean;
  }) => string;
};

export const LearningAssessmentQuestionList: FC<AssessmentQuestionListProps> = ({
  mode,
  questions,
  judgeByQuestionId,
  submitState,
  answers,
  currentIndex,
  totalCount,
  answeredCount,
  submitting,
  disabled,
  onSelectIndex,
  onSubmit,
  buildAnswerGridButtonClass,
}) => {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-full shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[24px] shadow-sm p-5 transition-all">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark tracking-tight">
          答题卡
        </h3>
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
              submitState && judge
                ? judge.isCorrect
                  ? 'correct'
                  : 'wrong'
                : selected
                  ? 'unanswered'
                  : 'unanswered';

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
        disabled={disabled || submitting || answeredCount === 0}
        className="w-full shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark font-bold text-[13px] py-3 rounded-xl hover:opacity-90 btn-transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />{' '}
        {submitting ? '提交中...' : mode === 'checkpoint' ? '提交热身' : '提交答卷'}
      </button>
    </aside>
  );
};
