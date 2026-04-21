import { ArrowLeft, ArrowRight, BookmarkPlus, Check, Lightbulb, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { LearningCoachJudgeItem, LearningCoachQuestion } from '@/types/learning';

import type { AssessmentMode, AssessmentState, SubmitState } from '../utils/assessment-snapshot';

export function LearningAssessmentQuestionPanel(props: {
  mode: AssessmentMode;
  pageTitle: string;
  assessment: AssessmentState | null;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  currentQuestion: LearningCoachQuestion | null;
  answers: Record<string, string>;
  judgeByQuestionId: Map<string, LearningCoachJudgeItem>;
  submitState: SubmitState | null;
  exitTo: string;
  onExit: () => void;
  onSelectOption: (questionId: string, optionId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onReturn: () => void;
  onEnterQuiz: () => void;
}) {
  const {
    mode,
    pageTitle,
    assessment,
    currentIndex,
    totalCount,
    answeredCount,
    currentQuestion,
    answers,
    judgeByQuestionId,
    submitState,
    exitTo,
    onExit,
    onSelectOption,
    onPrev,
    onNext,
    onReturn,
    onEnterQuiz,
  } = props;

  return (
    <main className="flex-1 h-full overflow-y-auto custom-scroll flex flex-col relative px-1 md:px-2">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest shadow-sm">
            {pageTitle}
          </div>
          <span className="lg:hidden px-3 py-1.5 rounded-lg bg-brand/10 dark:bg-brand/5 border border-brand/20 dark:border-brand/10 text-[11px] font-bold text-text-primary dark:text-brand shadow-sm">
            第 {Math.min(currentIndex + 1, totalCount)} / {totalCount || '--'} 题
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={exitTo}
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm"
          >
            退出测验
          </Link>
        </div>
      </div>

      {submitState ? (
        <div className="mb-4 rounded-2xl border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/30 dark:bg-bg-dark/60 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark">
              {mode === 'checkpoint'
                ? submitState.passed
                  ? `热身通过：${submitState.correctTotal}/${submitState.questionTotal}`
                  : `需要补强：${submitState.correctTotal}/${submitState.questionTotal}`
                : `得分：${submitState.score ?? 0}（${submitState.correctTotal}/${submitState.questionTotal}）`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReturn}
                className="px-3 py-1.5 rounded-full border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-[12px] font-bold text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-secondary transition-colors"
              >
                返回
              </button>
              {mode === 'checkpoint' ? (
                <button
                  type="button"
                  onClick={onEnterQuiz}
                  className="px-3 py-1.5 rounded-full bg-text-primary dark:bg-text-primary-dark text-[12px] font-bold text-bg-light dark:text-bg-dark hover:opacity-90 transition-opacity"
                >
                  进入正式 Quiz
                </button>
              ) : null}
            </div>
          </div>
          {mode === 'quiz' && submitState.summary ? (
            <p className="mt-2 text-[12px] leading-relaxed text-text-secondary dark:text-text-secondary-dark">
              {submitState.summary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        id="question-content-container"
        className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[24px] shadow-sm flex flex-col w-full question-transition relative overflow-hidden shrink-0"
      >
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="p-6 md:p-8 lg:p-10 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2.5 py-1.5 rounded-md shadow-sm uppercase tracking-wider">
                单选题
              </span>
              <span className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark">
                考点：{currentQuestion?.tag ?? '—'}
              </span>
            </div>
            <span className="text-[12px] font-bold text-brand-dark dark:text-brand bg-brand/10 dark:bg-brand/5 px-2.5 py-1 rounded-md">
              已作答 {answeredCount} / {totalCount || '--'}
            </span>
          </div>

          <div className="text-[17px] md:text-[19px] font-bold mb-8 leading-relaxed text-text-primary dark:text-text-primary-dark">
            {currentQuestion?.stem ?? '题目加载中...'}
          </div>

          <div className="flex flex-col gap-3 md:gap-4 mb-10">
            {(currentQuestion?.options ?? []).map((opt) => {
              const selectedId = currentQuestion ? answers[currentQuestion.questionId] : undefined;
              const judge = currentQuestion ? judgeByQuestionId.get(currentQuestion.questionId) : undefined;
              const submitted = Boolean(submitState && judge);
              const isSelected = selectedId === opt.optionId;
              const isCorrect = submitted && judge?.correctOptionId === opt.optionId;
              const isWrongSelected = submitted && isSelected && !isCorrect;

              if (isWrongSelected) {
                return (
                  <button
                    key={opt.optionId}
                    type="button"
                    className="p-4 md:p-5 rounded-[16px] border border-error/30 dark:border-error/20 bg-error/10 dark:bg-error/20 flex items-center justify-between shadow-sm transition-all cursor-pointer"
                    onClick={() => onSelectOption(currentQuestion!.questionId, opt.optionId)}
                  >
                    <div className="flex items-center gap-4 text-error">
                      <span className="w-8 h-8 rounded-lg bg-white dark:bg-secondary border border-error/30 dark:border-error/20 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {opt.label}
                      </span>
                      <span className="font-mono text-[15px] md:text-[16px] font-bold">{opt.text}</span>
                    </div>
                    <X className="w-5 h-5 text-error shrink-0" />
                  </button>
                );
              }

              if (isCorrect) {
                return (
                  <button
                    key={opt.optionId}
                    type="button"
                    className="p-4 md:p-5 rounded-[16px] border-2 border-success bg-success/10 dark:bg-success/20 flex items-center justify-between shadow-sm transition-all cursor-pointer"
                    onClick={() => onSelectOption(currentQuestion!.questionId, opt.optionId)}
                  >
                    <div className="flex items-center gap-4 text-success">
                      <span className="w-8 h-8 rounded-lg bg-success text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {opt.label}
                      </span>
                      <span className="font-mono text-[15px] md:text-[16px] font-bold">{opt.text}</span>
                    </div>
                    <Check className="w-6 h-6 text-success stroke-[3] shrink-0" />
                  </button>
                );
              }

              return (
                <button
                  key={opt.optionId}
                  type="button"
                  className={[
                    'p-4 md:p-5 rounded-[16px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/30 dark:bg-bg-dark/50 flex items-center gap-4 text-text-secondary dark:text-text-secondary-dark transition-all cursor-pointer',
                    submitted ? 'opacity-70 hover:opacity-100 hover:border-text-primary dark:hover:border-text-primary-dark' : '',
                    !submitted && isSelected ? 'border-text-primary dark:border-text-primary-dark text-text-primary dark:text-text-primary-dark' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (currentQuestion) onSelectOption(currentQuestion.questionId, opt.optionId);
                  }}
                >
                  <span className="w-8 h-8 rounded-lg bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {opt.label}
                  </span>
                  <span className="font-mono text-[15px] md:text-[16px]">{opt.text}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[20px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/60 dark:bg-bg-dark p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-black flex items-center gap-2 text-[15px] text-text-primary dark:text-text-primary-dark">
                <div className="w-7 h-7 rounded-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center shadow-sm">
                  <Lightbulb className="w-4 h-4 text-brand-dark dark:text-brand" />
                </div>
                智能解析
              </h4>
              <button
                type="button"
                className="text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm"
              >
                <BookmarkPlus className="w-3.5 h-3.5" /> 收入错题本
              </button>
            </div>
            <div className="text-[14px] text-text-primary/90 dark:text-text-primary-dark/90 leading-relaxed font-medium">
              {submitState && currentQuestion ? (
                <p className="leading-relaxed">
                  {judgeByQuestionId.get(currentQuestion.questionId)?.explanation ?? '暂无解析'}
                </p>
              ) : (
                <p className="leading-relaxed text-text-secondary dark:text-text-secondary-dark">
                  完成作答并提交后，将展示逐题解析与总结建议。
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-bordercolor-light dark:border-bordercolor-dark flex justify-between items-center">
            <button
              type="button"
              onClick={onPrev}
              className="px-4 py-2.5 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-secondary dark:bg-bg-dark text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              disabled={currentIndex <= 0}
            >
              <ArrowLeft className="w-4 h-4" /> 上一题
            </button>
            <button
              type="button"
              onClick={onNext}
              className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-6 py-2.5 font-bold text-[14px] hover:opacity-90 flex items-center gap-2 btn-transition shadow-md btn-hover-scale disabled:opacity-50"
              disabled={!assessment || currentIndex >= (assessment.questions.length ?? 1) - 1}
            >
              下一题 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-6 shrink-0" />
    </main>
  );
}
