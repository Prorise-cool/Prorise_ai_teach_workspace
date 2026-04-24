/**
 * 文件说明：伴学对话回放页（Learning Center P0 闭环）。
 *
 * 路由 `/companion/replay/:sessionId`，从 RuoYi `xm_companion_turn` 读取同一
 * session 下的问答对并按时间顺序展示。用于"历史记录 / 学习中心"点击 companion
 * 记录后跳回放，而不是原视频 / 课堂页（原页看不到对话本身）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';

import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import {
  resolveCompanionAdapter,
  type CompanionHistoryTurn,
} from '@/services/api/adapters/companion-adapter';
import { useFeedback } from '@/shared/feedback';

type ViewStatus = 'loading' | 'ready' | 'error' | 'empty';

function formatTime(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export function CompanionReplayPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const { sessionId } = useParams<{ sessionId: string }>();
  const adapter = useMemo(() => resolveCompanionAdapter(), []);

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [turns, setTurns] = useState<CompanionHistoryTurn[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setViewStatus('error');
      return;
    }

    const controller = new AbortController();
    setViewStatus('loading');

    void (async () => {
      try {
        const replay = await adapter.getSessionReplay(sessionId, {
          signal: controller.signal,
        });
        const sorted = [...replay.companionTurns].sort((a, b) => {
          const at = new Date(a.createTime).getTime();
          const bt = new Date(b.createTime).getTime();
          return (Number.isFinite(at) ? at : 0) - (Number.isFinite(bt) ? bt : 0);
        });
        setTurns(sorted);
        setViewStatus(sorted.length === 0 ? 'empty' : 'ready');
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setViewStatus('error');
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.loadFailedTitle'),
          description:
            error instanceof Error ? error.message : t('learningCenter.feedback.loadFailedMessage'),
        });
      }
    })();

    return () => controller.abort();
  }, [adapter, notify, sessionId, t]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <GlobalTopNav
        links={[]}
        variant="workspace"
        workspaceRoutes={t('entryNav.workspaceRoutes', { returnObjects: true }) as WorkspaceRoute[]}
        showBrandIcon
        showAuthAction
        showLocaleToggle
        className="xm-landing-glass-nav"
      />

      <main className="w-[94%] max-w-4xl mx-auto mt-12 mb-12 pb-16 relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            to="/learning"
            className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:border-text-primary dark:hover:border-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 返回学习中心
          </Link>
          <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
            session: {sessionId}
          </span>
        </div>

        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand-dark dark:text-brand" />
          </div>
          <div>
            <h1 className="text-[20px] md:text-[22px] font-black text-text-primary dark:text-text-primary-dark">
              伴学对话回放
            </h1>
            <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
              {turns.length > 0
                ? `共 ${turns.length} 条问答`
                : '展示本次伴学会话中的问答记录'}
            </p>
          </div>
        </header>

        {viewStatus === 'loading' ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
            加载中…
          </div>
        ) : viewStatus === 'error' ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
            加载失败，请稍后重试。
          </div>
        ) : viewStatus === 'empty' ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
            本次伴学会话还没有问答记录。
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {turns.map((turn) => (
              <article
                key={turn.turnId}
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                      {turn.contextType}
                    </span>
                    {turn.anchor.scopeSummary ? (
                      <span className="text-[12px] text-text-secondary dark:text-text-secondary-dark font-medium truncate max-w-xs">
                        {turn.anchor.scopeSummary}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
                    {formatTime(turn.createTime)}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div>
                    <span className="text-[11px] font-black text-brand-dark dark:text-brand uppercase tracking-widest">
                      问
                    </span>
                    <p className="text-[14px] font-medium text-text-primary dark:text-text-primary-dark whitespace-pre-wrap mt-1">
                      {turn.questionText || '(无内容)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-text-secondary dark:text-text-secondary-dark uppercase tracking-widest">
                      答
                    </span>
                    <p className="text-[14px] text-text-primary dark:text-text-primary-dark whitespace-pre-wrap mt-1">
                      {turn.answerSummary || '(无内容)'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
