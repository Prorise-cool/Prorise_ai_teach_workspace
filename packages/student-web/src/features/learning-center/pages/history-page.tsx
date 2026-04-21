/**
 * 文件说明：历史记录页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：14-历史记录页/01-history.html
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  FileCheck2,
  FileText,
  History,
  LayoutTemplate,
  Leaf,
  MessageSquare,
  MessagesSquare,
  Play,
  PlayCircle,
  PlaySquare,
  Star,
  Trash2,
} from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { SurfaceDashboardDock } from '@/components/surface/surface-dashboard-dock';
import { resolveLearningCenterAdapter } from '@/services/api/adapters/learning-center-adapter';
import { useFeedback } from '@/shared/feedback';
import { useAuthSessionStore } from '@/stores/auth-session-store';
import type { LearningCenterRecord } from '@/types/learning-center';

type ViewStatus = 'loading' | 'ready' | 'error' | 'permission-denied';

function safeParseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortTime(value: string) {
  const date = safeParseDate(value);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (diffDays === 0) return `今天 ${hh}:${mm}`;
  if (diffDays === 1) return `昨天 ${hh}:${mm}`;
  if (diffDays > 1 && diffDays < 7) return `${diffDays}天前`;
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
    case 'quiz':
      return '课后测验';
    case 'checkpoint':
      return 'Checkpoint';
    case 'companion':
      return '伴学答疑';
    case 'evidence':
      return '依据溯源';
    case 'wrongbook':
      return '错题本';
    case 'path':
      return '学习路径';
    case 'recommendation':
      return '推荐';
    default:
      return recordType;
  }
}

function extractFirstNumber(value: string) {
  const match = value.match(/(\d{1,3})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildTimeRange(timeRange: string) {
  if (timeRange === 'all') {
    return { begin: null, end: null };
  }

  const days = timeRange === '30d' ? 30 : 7;
  const end = new Date();
  const begin = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pad = (value: number) => String(value).padStart(2, '0');
  const format = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return {
    begin: format(begin),
    end: format(end),
  };
}

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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const avatarUrl = session?.user.avatarUrl ?? null;

  useEffect(() => {
    const fromQuery = searchParams.get('resultType');
    if (fromQuery) {
      setActiveType(fromQuery);
    }
  }, [searchParams]);

  const timeRangeQuery = useMemo(() => buildTimeRange(timeRange), [timeRange]);

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

      <header className="w-full max-w-5xl mx-auto mt-6 px-6 z-40 relative flex justify-between items-start pointer-events-none">
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
            className="bg-surface-light dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-2 shadow-sm border border-bordercolor-light dark:border-bordercolor-dark transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">{t('learningCenter.page.backToLearning')}</span>
          </Link>
        </div>
      </header>

      <main className="w-[94%] max-w-5xl mx-auto mt-12 mb-12 pb-40 relative z-10 flex flex-col gap-6">
        <div className="view-enter stagger-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
          <div>
            <h1 className="text-[28px] md:text-3xl font-black mb-2 text-text-primary dark:text-text-primary-dark tracking-tight">
              {t('learningCenter.history.title')}
            </h1>
            <p className="text-[14px] font-medium text-text-secondary dark:text-text-secondary-dark">
              {t('learningCenter.history.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void clearCurrentPage()}
            disabled={isClearing || records.length === 0}
            className="bg-error/10 dark:bg-error/20 border border-error/30 dark:border-error/20 text-error hover:bg-error hover:text-white dark:hover:bg-error dark:hover:text-white rounded-xl px-5 py-2.5 font-bold text-[13px] btn-transition shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" /> {isClearing ? t('learningCenter.history.clearing') : t('learningCenter.history.clear')}
          </button>
        </div>

        <div className="view-enter stagger-2 sticky top-4 z-30 bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-bordercolor-light dark:border-bordercolor-dark flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={
                activeType === null
                  ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
                  : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
              }
            >
              {t('learningCenter.history.filterAll')} ({total})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('video')}
              className={
                activeType === 'video'
                  ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
                  : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              }
            >
              <PlaySquare className="w-3.5 h-3.5" /> {t('learningCenter.history.filterVideo')}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('classroom')}
              className={
                activeType === 'classroom'
                  ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
                  : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              }
            >
              <LayoutTemplate className="w-3.5 h-3.5" /> {t('learningCenter.history.filterClassroom')}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('quiz')}
              className={
                activeType === 'quiz'
                  ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
                  : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              }
            >
              <FileText className="w-3.5 h-3.5" /> {t('learningCenter.history.filterQuiz')}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('companion')}
              className={
                activeType === 'companion'
                  ? 'shrink-0 bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
                  : 'shrink-0 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm btn-transition flex items-center gap-1.5'
              }
            >
              <MessageSquare className="w-3.5 h-3.5" /> {t('learningCenter.history.filterCompanion')}
            </button>
          </div>

          <div className="relative shrink-0 w-full md:w-auto">
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as '7d' | '30d' | 'all')}
              className="w-full md:w-auto bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 pr-10 rounded-lg text-[13px] font-bold shadow-sm outline-none cursor-pointer"
            >
              <option value="7d">{t('learningCenter.history.range7d')}</option>
              <option value="30d">{t('learningCenter.history.range30d')}</option>
              <option value="all">{t('learningCenter.history.rangeAll')}</option>
            </select>
            <ChevronDown className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-4 view-enter stagger-3">
          {viewStatus === 'loading' ? (
            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
              {t('learningCenter.page.recentLoading')}
            </div>
          ) : records.length === 0 ? (
            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark shadow-sm">
              {t('learningCenter.history.empty')}
            </div>
          ) : (
            records.map((record) => {
              if (record.resultType === 'video') {
                return (
                  <div
                    key={record.recordId}
                    className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
                  >
                    <div className="w-full sm:w-40 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center relative overflow-hidden shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity"
                        alt=""
                      />
                      <div className="w-10 h-10 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center border border-transparent dark:border-bordercolor-dark z-10 shadow-md">
                        <Play className="w-4 h-4 fill-surface-light text-surface-light ml-0.5" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 w-full h-full justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                              {getTypeLabel(record.resultType)}
                            </span>
                            <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark truncate max-w-[200px] md:max-w-sm">
                              {record.displayTitle}
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
                            {formatShortTime(record.sourceTime)}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
                          {record.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-2 border-t border-bordercolor-light dark:border-bordercolor-dark md:border-t-0 md:border-transparent">
                        <Link
                          to={`/video/${record.detailRef}`}
                          className="bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 btn-transition shadow-sm flex items-center gap-1.5"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> {t('learningCenter.history.playback')}
                        </Link>
                        <div className="flex items-center gap-4 text-[12px] font-bold">
                          <button
                            type="button"
                            onClick={() => void toggleFavorite(record)}
                            className={
                              record.favorite
                                ? 'text-brand-dark dark:text-brand flex items-center gap-1'
                                : 'text-text-secondary dark:text-text-secondary-dark hover:text-brand-dark dark:hover:text-brand btn-transition flex items-center gap-1'
                            }
                          >
                            <Star className={record.favorite ? 'w-3.5 h-3.5 fill-brand' : 'w-3.5 h-3.5'} />{' '}
                            {record.favorite ? t('learningCenter.history.favorited') : t('learningCenter.history.favorite')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeHistory(record)}
                            className="text-text-secondary dark:text-text-secondary-dark hover:text-error dark:hover:text-error btn-transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {t('learningCenter.history.remove')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (record.resultType === 'classroom') {
                return (
                  <div
                    key={record.recordId}
                    className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
                  >
                    <div className="w-full sm:w-40 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center relative overflow-hidden shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400"
                        className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity"
                        alt=""
                      />
                      <div className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark z-10 shadow-md">
                        <LayoutTemplate className="w-4 h-4 text-text-primary dark:text-text-primary-dark" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 w-full h-full justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                              {getTypeLabel(record.resultType)}
                            </span>
                            <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark truncate max-w-[200px] md:max-w-sm">
                              {record.displayTitle}
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
                            {formatShortTime(record.sourceTime)}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
                          {record.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-2 border-t border-bordercolor-light dark:border-bordercolor-dark md:border-t-0 md:border-transparent">
                        <Link
                          to="/classroom/input"
                          className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:border-text-primary dark:hover:border-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5"
                        >
                          {t('learningCenter.history.continueLearning')}{' '}
                          <span className="inline-flex items-center">
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </span>
                        </Link>
                        <div className="flex items-center gap-4 text-[12px] font-bold">
                          <button
                            type="button"
                            onClick={() => void toggleFavorite(record)}
                            className={
                              record.favorite
                                ? 'text-brand-dark dark:text-brand flex items-center gap-1'
                                : 'text-text-secondary dark:text-text-secondary-dark hover:text-brand-dark dark:hover:text-brand btn-transition flex items-center gap-1'
                            }
                          >
                            <Star className={record.favorite ? 'w-3.5 h-3.5 fill-brand' : 'w-3.5 h-3.5'} />{' '}
                            {record.favorite ? t('learningCenter.history.favorited') : t('learningCenter.history.favorite')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeHistory(record)}
                            className="text-text-secondary dark:text-text-secondary-dark hover:text-error dark:hover:text-error btn-transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {t('learningCenter.history.remove')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (record.resultType === 'quiz') {
                const score = extractFirstNumber(record.summary) ?? 86;
                return (
                  <div
                    key={record.recordId}
                    className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
                  >
                    <div className="w-full sm:w-40 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex flex-col items-center justify-center shrink-0">
                      <span className="text-3xl font-black font-mono text-text-primary dark:text-text-primary-dark tracking-tighter">
                        {score}
                        <span className="text-sm font-sans ml-0.5">分</span>
                      </span>
                      <span className="text-[11px] font-bold text-error mt-1 bg-error/10 dark:bg-error/20 px-2 py-0.5 rounded">
                        {t('learningCenter.history.quizBadge')}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 w-full h-full justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                              {getTypeLabel(record.resultType)}
                            </span>
                            <h3 className="text-[16px] font-black text-text-primary dark:text-text-primary-dark truncate max-w-[200px] md:max-w-sm">
                              {record.displayTitle}
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
                            {formatShortTime(record.sourceTime)}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
                          {record.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-2 border-t border-bordercolor-light dark:border-bordercolor-dark md:border-t-0 md:border-transparent">
                        <Link
                          to={`/quiz/${record.sourceSessionId}`}
                          className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:border-text-primary dark:hover:border-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> {t('learningCenter.history.quizReview')}
                        </Link>
                        <div className="flex items-center gap-4 text-[12px] font-bold">
                          <button
                            type="button"
                            onClick={() => void removeHistory(record)}
                            className="text-text-secondary dark:text-text-secondary-dark hover:text-error dark:hover:text-error btn-transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {t('learningCenter.history.remove')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={record.recordId}
                  className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark hover-card-soft rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row gap-5 md:gap-6 items-start sm:items-center shadow-sm"
                >
                  <div className="w-full sm:w-40 h-24 bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center shrink-0">
                    <MessageSquare className="w-8 h-8 text-text-secondary dark:text-text-secondary-dark opacity-50" />
                  </div>

                  <div className="flex-1 flex flex-col gap-1 w-full h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-widest">
                            {getTypeLabel(record.resultType)}
                          </span>
                          <h3 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark truncate max-w-[200px] md:max-w-sm">
                            {record.displayTitle}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-text-secondary/70 dark:text-text-secondary-dark/70 shrink-0">
                          {formatShortTime(record.sourceTime)}
                        </span>
                      </div>
                      <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark font-medium">
                        {record.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-2 border-t border-bordercolor-light dark:border-bordercolor-dark md:border-t-0 md:border-transparent">
                      <Link
                        to="/history"
                        className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark px-4 py-2 rounded-lg text-[12px] font-bold hover:border-text-primary dark:hover:border-text-primary-dark btn-transition shadow-sm flex items-center gap-1.5"
                      >
                        <MessagesSquare className="w-3.5 h-3.5" /> {t('learningCenter.history.openDetail')}
                      </Link>
                      <div className="flex items-center gap-4 text-[12px] font-bold">
                        <button
                          type="button"
                          onClick={() => void toggleFavorite(record)}
                          className={
                            record.favorite
                              ? 'text-brand-dark dark:text-brand flex items-center gap-1'
                              : 'text-text-secondary dark:text-text-secondary-dark hover:text-brand-dark dark:hover:text-brand btn-transition flex items-center gap-1'
                          }
                        >
                          <Star className={record.favorite ? 'w-3.5 h-3.5 fill-brand' : 'w-3.5 h-3.5'} />{' '}
                          {record.favorite ? t('learningCenter.history.favorited') : t('learningCenter.history.favorite')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeHistory(record)}
                          className="text-text-secondary dark:text-text-secondary-dark hover:text-error dark:hover:text-error btn-transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {t('learningCenter.history.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 flex justify-center view-enter stagger-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPageNum((current) => Math.max(1, current - 1))}
              disabled={pageNum <= 1}
              className="bg-secondary dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary/50 dark:text-text-secondary-dark/50 px-3 py-1.5 rounded-lg text-[13px] font-bold shadow-sm disabled:cursor-not-allowed"
            >
              {t('learningCenter.history.prev')}
            </button>
            {Array.from({ length: Math.min(3, totalPages) }).map((_, index) => {
              const page = index + 1;
              const active = page === pageNum;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPageNum(page)}
                  className={
                    active
                      ? 'bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-3.5 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
                      : 'bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark px-3.5 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition'
                  }
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPageNum((current) => Math.min(totalPages, current + 1))}
              disabled={pageNum >= totalPages}
              className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark text-text-primary dark:text-text-primary-dark hover:border-text-primary dark:hover:border-text-primary-dark px-3 py-1.5 rounded-lg text-[13px] font-bold shadow-sm btn-transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t('learningCenter.history.next')}
            </button>
          </div>
        </div>
      </main>

      <SurfaceDashboardDock active="learning" avatarUrl={avatarUrl} />
    </div>
  );
}
