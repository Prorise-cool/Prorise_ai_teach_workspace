/**
 * 文件说明：学习路径详情页（Epic 8 消费端闭环）。
 *
 * 数据源：
 *  - 元信息（title / summary / status / sourceType）走 FastAPI `GET /learning-coach/paths/{pathId}`；
 *  - 阶段明细（stages/steps）目前仅驻内存 + localStorage，xm_learning_path 表里没存 json，
 *    读不到时只展示元信息 + 提示。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveLearningCoachAdapter } from '@/services/api/adapters/learning-coach-adapter';
import { useFeedback } from '@/shared/feedback';
import type { LearningPathPlanPayload, LearningPathSnapshot } from '@/types/learning';

type ViewStatus = 'loading' | 'ready' | 'error' | 'not-found';

const STORAGE_KEY_PREFIX = 'xm_learning_path_plan:';

function readStoredPlan(pathId: string): LearningPathPlanPayload | null {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${pathId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LearningPathPlanPayload;
  } catch {
    return null;
  }
}

export function LearningPathDetailPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const { pathId } = useParams<{ pathId: string }>();
  const adapter = useMemo(() => resolveLearningCoachAdapter(), []);

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [snapshot, setSnapshot] = useState<LearningPathSnapshot | null>(null);
  const [localPlan, setLocalPlan] = useState<LearningPathPlanPayload | null>(null);

  useEffect(() => {
    if (!pathId) {
      setViewStatus('not-found');
      return;
    }

    setLocalPlan(readStoredPlan(pathId));

    let cancelled = false;

    (async () => {
      setViewStatus('loading');
      try {
        const detail = await adapter.getPath({ pathId });
        if (cancelled) return;
        setSnapshot(detail);
        setViewStatus('ready');
      } catch (error: unknown) {
        if (cancelled) return;
        // Simple check for 404 vs generic error
        const msg = error instanceof Error ? error.message : '';
        if (/not.*found|404/i.test(msg)) {
          setViewStatus('not-found');
        } else {
          setViewStatus('error');
          notify({
            tone: 'error',
            title: '学习路径加载失败',
            description: msg || '稍后再试试',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, notify, pathId]);

  const title = snapshot?.pathTitle ?? localPlan?.pathTitle ?? '学习路径详情';
  const summary = snapshot?.pathSummary ?? localPlan?.pathSummary ?? '';
  const stages = localPlan?.stages ?? [];

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
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
        <Link
          to="/learning-paths"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 返回路径列表
        </Link>

        {viewStatus === 'loading' ? (
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark">加载中…</div>
        ) : viewStatus === 'not-found' ? (
          <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-10 shadow-sm">
            <p className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
              找不到这条学习路径
            </p>
            <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mt-2">
              可能已被清理，或链接有误。
            </p>
          </div>
        ) : (
          <>
            <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded uppercase tracking-widest">
                  Target Path
                </span>
                {snapshot?.status ? (
                  <span className="text-[10px] font-bold text-text-secondary dark:text-text-secondary-dark border border-bordercolor-light dark:border-bordercolor-dark px-2 py-0.5 rounded">
                    {snapshot.status}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-4 text-text-primary dark:text-text-primary-dark">
                {title}
              </h1>
              <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark leading-relaxed max-w-2xl font-medium whitespace-pre-line">
                {summary || '暂无摘要'}
              </p>
            </section>

            <section className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-10 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-6">
                Milestones
              </h3>

              {stages.length === 0 ? (
                <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark">
                  阶段明细不在持久层存储；仅规划当次可见。要重新查看阶段结构，请
                  <Link to="/learning-paths/new" className="text-brand font-bold hover:underline">
                    重新规划
                  </Link>
                  。
                </p>
              ) : (
                <div className="flex flex-col">
                  {stages.map((stage, idx) => (
                    <div key={`${stage.title}-${idx}`} className="flex gap-4 md:gap-6 relative">
                      <div className="flex flex-col items-center relative z-10 w-10 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-brand text-primary-foreground flex items-center justify-center border-2 border-surface-light dark:border-surface-dark shrink-0">
                          <MapPin className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        {idx < stages.length - 1 ? (
                          <div className="w-[2px] flex-1 mt-1 bg-bordercolor-light dark:bg-bordercolor-dark opacity-80" />
                        ) : null}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded">
                            阶段 {idx + 1}
                          </span>
                          <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
                            {stage.title}
                          </h3>
                        </div>
                        <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark mb-3 leading-relaxed">
                          {stage.goal}
                        </p>
                        <ul className="space-y-2">
                          {stage.steps.map((step, stepIdx) => (
                            <li
                              key={`${step.title}-${stepIdx}`}
                              className="text-[13px] text-text-primary dark:text-text-primary-dark"
                            >
                              <span className="font-bold">· {step.title}</span>
                              <span className="text-text-secondary dark:text-text-secondary-dark"> —— {step.action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
