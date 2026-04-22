/**
 * 测验场景渲染器。
 * 展示单选/多选/简答题，支持 AI 评分。
 */
import { Check, ChevronRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FC } from 'react';

import { gradeQuiz } from '../../api/openmaic-adapter';
import type { QuizContent } from '../../types/scene';
import type { QuizGradeResult } from '../../types/quiz';

interface QuizRendererProps {
  content: QuizContent;
  sceneTitle: string;
  sceneOrder: number;
}

export const QuizRenderer: FC<QuizRendererProps> = ({ content, sceneTitle, sceneOrder }) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [results, setResults] = useState<Record<string, QuizGradeResult>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionSelect = useCallback(
    (questionId: string, value: string, type: 'single' | 'multiple') => {
      if (submitted) return;
      if (type === 'single') {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
      } else {
        setAnswers((prev) => {
          const current = (prev[questionId] as string[]) ?? [];
          const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
          return { ...prev, [questionId]: next };
        });
      }
    },
    [submitted],
  );

  const handleTextAnswer = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsGrading(true);
    const gradeResults: Record<string, QuizGradeResult> = {};

    for (const question of content.questions) {
      const answer = answers[question.id];
      if (!answer) continue;

      if (question.type === 'short_answer') {
        try {
          const result = await gradeQuiz({
            question,
            studentAnswer: String(answer),
          });
          gradeResults[question.id] = result;
        } catch {
          gradeResults[question.id] = { correct: false, feedback: '评分服务暂不可用' };
        }
      } else {
        // 客户端自动评分（选择题）
        const correctAnswers = question.answer ?? [];
        const studentAnswers = Array.isArray(answer) ? answer : [answer];
        const correct =
          correctAnswers.length === studentAnswers.length &&
          correctAnswers.every((a) => studentAnswers.includes(a));
        gradeResults[question.id] = {
          correct,
          feedback: correct ? '回答正确！' : `正确答案是：${correctAnswers.join('、')}`,
        };
      }
    }

    setResults(gradeResults);
    setSubmitted(true);
    setIsGrading(false);
  }, [answers, content.questions]);

  const totalScore = Object.values(results).filter((r) => r.correct).length;
  const totalQuestions = content.questions.length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · QUIZ
        </span>
        {submitted && (
          <span className="ml-auto text-xs font-bold text-primary">
            {totalScore} / {totalQuestions} 正确
          </span>
        )}
      </div>

      <div className="flex-1 space-y-6 px-5 py-4">
        <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>

        {content.questions.map((q, i) => {
          const answer = answers[q.id];
          const result = results[q.id];

          return (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-xs font-bold text-primary">Q{i + 1}</span>
                <p className="text-sm font-medium text-foreground">{q.question}</p>
              </div>

              {/* 选择题选项 */}
              {q.options && (q.type === 'single' || q.type === 'multiple') && (
                <div className="space-y-2">
                  {q.options.map((option) => {
                    const isSelected = Array.isArray(answer)
                      ? answer.includes(option.value)
                      : answer === option.value;
                    const isCorrect = q.answer?.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleOptionSelect(q.id, option.value, q.type as 'single' | 'multiple')}
                        disabled={submitted}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          submitted
                            ? isCorrect
                              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : isSelected && !isCorrect
                              ? 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'border-border bg-muted/30 text-muted-foreground'
                            : isSelected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold">
                          {submitted && isCorrect ? <Check className="h-3 w-3" /> : option.value}
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 简答题 */}
              {q.type === 'short_answer' && (
                <textarea
                  value={(answer as string) ?? ''}
                  onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                  disabled={submitted}
                  placeholder="请输入你的回答..."
                  className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                  rows={3}
                />
              )}

              {/* 评分反馈 */}
              {result && (
                <div
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    result.correct
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {result.feedback}
                  {q.analysis && <p className="mt-1 text-[11px] opacity-80">{q.analysis}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提交按钮 */}
      {!submitted && (
        <div className="shrink-0 border-t border-border p-4">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isGrading || Object.keys(answers).length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-50"
          >
            {isGrading ? '评分中...' : '提交答案'}
            {!isGrading && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
