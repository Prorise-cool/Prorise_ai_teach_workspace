/**
 * 文件说明：学习路径列表页（Epic 8 / xm_learning_path 消费端闭环）。
 *
 * 只读展示当前用户的所有学习路径快照；点击卡片跳详情；顶部按钮跳规划。
 * 风格对齐 history-page：GlobalTopNav + 主内容 max-w-5xl。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Plus } from 'lucide-react';

import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningPathSnapshot } from '@/types/learning';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

export function LearningPathsPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore((state) => state.session);
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [rows, setRows] = useState<LearningPathSnapshot[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setViewStatus('permission-denied');
      return;
    }

    let cancelled = false;

    (async () => {
      setViewStatus('loading');
      try {
        const page = await adapter.listPaths({ userId, pageNum: 1, pageSize: 50 });
        if (cancelled) return;
        setRows(page.rows ?? []);
        setTotal(page.total ?? 0);
        setViewStatus('ready');
      } catch (error: unknown) {
        if (cancelled) return;
        setViewStatus('error');
        notify({
          tone: 'error',
          title: '学习路径加载失败',
          description: error instanceof Error ? error.message : '稍后再试试',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, notify, session?.user.id]);

  if (viewStatus === 'permission-denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-text-primary dark:text-text-primary-dark">
        <p className="text-sm font-bold">请先登录</p>
      </div>
    );
  }

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

      <main className="w-[94%] max-w-5xl mx-auto mt-12 mb-12 pb-16 relative z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
          <div>
            <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
              学习路径
            </h1>
            <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
              小麦为你规划过的全部学习路径 · 共 {total} 条
            </p>
          </div>
          <Link
            to="/learning-paths/new"
            className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-5 py-2.5 font-bold text-[13px] btn-transition shadow-sm flex items-center gap-2 hover:opacity-80"
          >
            <Plus className="w-4 h-4" /> 规划新路径
          </Link>
        </div>

        {viewStatus === 'loading' ? (
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark">加载中…</div>
        ) : viewStatus === 'error' ? (
          <div className="text-sm text-error">加载失败，请刷新重试</div>
        ) : rows.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-10 flex flex-col items-center gap-3 shadow-sm">
            <Compass className="w-10 h-10 text-text-secondary dark:text-text-secondary-dark" />
            <p className="text-sm font-bold text-text-primary dark:text-text-primary-dark">还没有学习路径</p>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              去规划一条，让小麦陪你一步步攻坚。
            </p>
            <Link
              to="/learning-paths/new"
              className="mt-2 bg-brand text-primary-foreground rounded-lg px-4 py-2 font-bold text-[12px] hover:opacity-80 btn-transition"
            >
              去规划
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((path) => (
              <Link
                key={path.pathId}
                to={`/learning-paths/${encodeURIComponent(path.pathId)}`}
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 md:p-6 shadow-sm btn-transition hover:border-brand/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded uppercase tracking-widest">
                    Path
                  </span>
                  {path.status ? (
                    <span className="text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark border border-bordercolor-light dark:border-bordercolor-dark px-2 py-0.5 rounded">
                      {path.status}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-black mb-2 tracking-tight text-text-primary dark:text-text-primary-dark line-clamp-2">
                  {path.pathTitle ?? '未命名路径'}
                </h3>
                <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark leading-relaxed line-clamp-3">
                  {path.pathSummary ?? '暂无摘要'}
                </p>
                {path.sourceTime ? (
                  <p className="text-[11px] text-text-secondary/70 dark:text-text-secondary-dark/70 mt-3">
                    {new Date(path.sourceTime).toLocaleString()}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
