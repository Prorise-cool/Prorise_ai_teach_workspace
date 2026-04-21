/**
 * 文件说明：收藏页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：15-收藏页/01-favorites.html
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Folder,
  FolderInput,
  FolderPlus,
  LayoutTemplate,
  Leaf,
  MessageSquare,
  Paperclip,
  Play,
  PlaySquare,
  Star,
  StarOff,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { useFavoritesFolderStore } from '@/features/learning-center/stores/favorites-folder-store';
import { resolveLearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

const BUILTIN_FOLDER_SAMPLE_1 = 'builtin-folder:sample-1';
const BUILTIN_FOLDER_SAMPLE_2 = 'builtin-folder:sample-2';

function safeParseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatFavoriteTimeLabel(value: string) {
  const date = safeParseDate(value);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return '今天收藏';
  if (diffDays === 1) return '昨天收藏';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}天前收藏`;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function getTypeLabel(recordType: string) {
  switch (recordType) {
    case 'video':
      return '单题讲解';
    case 'classroom':
      return '主题课堂';
    case 'companion':
      return '伴学答疑';
    case 'quiz':
      return '测验';
    case 'evidence':
      return '依据溯源';
    default:
      return recordType;
  }
}

export function FavoritesPage() {
  const { t } = useAppTranslation();
  const { notify } = useFeedback();
  const session = useAuthSessionStore(state => state.session);
  const adapter = useMemo(() => resolveLearningCenterAdapter(), []);

  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading');
  const [records, setRecords] = useState<LearningCenterRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [activeFolderId, setActiveFolderId] = useState<'all' | string>('all');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'recent' | 'asc'>('recent');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState<LearningCenterRecord | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string>('');

  const avatarUrl = session?.user.avatarUrl ?? null;

  const storedFolders = useFavoritesFolderStore((state) =>
    session?.user.id ? state.foldersByUserId[session.user.id] ?? [] : [],
  );
  const assignments = useFavoritesFolderStore((state) =>
    session?.user.id ? state.assignmentsByUserId[session.user.id] ?? {} : {},
  );
  const createFolder = useFavoritesFolderStore(state => state.createFolder);
  const setAssignment = useFavoritesFolderStore(state => state.setAssignment);

  useEffect(() => {
    const userId = session?.user.id;
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
  }, [activeType, adapter, notify, session?.user.id, t]);

  useEffect(() => {
    if (!typeDropdownOpen) return;

    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!typeDropdownRef.current?.contains(target)) {
        setTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeDropdownOpen]);

  useEffect(() => {
    if (!sortDropdownOpen) return;

    const handler = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!sortDropdownRef.current?.contains(target)) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortDropdownOpen]);

  const folderOptions = useMemo(() => {
    const base = [
      { folderId: BUILTIN_FOLDER_SAMPLE_1, name: t('learningCenter.favorites.folderSample1') },
      { folderId: BUILTIN_FOLDER_SAMPLE_2, name: t('learningCenter.favorites.folderSample2') },
    ];

    return [
      ...base,
      ...storedFolders.map((folder) => ({ folderId: folder.folderId, name: folder.name })),
    ];
  }, [storedFolders, t]);

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    folderOptions.forEach((folder) => {
      map.set(folder.folderId, folder.name);
    });
    return map;
  }, [folderOptions]);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      const folderId = assignments[record.recordId];
      if (!folderId) return;
      counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    });
    return counts;
  }, [assignments, records]);

  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (activeType) {
      filtered = filtered.filter((record) => record.resultType === activeType);
    }

    if (activeFolderId !== 'all') {
      filtered = filtered.filter((record) => assignments[record.recordId] === activeFolderId);
    }

    const resolved = [...filtered];
    resolved.sort((a, b) => {
      const aTime = safeParseDate(a.favoriteTime ?? a.sourceTime)?.getTime() ?? 0;
      const bTime = safeParseDate(b.favoriteTime ?? b.sourceTime)?.getTime() ?? 0;
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    return resolved;
  }, [activeFolderId, activeType, assignments, records, sortOrder]);

  const title = useMemo(() => {
    if (activeFolderId === 'all') return t('learningCenter.favorites.title');
    return folderNameById.get(activeFolderId) ?? t('learningCenter.favorites.title');
  }, [activeFolderId, folderNameById, t]);

  const typeLabel = useMemo(() => {
    if (!activeType) return t('learningCenter.favorites.filterAll');
    if (activeType === 'video') return t('learningCenter.favorites.filterVideo');
    if (activeType === 'classroom') return t('learningCenter.favorites.filterClassroom');
    if (activeType === 'companion') return t('learningCenter.favorites.filterCompanion');
    return activeType;
  }, [activeType, t]);

  const sortLabel = sortOrder === 'asc' ? t('learningCenter.favorites.sortAsc') : t('learningCenter.favorites.sortRecent');

  const cancelFavorite = async (record: LearningCenterRecord) => {
    const userId = session?.user.id;
    if (!userId) return;

    try {
      await adapter.cancelFavorite({
        userId,
        sourceTable: record.sourceTable,
        sourceResultId: record.sourceResultId,
      });
      setRecords((current) => current.filter((item) => item.recordId !== record.recordId));
      setTotal((current) => Math.max(0, current - 1));
      notify({
        tone: 'success',
        title: t('learningCenter.feedback.actionSuccessTitle'),
        description: t('learningCenter.feedback.actionSuccessMessage'),
      });
    } catch (error: unknown) {
      notify({
        tone: 'error',
        title: t('learningCenter.feedback.actionFailedTitle'),
        description: error instanceof Error ? error.message : t('learningCenter.feedback.actionFailedMessage'),
      });
    }
  };

  const openMoveDialog = (record: LearningCenterRecord) => {
    setMoveTarget(record);
    setMoveFolderId(assignments[record.recordId] ?? '');
  };

  const confirmMove = () => {
    const userId = session?.user.id;
    if (!userId || !moveTarget) return;

    setAssignment(userId, moveTarget.recordId, moveFolderId || null);
    setMoveTarget(null);
    setMoveFolderId('');
    notify({
      tone: 'success',
      title: t('learningCenter.feedback.actionSuccessTitle'),
      description: t('learningCenter.favorites.moveSuccess'),
    });
  };

  const confirmCreateFolder = () => {
    const userId = session?.user.id;
    if (!userId) return;

    const created = createFolder(userId, newFolderName);
    if (!created) {
      notify({
        tone: 'error',
        title: t('learningCenter.favorites.folderCreateFailedTitle'),
        description: t('learningCenter.favorites.folderCreateFailedMessage'),
      });
      return;
    }

    setNewFolderName('');
    setCreateFolderOpen(false);
    notify({
      tone: 'success',
      title: t('learningCenter.feedback.actionSuccessTitle'),
      description: t('learningCenter.favorites.folderCreateSuccess'),
    });
  };

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

    return '/history';
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

      <header className="w-full max-w-6xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
        <Link
          to="/"
          className="font-bold text-lg flex items-center gap-3 pointer-events-auto hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-text-primary dark:bg-text-primary-dark rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4.5 h-4.5 text-bg-light dark:text-bg-dark" />
          </div>
          <span className="tracking-tight text-text-primary dark:text-text-primary-dark hidden sm:block text-xl">
            XiaoMai
          </span>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
          <Link
            to="/learning"
            className="bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm border border-bordercolor-light dark:border-bordercolor-dark btn-transition hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">{t('learningCenter.page.backToLearning')}</span>
          </Link>
        </div>
      </header>

      <main className="w-[94%] max-w-6xl mx-auto mt-12 mb-12 pb-40 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-10 relative z-10">
        <aside className="flex flex-col gap-4 view-enter stagger-1 lg:sticky lg:top-24 self-start">
          <div className="flex justify-between items-center px-4 mb-2">
            <h2 className="text-[11px] font-black tracking-widest text-text-secondary dark:text-text-secondary-dark uppercase">
              My Folders
            </h2>
            <button
              type="button"
              onClick={() => setCreateFolderOpen(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:bg-secondary dark:hover:bg-bg-dark hover:text-text-primary dark:hover:text-text-primary-dark btn-transition"
              title={t('learningCenter.favorites.createFolder')}
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFolderId('all')}
              className={
                activeFolderId === 'all'
                  ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center shadow-sm btn-transition'
                  : 'border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center btn-transition'
              }
            >
              <span className="flex items-center gap-2.5">
                <Star className="w-4 h-4 fill-surface-light dark:fill-surface-dark" /> {t('learningCenter.favorites.all')}
              </span>
              <span
                className={
                  activeFolderId === 'all'
                    ? 'text-[10px] font-black bg-surface-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm'
                    : 'text-[11px] font-bold'
                }
              >
                {total}
              </span>
            </button>

            {folderOptions.map((folder) => {
              const count = folderCounts.get(folder.folderId) ?? 0;
              const isActive = activeFolderId === folder.folderId;
              return (
                <button
                  key={folder.folderId}
                  type="button"
                  onClick={() => setActiveFolderId(folder.folderId)}
                  className={
                    isActive
                      ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center shadow-sm btn-transition'
                      : 'border border-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[14px] flex justify-between items-center btn-transition'
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4" /> {folder.name}
                  </span>
                  <span className={isActive ? 'text-[10px] font-black bg-surface-light dark:bg-surface-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm' : 'text-[11px] font-bold'}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium px-4 mt-4 leading-relaxed">
            {t('learningCenter.favorites.folderHint')}
          </p>
        </aside>

        <div className="flex flex-col gap-6 view-enter stagger-2 relative">
          <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-20">
            <div>
              <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
                {title}
              </h1>
              <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
                {t('learningCenter.favorites.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div ref={typeDropdownRef} className="relative custom-dropdown-container">
                <button
                  type="button"
                  onClick={() => {
                    setTypeDropdownOpen((current) => !current);
                    setSortDropdownOpen(false);
                  }}
                  className="dropdown-trigger flex items-center justify-between gap-3 min-w-[140px] px-4 py-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl text-[13px] font-bold text-text-primary dark:text-text-primary-dark shadow-sm transition-all outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
                >
                  <span className="dropdown-label">{typeLabel}</span>
                  <ChevronDown
                    className={
                      typeDropdownOpen
                        ? 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200 rotate-180'
                        : 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200'
                    }
                  />
                </button>
                <div
                  className={
                    typeDropdownOpen
                      ? 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-100 pointer-events-auto translate-y-0 transition-all duration-200 z-50'
                      : 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-0 pointer-events-none -translate-y-2 transition-all duration-200 z-50'
                  }
                >
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {[
                      { type: null, label: t('learningCenter.favorites.filterAll') },
                      { type: 'video', label: t('learningCenter.favorites.filterVideo') },
                      { type: 'classroom', label: t('learningCenter.favorites.filterClassroom') },
                      { type: 'companion', label: t('learningCenter.favorites.filterCompanion') },
                    ].map((item) => {
                      const isActive = (item.type ?? null) === (activeType ?? null);
                      return (
                        <button
                          key={item.type ?? 'all'}
                          type="button"
                          onClick={() => {
                            setActiveType(item.type);
                            setTypeDropdownOpen(false);
                          }}
                          className={
                            isActive
                              ? 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold bg-secondary dark:bg-bg-dark text-text-primary dark:text-text-primary-dark transition-colors'
                              : 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors'
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div ref={sortDropdownRef} className="relative custom-dropdown-container">
                <button
                  type="button"
                  onClick={() => {
                    setSortDropdownOpen((current) => !current);
                    setTypeDropdownOpen(false);
                  }}
                  className="dropdown-trigger flex items-center justify-between gap-3 min-w-[140px] px-4 py-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl text-[13px] font-bold text-text-primary dark:text-text-primary-dark shadow-sm transition-all outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
                >
                  <span className="dropdown-label">{sortLabel}</span>
                  <ChevronDown
                    className={
                      sortDropdownOpen
                        ? 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200 rotate-180'
                        : 'w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform duration-200'
                    }
                  />
                </button>
                <div
                  className={
                    sortDropdownOpen
                      ? 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-100 pointer-events-auto translate-y-0 transition-all duration-200 z-50'
                      : 'dropdown-menu absolute top-[calc(100%+6px)] left-0 min-w-full w-max bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-xl shadow-lg opacity-0 pointer-events-none -translate-y-2 transition-all duration-200 z-50'
                  }
                >
                  <div className="p-1.5 flex flex-col gap-0.5">
                    {[
                      { order: 'recent' as const, label: t('learningCenter.favorites.sortRecent') },
                      { order: 'asc' as const, label: t('learningCenter.favorites.sortAsc') },
                    ].map((item) => {
                      const isActive = item.order === sortOrder;
                      return (
                        <button
                          key={item.order}
                          type="button"
                          onClick={() => {
                            setSortOrder(item.order);
                            setSortDropdownOpen(false);
                          }}
                          className={
                            isActive
                              ? 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold bg-secondary dark:bg-bg-dark text-text-primary dark:text-text-primary-dark transition-colors'
                              : 'dropdown-item text-left px-3 py-2 rounded-lg text-[13px] font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors'
                          }
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {viewStatus === 'loading' ? (
              <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
                {t('learningCenter.page.recentLoading')}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
                {t('learningCenter.favorites.empty')}
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.recordId}
                  className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl flex flex-col hover-card-soft shadow-sm overflow-hidden group"
                >
                  <Link
                    to={resolveDetailTo(record)}
                    className={
                      record.resultType === 'companion' || record.resultType === 'evidence'
                        ? 'w-full aspect-video bg-secondary dark:bg-bg-dark flex items-center justify-center relative overflow-hidden border-b border-bordercolor-light dark:border-bordercolor-dark p-6'
                        : 'w-full aspect-video bg-secondary dark:bg-bg-dark flex items-center justify-center relative overflow-hidden border-b border-bordercolor-light dark:border-bordercolor-dark'
                    }
                  >
                    {record.resultType === 'companion' || record.resultType === 'evidence' ? (
                      <div className="flex flex-col items-center justify-center w-full h-full relative z-10 transition-transform duration-500 group-hover:scale-105">
                        <div className="w-12 h-12 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center shadow-md border border-bordercolor-light dark:border-bordercolor-dark mb-4">
                          {record.resultType === 'evidence' ? (
                            <Paperclip className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] font-black text-text-primary dark:text-text-primary-dark mb-1">
                            {record.resultType === 'evidence'
                              ? t('learningCenter.favorites.previewEvidenceTitle')
                              : t('learningCenter.favorites.previewCompanionTitle')}
                          </p>
                          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-medium line-clamp-2">
                            {record.summary}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <img
                          src={
                            record.resultType === 'classroom'
                              ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600'
                              : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600'
                          }
                          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
                          alt=""
                        />

                        <div className="w-12 h-12 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center shadow-md z-10 border border-transparent dark:border-bordercolor-dark">
                          {record.resultType === 'classroom' ? (
                            <LayoutTemplate className="w-5 h-5 text-text-primary-dark dark:text-text-primary" />
                          ) : (
                            <Play className="w-5 h-5 fill-surface-light text-surface-light ml-1" />
                          )}
                        </div>
                      </>
                    )}

                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center z-10 shadow-sm">
                      <Star className="w-4 h-4 text-brand-dark dark:text-brand fill-brand-dark dark:fill-brand" />
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={
                          record.resultType === 'classroom'
                            ? 'text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-1.5 py-0.5 rounded shadow-sm tracking-wider'
                            : 'text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded shadow-sm tracking-wider'
                        }
                      >
                        {getTypeLabel(record.resultType)}
                      </span>
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark font-bold ml-auto">
                        {formatFavoriteTimeLabel(record.favoriteTime ?? record.sourceTime)}
                      </span>
                    </div>
                    <Link
                      to={resolveDetailTo(record)}
                      className="text-[16px] font-black leading-snug mb-2 line-clamp-2 text-text-primary dark:text-text-primary-dark hover:text-brand-dark dark:hover:text-brand btn-transition"
                    >
                      {record.displayTitle}
                    </Link>
                    <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-6 line-clamp-2 font-medium">
                      {record.summary}
                      {assignments[record.recordId]
                        ? ` 当前所在文件夹：${folderNameById.get(assignments[record.recordId]) ?? ''}。`
                        : ''}
                    </p>

                    <div className="mt-auto pt-4 flex gap-3 border-t border-bordercolor-light dark:border-bordercolor-dark">
                      <button
                        type="button"
                        onClick={() => openMoveDialog(record)}
                        className="flex-1 bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary hover:bg-bordercolor-light dark:hover:text-text-primary-dark dark:hover:bg-bordercolor-dark py-2 rounded-xl text-[12px] font-bold btn-transition flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <FolderInput className="w-3.5 h-3.5" /> {t('learningCenter.favorites.move')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelFavorite(record)}
                        className="flex-1 bg-transparent border border-error/30 dark:border-error/20 text-error hover:bg-error hover:text-white dark:hover:bg-error dark:hover:text-white py-2 rounded-xl text-[12px] font-bold btn-transition flex justify-center items-center gap-1.5 shadow-sm"
                      >
                        <StarOff className="w-3.5 h-3.5" /> {t('learningCenter.favorites.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <SurfaceDashboardDock active="learning" avatarUrl={avatarUrl} />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
          <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
            {t('learningCenter.favorites.folderCreateTitle')}
          </DialogTitle>
          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5">
            {t('learningCenter.favorites.folderCreateSubtitle')}
          </p>
          <div className="mt-5">
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              className="w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-3 rounded-xl text-[13px] font-bold shadow-sm outline-none focus:border-brand dark:focus:border-brand focus:ring-4 focus:ring-brand/15"
              placeholder={t('learningCenter.favorites.folderCreatePlaceholder')}
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm"
              >
                {t('learningCenter.favorites.folderCreateCancel')}
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={confirmCreateFolder}
              className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm hover:opacity-90"
            >
              {t('learningCenter.favorites.folderCreateConfirm')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(moveTarget)} onOpenChange={(open) => (open ? null : setMoveTarget(null))}>
        <DialogContent className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 shadow-lg">
          <DialogTitle className="text-[16px] font-black text-text-primary dark:text-text-primary-dark">
            {t('learningCenter.favorites.moveTitle')}
          </DialogTitle>
          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium mt-1.5 line-clamp-2">
            {moveTarget?.displayTitle ?? ''}
          </p>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => setMoveFolderId('')}
              className={
                moveFolderId === ''
                  ? 'w-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between shadow-sm btn-transition'
                  : 'w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between btn-transition'
              }
            >
              <span className="flex items-center gap-2">
                <Folder className="w-4 h-4" /> {t('learningCenter.favorites.moveNone')}
              </span>
            </button>
            {folderOptions.map((folder) => {
              const isActive = moveFolderId === folder.folderId;
              return (
                <button
                  key={folder.folderId}
                  type="button"
                  onClick={() => setMoveFolderId(folder.folderId)}
                  className={
                    isActive
                      ? 'w-full bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between shadow-sm btn-transition'
                      : 'w-full bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-secondary dark:hover:bg-bg-dark rounded-xl px-4 py-3 font-bold text-[13px] flex items-center justify-between btn-transition'
                  }
                >
                  <span className="flex items-center gap-2">
                    <Folder className="w-4 h-4" /> {folder.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:bg-bordercolor-light dark:hover:bg-bordercolor-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm"
              >
                {t('learningCenter.favorites.moveCancel')}
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={confirmMove}
              className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-5 py-2.5 rounded-xl text-[13px] font-bold btn-transition shadow-sm hover:opacity-90"
            >
              {t('learningCenter.favorites.moveConfirm')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
