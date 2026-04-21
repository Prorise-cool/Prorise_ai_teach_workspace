/**
 * 文件说明：学习中心聚合页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：12-学习中心页/01-learning.html
 */
import { useEffect, useMemo, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { resolveLearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

import { LearningCenterContinueCard } from './learning-center-continue-card';
import { LearningCenterLibrary } from './learning-center-library';
import { LearningCenterOverview } from './learning-center-overview';
import { LearningCenterPageHeader } from './learning-center-page-header';
import { LearningCenterRecentActivity } from './learning-center-recent-activity';
import { LearningCenterSidebarPathCard } from './learning-center-sidebar-path-card';
import { LearningCenterSidebarQuizHealth } from './learning-center-sidebar-quiz-health';
import { LearningCenterSidebarRecommendation } from './learning-center-sidebar-recommendation';
import { extractFirstNumber, safeParseSourceTime } from './learning-center-utils';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

export function LearningCenterPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const adapter = useMemo(() => resolveLearningCenterAdapter(), []);

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [records, setRecords] = useState<LearningCenterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [favoritesTotal, setFavoritesTotal] = useState<number | null>(null);

  const avatarUrl = session?.user.avatarUrl ?? null;

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setViewStatus('permission-denied');
      return;
    }

    let cancelled = false;
    setViewStatus('loading');
    setFavoritesTotal(null);

    void (async () => {
      const [learningResult, favoritesResult] = await Promise.allSettled([
        adapter.getLearningPage({ userId, pageNum: 1, pageSize: 20 }),
        adapter.getFavoritesPage({ userId, pageNum: 1, pageSize: 1 }),
      ]);

      if (cancelled) return;

      if (learningResult.status === 'fulfilled') {
        setRecords(learningResult.value.rows ?? []);
        setTotal(learningResult.value.total ?? 0);
        setViewStatus('ready');
      } else {
        setViewStatus('error');
        const error = learningResult.reason;
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.loadFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.feedback.loadFailedMessage'),
        });
      }

      if (favoritesResult.status === 'fulfilled') {
        setFavoritesTotal(favoritesResult.value.total ?? 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adapter, notify, session?.user.id, t]);

  const resolveDetailTo = (record: LearningCenterRecord) => {
    if (record.detailRef?.startsWith('/')) {
      return record.detailRef;
    }

    if (record.resultType === 'video') {
      const target = record.detailRef || record.sourceResultId;
      return `/video/${encodeURIComponent(target)}`;
    }

    if (record.resultType === 'classroom') {
      return '/classroom/input';
    }

    return `/history?resultType=${encodeURIComponent(record.resultType)}`;
  };

  const latestRecord = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const aTime = safeParseSourceTime(a.sourceTime)?.getTime() ?? 0;
      const bTime = safeParseSourceTime(b.sourceTime)?.getTime() ?? 0;
      return bTime - aTime;
    });
    return sorted[0] ?? null;
  }, [records]);

  const countByType = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      counts.set(record.resultType, (counts.get(record.resultType) ?? 0) + 1);
    });
    return counts;
  }, [records]);

  const quizScore = useMemo(() => {
    const quiz = records.find((record) => record.resultType === 'quiz');
    if (!quiz) return 86;
    return extractFirstNumber(quiz.summary) ?? 86;
  }, [records]);

  const recentActivity = useMemo(() => records.slice(0, 2), [records]);

  const continueTo = latestRecord ? resolveDetailTo(latestRecord) : '/history';

  if (viewStatus === 'permission-denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-text-primary dark:text-text-primary-dark">
        <p className="text-sm font-bold">{t('learningCenter.feedback.permissionDenied')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto custom-scroll overflow-x-hidden surface-dashboard">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1200px] h-[400px] rounded-[100%] bg-brand/10 dark:bg-brand/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      </div>

      <LearningCenterPageHeader />

      <main className="w-[94%] max-w-6xl mx-auto mt-10 mb-8 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 relative z-10">
        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
          <section className="view-enter stagger-1 bg-transparent flex flex-col justify-center gap-1 mt-4 mb-2">
            <h1 className="text-[28px] md:text-3xl font-black text-text-primary dark:text-text-primary-dark tracking-tight">
              {t('learningCenter.page.greeting')}
            </h1>
            <p className="text-[15px] font-medium text-text-secondary dark:text-text-secondary-dark">
              {t('learningCenter.page.greetingSubtitle')}
            </p>
          </section>

          <LearningCenterContinueCard continueTo={continueTo} latestRecord={latestRecord} />

          <LearningCenterOverview countByType={countByType} />

          <LearningCenterLibrary total={total} favoritesTotal={favoritesTotal} />

          <LearningCenterRecentActivity viewStatus={viewStatus} recentActivity={recentActivity} resolveDetailTo={resolveDetailTo} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 pt-2">
          <LearningCenterSidebarPathCard />
          <LearningCenterSidebarQuizHealth quizScore={quizScore} />
          <LearningCenterSidebarRecommendation />
        </div>
      </main>

      <SurfaceDashboardDock active="learning" avatarUrl={avatarUrl} />
    </div>
  );
}

