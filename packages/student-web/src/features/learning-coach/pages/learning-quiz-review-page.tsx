/**
 * 文件说明：Quiz 只读回看页（Epic 8/9，Decision 1）。
 *
 * 路由 `/quiz/:sessionId/review/:quizId` 对应该页面。
 * 调 `learning-coach` 适配器的 `getQuizHistory` 拉取历史答卷，
 * 只读展示题目 / 用户选择 / 正确答案 / 解析 / 分数总结；
 * 所有交互元素全部 disabled，避免触发新的 quiz 生成。
 *
 * 视觉基准复用 `learning-assessment-page.tsx`（checkpoint/quiz 视图的精简版）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCheck, Lightbulb, X } from 'lucide-react';

import { AppBrand } from '@/components/brand/app-brand';

import { UserAvatarMenu } from '@/components/navigation/user-avatar-menu';
import { RichBlock, RichInline } from '@/components/rich-content';
import { SurfaceDock } from '@/components/surface/surface-dock';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import { ApiClientError } from '@/services/api/client';
import type { QuizHistoryPayload } from '@/types/learning';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: QuizHistoryPayload }
  | { status: 'not_found' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export function LearningQuizReviewPage() {
  const params = useParams<{ sessionId: string; quizId: string }>();
  const sessionId = params.sessionId ?? '';
  const quizId = params.quizId ?? '';

  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    if (!quizId) {
      setState({ status: 'not_found' });
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const payload = await adapter.getQuizHistory({ quizId });
        if (!cancelled) setState({ status: 'ready', payload });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError) {
          if (error.status === 404) {
            setState({ status: 'not_found' });
            return;
          }
          if (error.status === 503) {
            setState({ status: 'unavailable' });
            return;
          }
        }
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '加载失败',
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [adapter, quizId]);

  const backTo = sessionId ? `/history` : '/history';

  return (
    <div className="h-screen w-screen overflow-hidden relative selection:bg-brand/30 selection:text-text-primary flex flex-col">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/15 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <header className="relative z-20 w-full max-w-[1500px] mx-auto h-[72px] px-6 flex justify-between items-center shrink-0">
        <AppBrand to="/" size="md" hideTextOnMobile />
        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark shadow-sm btn-transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[13px] font-bold hidden sm:block">返回历史</span>
          </Link>
          <UserAvatarMenu />
        </div>
      </header>

      <div className="relative z-20 flex-1 w-full max-w-[1200px] mx-auto flex flex-col items-stretch px-4 pb-[90px] overflow-y-auto custom-scroll gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[11px] font-bold text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest shadow-sm">
              <ClipboardCheck className="w-3.5 h-3.5" /> 测验回看（只读）
            </div>
          </div>
        </div>

        {state.status === 'loading' ? (
          <div className="rounded-2xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark px-6 py-12 text-center text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
            正在加载历史答卷…
          </div>
        ) : null}

        {state.status === 'not_found' ? (
          <div className="rounded-2xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark px-6 py-12 text-center text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
            找不到该测验记录，可能已被清理或链接失效。
          </div>
        ) : null}

        {state.status === 'unavailable' ? (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 dark:bg-warning/20 px-6 py-6 text-[14px] font-medium text-text-primary dark:text-text-primary-dark shadow-sm">
            历史数据暂不可用（服务方未就绪）。请稍后重试或联系管理员确认 RuoYi 历史服务是否运行。
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-2xl border border-error/40 bg-error/10 dark:bg-error/20 px-6 py-6 text-[14px] font-medium text-text-primary dark:text-text-primary-dark shadow-sm">
            加载失败：{state.message}
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="rounded-2xl border border-bordercolor-light dark:border-bordercolor-dark bg-surface-light dark:bg-surface-dark px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black font-mono text-text-primary dark:text-text-primary-dark tracking-tighter">
                    {state.payload.score}
                    <span className="text-sm font-sans ml-0.5">分</span>
                  </span>
                  <span className="text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark">
                    正确 {state.payload.correctTotal} / {state.payload.questionTotal}
                  </span>
                </div>
                {state.payload.occurredAt ? (
                  <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70">
                    {new Date(state.payload.occurredAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
              {state.payload.summary ? (
                <p className="mt-3 text-[13px] leading-relaxed text-text-secondary dark:text-text-secondary-dark">
                  {state.payload.summary}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              {state.payload.items.map((item, index) => (
                <div
                  key={item.questionId}
                  className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-[20px] shadow-sm overflow-hidden"
                >
                  <div className="p-5 md:p-6 relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider">
                          第 {index + 1} 题
                        </span>
                        <span
                          className={
                            item.isCorrect
                              ? 'text-[11px] font-bold bg-success/15 text-success px-2 py-1 rounded-md'
                              : 'text-[11px] font-bold bg-error/15 text-error px-2 py-1 rounded-md'
                          }
                        >
                          {item.isCorrect ? '答对' : '答错'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[16px] md:text-[17px] font-bold mb-6 leading-relaxed text-text-primary dark:text-text-primary-dark">
                      <RichBlock content={item.stem} placeholder="" />
                    </div>

                    <div className="flex flex-col gap-3 mb-6">
                      {item.options.map((opt) => {
                        const isSelected = item.selectedOptionId === opt.optionId;
                        const isCorrect = item.correctOptionId === opt.optionId;
                        const isWrongSelected = isSelected && !isCorrect;

                        if (isCorrect) {
                          return (
                            <div
                              key={opt.optionId}
                              aria-disabled="true"
                              className="p-4 rounded-[14px] border-2 border-success bg-success/10 dark:bg-success/20 flex items-center justify-between shadow-sm cursor-default"
                            >
                              <div className="flex items-center gap-3 text-success">
                                <span className="w-8 h-8 rounded-lg bg-success text-white flex items-center justify-center font-bold text-sm shrink-0">
                                  {opt.label}
                                </span>
                                <RichInline
                                  content={opt.text}
                                  className="font-mono text-[14px] md:text-[15px] font-bold"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <span className="text-[11px] font-bold text-success">你的作答</span>
                                ) : null}
                                <Check className="w-5 h-5 text-success stroke-[3] shrink-0" />
                              </div>
                            </div>
                          );
                        }

                        if (isWrongSelected) {
                          return (
                            <div
                              key={opt.optionId}
                              aria-disabled="true"
                              className="p-4 rounded-[14px] border border-error/40 bg-error/10 dark:bg-error/20 flex items-center justify-between shadow-sm cursor-default"
                            >
                              <div className="flex items-center gap-3 text-error">
                                <span className="w-8 h-8 rounded-lg bg-white dark:bg-secondary border border-error/30 flex items-center justify-center font-bold text-sm shrink-0">
                                  {opt.label}
                                </span>
                                <RichInline
                                  content={opt.text}
                                  className="font-mono text-[14px] md:text-[15px] font-bold"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-error">你的作答</span>
                                <X className="w-5 h-5 text-error shrink-0" />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={opt.optionId}
                            aria-disabled="true"
                            className="p-4 rounded-[14px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/30 dark:bg-bg-dark/50 flex items-center gap-3 text-text-secondary dark:text-text-secondary-dark shadow-sm cursor-default opacity-80"
                          >
                            <span className="w-8 h-8 rounded-lg bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center font-bold text-sm shrink-0">
                              {opt.label}
                            </span>
                            <RichInline content={opt.text} className="font-mono text-[14px] md:text-[15px]" />
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-[16px] border border-bordercolor-light dark:border-bordercolor-dark bg-secondary/60 dark:bg-bg-dark p-5 shadow-sm">
                      <h4 className="font-black flex items-center gap-2 text-[14px] text-text-primary dark:text-text-primary-dark mb-3">
                        <div className="w-6 h-6 rounded-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center shadow-sm">
                          <Lightbulb className="w-3.5 h-3.5 text-brand-dark dark:text-brand" />
                        </div>
                        智能解析
                      </h4>
                      <RichBlock
                        content={item.explanation ?? '暂无解析'}
                        placeholder=""
                        className="text-[13px] text-text-primary/90 dark:text-text-primary-dark/90 leading-relaxed font-medium"
                      />

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="h-6 shrink-0" />
      </div>

      <SurfaceDock activeTooltip="测验回看" activeIcon={ClipboardCheck} />
    </div>
  );
}
