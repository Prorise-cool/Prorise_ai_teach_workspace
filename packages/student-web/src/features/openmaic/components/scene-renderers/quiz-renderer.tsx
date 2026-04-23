/**
 * 测验场景渲染器（对齐后端真实 shape）。
 *
 * 后端 scene.content = {
 *   questions: [{
 *     id, type: "single"|"multiple"|"short_answer",
 *     stem: "题干",
 *     options?: [{ id: "opt_a", label: "A", content: "选项内容" }],
 *     correctAnswers?: ["opt_b"],
 *     explanation?: "解析",
 *     points?: number
 *   }]
 * }
 */
import { Check, ChevronRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FC } from 'react';

import { gradeQuiz } from '../../api/openmaic-adapter';
import type { QuizGradeResult } from '../../types/quiz';

interface QuizOption {
  id: string;
  label: string;
  content: string;
}

interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  stem: string;
  options?: QuizOption[];
  correctAnswers?: string[];
  explanation?: string;
  points?: number;
}

interface QuizContent {
  questions: QuizQuestion[];
}

interface QuizRendererProps {
  content: QuizContent;
  sceneTitle: string;
  sceneOrder: number;
}

export const QuizRenderer: FC<QuizRendererProps> = ({ content, sceneTitle, sceneOrder }) => {
  const questions = content?.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [results, setResults] = useState<Record<string, QuizGradeResult>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionSelect = useCallback(
    (questionId: string, optionId: string, type: 'single' | 'multiple') => {
      if (submitted) return;
      if (type === 'single') {
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
      } else {
        setAnswers((prev) => {
          const current = (prev[questionId] as string[]) ?? [];
          const next = current.includes(optionId)
            ? current.filter((v) => v !== optionId)
            : [...current, optionId];
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
    const grades: Record<string, QuizGradeResult> = {};

    for (const q of questions) {
      const answer = answers[q.id];
      if (answer === undefined || answer === '' || (Array.isArray(answer) && !answer.length)) continue;

      if (q.type === 'short_answer') {
        try {
          const result = await gradeQuiz({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            question: q as any,
            studentAnswer: String(answer),
          });
          grades[q.id] = result;
        } catch {
          grades[q.id] = { correct: false, feedback: '评分服务暂不可用' };
        }
      } else {
        const correct = q.correctAnswers ?? [];
        const student = Array.isArray(answer) ? answer : [answer];
        const pass =
          correct.length === student.length && correct.every((a) => student.includes(a));
        const correctLabels = q.options
          ? correct
              .map((cid) => q.options!.find((o) => o.id === cid)?.label ?? cid)
              .join('、')
          : correct.join('、');
        grades[q.id] = {
          correct: pass,
          feedback: pass ? '回答正确！' : `正确答案是：${correctLabels}`,
        };
      }
    }

    setResults(grades);
    setSubmitted(true);
    setIsGrading(false);
  }, [answers, questions]);

  const totalScore = Object.values(results).filter((r) => r.correct).length;

  if (questions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        没有可作答的题目
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          SCENE {String(sceneOrder).padStart(2, '0')} · QUIZ
        </span>
        {submitted && (
          <span className="ml-auto text-xs font-bold text-primary">
            {totalScore} / {questions.length} 正确
          </span>
        )}
      </div>

      <div className="flex-1 space-y-6 px-5 py-4">
        <h2 className="text-xl font-bold text-foreground">{sceneTitle}</h2>

        {questions.map((q, i) => {
          const answer = answers[q.id];
          const result = results[q.id];

          return (
            <div key={q.id} className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-xs font-bold text-primary">Q{i + 1}</span>
                <p className="text-sm font-medium leading-relaxed text-foreground">{q.stem}</p>
              </div>

              {q.options && (q.type === 'single' || q.type === 'multiple') && (
                <div className="space-y-2">
                  {q.options.map((option) => {
                    const isSelected = Array.isArray(answer)
                      ? answer.includes(option.id)
                      : answer === option.id;
                    const isCorrect = q.correctAnswers?.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          handleOptionSelect(q.id, option.id, q.type as 'single' | 'multiple')
                        }
                        disabled={submitted}
                        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
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
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold">
                          {submitted && isCorrect ? <Check className="h-3 w-3" /> : option.label}
                        </span>
                        <span className="flex-1 leading-relaxed">{option.content}</span>
                      </button>
                    );
                  })}
                </div>
              )}

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

              {result && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    result.correct
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  <div className="font-bold">{result.feedback}</div>
                  {q.explanation && (
                    <p className="mt-1 text-[11px] opacity-80">解析：{q.explanation}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
