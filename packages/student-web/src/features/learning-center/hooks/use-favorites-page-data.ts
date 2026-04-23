import { useEffect, useState } from 'react';

import type { LearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import type { LearningCenterFavoriteFolderState, LearningCenterRecord } from '@/types/learning-center';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

type NotifyPayload = {
  tone: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
};

type UseFavoritesPageDataOptions = {
  userId: string | null;
  adapter: LearningCenterAdapter;
  activeType: string | null;
  notify: (payload: NotifyPayload) => void;
  t: (key: string) => string;
};

export function useFavoritesPageData({
  userId,
  adapter,
  activeType,
  notify,
  t,
}: UseFavoritesPageDataOptions) {
  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [records, setRecords] = useState<LearningCenterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [folderState, setFolderState] = useState<LearningCenterFavoriteFolderState>({ folders: [], assignments: {} });

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void adapter
      .getFavoriteFolderState({ userId })
      .then((state) => {
        if (cancelled) return;
        setFolderState(state);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.loadFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.feedback.loadFailedMessage'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, notify, t, userId]);

  useEffect(() => {
    if (!userId) {
      setViewStatus('permission-denied');
      return;
    }

    let cancelled = false;
    setViewStatus('loading');

    adapter
      .getFavoritesPage({ userId, pageNum: 1, pageSize: 200, resultType: activeType })
      .then((page) => {
        if (cancelled) return;
        setRecords(page.rows ?? []);
        setTotal(page.total ?? 0);
        setViewStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setViewStatus('error');
        notify({
          tone: 'error',
          title: t('learningCenter.feedback.loadFailedTitle'),
          description: error instanceof Error ? error.message : t('learningCenter.feedback.loadFailedMessage'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeType, adapter, notify, t, userId]);

  return {
    viewStatus,
    records,
    total,
    folderState,
    setRecords,
    setTotal,
    setFolderState,
  };
}

