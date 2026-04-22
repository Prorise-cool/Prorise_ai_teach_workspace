/**
 * 文件说明：历史记录页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：14-历史记录页/01-history.html
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { GlobalTopNav, type WorkspaceRoute } from '@/components/navigation/global-top-nav';
import { resolveLearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

import { buildHistoryTimeRange } from './history-utils';
import { HistoryFilterBar } from './history-filter-bar';
import { HistoryPageHeader } from './history-page-header';
import { HistoryPagination } from './history-pagination';
import { HistoryRecordList } from './history-record-list';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';
type HistoryTimeRange = '7d' | '30d' | 'all';

export function HistoryPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const adapter = useMemo(() => resolveLearningCenterAdapter(), []);
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [records, setRecords] = useState<LearningCenterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(6);
  const [timeRange, setTimeRange] = useState<HistoryTimeRange>('7d');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const avatarUrl = session?.user.avatarUrl ?? null;

  useEffect(() => {
    const fromQuery = searchParams.get('resultType');
    if (fromQuery) {
      setActiveType(fromQuery);
    }
  }, [searchParams]);

  const timeRangeQuery = useMemo(() => buildHistoryTimeRange(timeRange), [timeRange]);

  const loadPage = useMemo(() => {
    return async (nextPageNum: number) => {
      const userId = session?.user.id;
      if (!userId) {
        setViewStatus('permission-denied');
        return;
      }

      setViewStatus('loading');

      try {
        const page = await adapter.getHistoryPage({
          userId,
          pageNum: nextPageNum,
          pageSize,
          resultType: activeType,
          beginSourceTime: timeRangeQuery.begin,
          endSourceTime: timeRangeQuery.end,
        });

        setRecords(page.rows ?? []);
        setTotal(page.total ?? 0);
        setViewStatus('ready');
      } catch (error: unknown) {
        setViewStatus('error');
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.loadFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.feedback.loadFailedMessage'),
        });
      }
    };
  }, [activeType, adapter, notify, pageSize, session?.user.id, t, timeRangeQuery.begin, timeRangeQuery.end]);

  useEffect(() => {
    void loadPage(pageNum);
  }, [loadPage, pageNum]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setTypeFilter = (nextType: string | null) => {
    setActiveType(nextType);
    setPageNum(1);
    if (nextType) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('resultType', nextType);
        return next;
      });
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('resultType');
        return next;
      });
    }
  };

  const toggleFavorite = async (record: LearningCenterRecord) => {
    const userId = session?.user.id;
    if (!userId) return;

    const action = {
      userId,
      sourceTable: record.sourceTable,
      sourceResultId: record.sourceResultId,
    };

    try {
      if (record.favorite) {
        await adapter.cancelFavorite(action);
      } else {
        await adapter.favorite(action);
      }

      setRecords((current) =>
        current.map((item) =>
          item.recordId === record.recordId ? { ...item, favorite: !record.favorite } : item,
        ),
      );
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('learningCenter.feedback.actionFailedTitle'),
        description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
      });
    }
  };

  const removeHistory = async (record: LearningCenterRecord) => {
    const userId = session?.user.id;
    if (!userId) return;

    const action = {
      userId,
      sourceTable: record.sourceTable,
      sourceResultId: record.sourceResultId,
    };

    try {
      await adapter.removeHistory(action);
      setRecords((current) => current.filter((item) => item.recordId !== record.recordId));
      setTotal((current) => Math.max(0, current - 1));
      notify({
        tone: 'success',
        title: t('learningCenter.feedback.removeSuccessTitle'),
        description: t('learningCenter.feedback.removeSuccessMessage'),
      });
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('learningCenter.feedback.actionFailedTitle'),
        description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
      });
    }
  };

  const clearCurrentPage = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    if (records.length === 0) return;

    setIsClearing(true);

    try {
      for (const record of records) {
        await adapter.removeHistory({
          userId,
          sourceTable: record.sourceTable,
          sourceResultId: record.sourceResultId,
        });
      }

      setRecords([]);
      setTotal((current) => Math.max(0, current - records.length));
      notify({
        tone: 'success',
        title: t('learningCenter.feedback.clearSuccessTitle'),
        description: t('learningCenter.feedback.clearSuccessMessage'),
      });
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('learningCenter.feedback.actionFailedTitle'),
        description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
      });
    } finally {
      setIsClearing(false);
    }
  };

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
        <HistoryPageHeader
          isClearing={isClearing}
          canClear={records.length > 0}
          onClear={() => void clearCurrentPage()}
          t={t}
        />

        <HistoryFilterBar
          activeType={activeType}
          total={total}
          timeRange={timeRange}
          onSelectType={setTypeFilter}
          onSelectTimeRange={setTimeRange}
          t={t}
        />

        <HistoryRecordList
          viewStatus={viewStatus}
          records={records}
          t={t}
          onToggleFavorite={toggleFavorite}
          onRemoveHistory={removeHistory}
        />

        <HistoryPagination
          pageNum={pageNum}
          totalPages={totalPages}
          onSelectPage={setPageNum}
          onPrev={() => setPageNum((current) => Math.max(1, current - 1))}
          onNext={() => setPageNum((current) => Math.min(totalPages, current + 1))}
          t={t}
        />
      </main>
    </div>
  );
}

