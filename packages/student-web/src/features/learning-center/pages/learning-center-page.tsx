/**
 * 文件说明：学习中心聚合页（Epic 9）。
 * 视觉结构直接对齐 Ux 成品页：12-学习中心页/01-learning.html
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookX,
  Bot,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  History,
  LayoutTemplate,
  Leaf,
  MessageSquare,
  Paperclip,
  Play,
  PlaySquare,
  Sparkles,
  Star,
  TrendingUp,
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

function getRecordTypeLabel(recordType: string) {
  switch (recordType) {
    case 'video':
      return '单题讲解';
    case 'classroom':
      return '主题课堂';
    case 'companion':
      return '伴学答疑';
    case 'evidence':
      return 'Evidence';
    case 'checkpoint':
      return 'Checkpoint';
    case 'quiz':
      return 'Quiz';
    case 'path':
      return 'Path';
    case 'recommendation':
      return 'Recommendation';
    case 'wrongbook':
      return '错题本';
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
      const aTime = safeParseDate(a.sourceTime)?.getTime() ?? 0;
      const bTime = safeParseDate(b.sourceTime)?.getTime() ?? 0;
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

  const circleCircumference = 2 * Math.PI * 42;
  const dashOffset = circleCircumference * (1 - Math.min(100, Math.max(0, quizScore)) / 100);

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

        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto cursor-pointer group">
          <div className="bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark rounded-full px-5 py-2.5 flex items-center gap-3 shadow-island border border-transparent dark:border-bordercolor-dark transition-transform duration-200 hover:scale-[1.02]">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/20 dark:bg-brand/10">
              <Flame className="w-3.5 h-3.5 text-brand fill-brand" />
            </div>
            <span className="text-sm font-bold tracking-wide">{t('learningCenter.page.streakLabel')}</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </div>
        </div>
      </header>

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

          <Link
            to={continueTo}
            className="view-enter stagger-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover-card-soft block shadow-sm"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-brand" />
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark">
                  {t('learningCenter.page.continueSection')}
                </h2>
              </div>
              <span className="text-xs font-medium text-text-secondary/80 dark:text-text-secondary-dark/80 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {latestRecord ? formatShortTime(latestRecord.sourceTime) : t('learningCenter.page.continueFallbackTime')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-full sm:w-48 aspect-video bg-secondary dark:bg-bg-dark rounded-xl border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center relative overflow-hidden">
                <img
                  src={
                    latestRecord?.resultType === 'classroom'
                      ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=400'
                      : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400'
                  }
                  className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-luminosity"
                  alt=""
                />
                <div className="w-10 h-10 rounded-full bg-text-primary dark:bg-surface-dark flex items-center justify-center border border-transparent dark:border-bordercolor-dark z-10 shadow-md">
                  {latestRecord?.resultType === 'classroom' ? (
                    <LayoutTemplate className="w-4 h-4 text-text-primary-dark dark:text-text-primary" />
                  ) : (
                    <Play className="w-4 h-4 fill-surface-light text-surface-light ml-0.5" />
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold border border-bordercolor-light dark:border-bordercolor-dark px-1.5 py-0.5 rounded text-text-secondary dark:text-text-secondary-dark bg-secondary/50 dark:bg-secondary">
                    {latestRecord ? getRecordTypeLabel(latestRecord.resultType) : t('learningCenter.page.continueFallbackType')}
                  </span>
                  <h3 className="text-xl font-black text-text-primary dark:text-text-primary-dark tracking-tight">
                    {latestRecord?.displayTitle ?? t('learningCenter.page.continueFallbackTitle')}
                  </h3>
                </div>
                <p className="text-[14px] text-text-secondary dark:text-text-secondary-dark mb-5 leading-relaxed">
                  {latestRecord?.summary ?? t('learningCenter.page.continueFallbackSummary')}
                </p>
                <div className="bg-text-primary dark:bg-text-primary-dark text-bg-light dark:text-bg-dark rounded-lg px-6 py-2.5 font-bold text-[13px] hover:opacity-90 flex items-center gap-2 transition-opacity shadow-sm w-fit">
                  {t('learningCenter.page.continueAction')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </Link>

          <section className="view-enter stagger-3 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
                  {t('learningCenter.page.overviewTitle')}
                </h2>
                <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-1">
                  {t('learningCenter.page.overviewSubtitle')}
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-brand/10 dark:bg-brand/5 border border-brand/20 dark:border-brand/10 text-[11px] font-bold text-text-primary dark:text-brand w-fit">
                {t('learningCenter.page.overviewCta')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['video', '视频'],
                ['classroom', '课堂'],
                ['companion', 'Companion'],
                ['evidence', 'Evidence'],
                ['checkpoint', 'Checkpoint'],
                ['quiz', 'Quiz'],
                ['path', 'Path'],
                ['recommendation', 'Recommendation'],
              ].map(([type, label]) => (
                <span
                  key={type}
                  className="px-3 py-1.5 rounded-full bg-bg-light dark:bg-bg-dark border border-bordercolor-light dark:border-bordercolor-dark text-[12px] font-bold text-text-primary dark:text-text-primary-dark"
                >
                  {label} {countByType.get(type) ?? 0}
                </span>
              ))}
            </div>
          </section>

          <section className="view-enter stagger-4">
            <h2 className="text-[15px] font-black mb-4 flex items-center gap-2 text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
              Library
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/history"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
                    <History className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
                    {total} Files
                  </span>
                </div>
                <div className="relative z-10 mt-4">
                  <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
                    {t('learningCenter.page.libraryHistoryTitle')}
                  </h3>
                  <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {t('learningCenter.page.libraryHistorySubtitle')}
                  </p>
                </div>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
              </Link>

              <Link
                to="/favorites"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
                    <Star className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
                    {favoritesTotal === null ? '-' : favoritesTotal} Saved
                  </span>
                </div>
                <div className="relative z-10 mt-4">
                  <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
                    {t('learningCenter.page.libraryFavoritesTitle')}
                  </h3>
                  <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {t('learningCenter.page.libraryFavoritesSubtitle')}
                  </p>
                </div>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-bg-light dark:bg-bg-dark rotate-45 rounded-2xl z-0" />
              </Link>

              <Link
                to="/history?resultType=wrongbook"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-error/10 dark:bg-error/20 flex items-center justify-center border border-error/30 dark:border-error/20">
                    <BookX className="w-5 h-5 text-error" />
                  </div>
                  <span className="text-[10px] font-black bg-error text-white px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
                    {t('learningCenter.page.libraryWrongbookBadge')}
                  </span>
                </div>
                <div className="relative z-10 mt-4">
                  <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
                    {t('learningCenter.page.libraryWrongbookTitle')}
                  </h3>
                  <p className="text-[12px] font-bold text-error mt-0.5">
                    {t('learningCenter.page.libraryWrongbookSubtitle')}
                  </p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-error/10 dark:bg-error/20 rotate-12 rounded-xl z-0" />
              </Link>

              <Link
                to="/history?resultType=evidence"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-5 hover-card-soft flex flex-col justify-between h-36 group relative overflow-hidden shadow-sm"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-bg-light dark:bg-bg-dark flex items-center justify-center border border-bordercolor-light dark:border-bordercolor-dark">
                    <Paperclip className="w-5 h-5 text-text-primary dark:text-text-primary-dark" />
                  </div>
                  <span className="text-[10px] font-black font-mono bg-bordercolor-light dark:border-bordercolor-dark text-text-secondary dark:text-text-secondary-dark px-2 py-1 rounded-sm uppercase tracking-widest">
                    Demo
                  </span>
                </div>
                <div className="relative z-10 mt-4">
                  <h3 className="font-black text-[16px] text-text-primary dark:text-text-primary-dark">
                    {t('learningCenter.page.libraryEvidenceTitle')}
                  </h3>
                  <p className="text-[12px] font-medium text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {t('learningCenter.page.libraryEvidenceSubtitle')}
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-2 w-20 h-10 bg-bg-light dark:bg-bg-dark rounded-full z-0" />
              </Link>
            </div>
          </section>

          <section className="view-enter stagger-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-black text-text-primary dark:text-text-primary-dark uppercase tracking-widest">
                Recent Activity
              </h2>
              <Link
                to="/history"
                className="text-xs font-bold text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark transition-colors"
              >
                {t('learningCenter.page.recentViewAll')} &rarr;
              </Link>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-2 shadow-sm">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                  {viewStatus === 'loading' ? t('learningCenter.page.recentLoading') : t('learningCenter.page.recentEmpty')}
                </div>
              ) : (
                recentActivity.map((record) => (
                  <Link
                    key={record.recordId}
                    to={resolveDetailTo(record)}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-light dark:hover:bg-bg-dark btn-transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark flex items-center justify-center text-text-secondary dark:text-text-secondary-dark shadow-sm">
                        {record.resultType === 'video' ? (
                          <PlaySquare className="w-5 h-5" />
                        ) : record.resultType === 'companion' ? (
                          <Bot className="w-5 h-5" />
                        ) : (
                          <MessageSquare className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[14px] text-text-primary dark:text-text-primary-dark">
                          {record.displayTitle}
                        </h4>
                        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1 font-medium">
                          {formatShortTime(record.sourceTime)} · {record.summary}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 pt-2">
          <Link
            to="/history?resultType=path"
            className="view-enter stagger-1 bg-text-primary dark:bg-surface-dark text-surface-light dark:text-text-primary-dark border border-transparent dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow relative overflow-hidden block shadow-md"
          >
            <div className="absolute -right-6 -top-6 opacity-[0.08]">
              <Compass className="w-32 h-32 text-surface-light dark:text-brand" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-surface-light/70 dark:text-text-secondary-dark">
                  Current Path
                </h2>
                <span className="text-[10px] font-bold bg-brand text-primary-foreground px-2 py-0.5 rounded shadow-sm">
                  Target
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-8 tracking-tight">
                {t('learningCenter.page.pathFallbackTitleLine1')}
                <br />
                {t('learningCenter.page.pathFallbackTitleLine2')}
              </h3>
              <div className="flex justify-between text-xs font-bold mb-3 text-surface-light/80 dark:text-text-secondary-dark">
                <span>{t('learningCenter.page.pathProgressLabel')}</span>
                <span>25% (1/4)</span>
              </div>
              <div className="w-full h-1.5 bg-text-secondary dark:bg-bg-dark rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full w-[25%]" />
              </div>
            </div>
          </Link>

          <section className="view-enter stagger-2 bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t('learningCenter.page.quizHealthTitle')}
            </h2>

            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-[72px] h-[72px] shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    className="stroke-bg-light dark:stroke-bg-dark"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    className="stroke-success circle-progress"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    style={{ strokeDashoffset: dashOffset }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-black font-mono text-text-primary dark:text-text-primary-dark tracking-tighter">
                    {quizScore}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold text-text-primary dark:text-text-primary-dark mb-1">
                  {t('learningCenter.page.quizHealthAverage')}
                </p>
                <p className="text-xs font-bold text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {t('learningCenter.page.quizHealthTrend')}
                </p>
              </div>
            </div>

            <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-6 font-medium">
              {t('learningCenter.page.quizHealthHint')}
            </p>
            <Link
              to="/history?resultType=wrongbook"
              className="w-full border border-bordercolor-light dark:border-bordercolor-dark bg-bg-light dark:bg-bg-dark text-[13px] font-bold py-2.5 rounded-xl hover:border-text-primary dark:hover:border-text-primary-dark transition-colors text-text-primary dark:text-text-primary-dark shadow-sm flex items-center justify-center"
            >
              {t('learningCenter.page.quizHealthCta')}
            </Link>
          </section>

          <section className="view-enter stagger-3 bg-brand/10 dark:bg-brand/10 border border-brand dark:border-brand-dark rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-text-secondary-dark mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-dark dark:text-brand" /> {t('learningCenter.page.recommendTitle')}
            </h2>
            <div className="space-y-3">
              <Link
                to="/history?resultType=recommendation"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl hover:border-brand dark:hover:border-brand-dark btn-transition block shadow-sm"
              >
                <span className="text-[10px] font-bold bg-brand dark:bg-brand-dark text-primary-foreground px-1.5 py-0.5 rounded-sm mb-2 inline-block shadow-sm">
                  {t('learningCenter.page.recommendBadge1')}
                </span>
                <h3 className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2">
                  {t('learningCenter.page.recommendItem1')}
                </h3>
              </Link>
              <Link
                to="/favorites"
                className="bg-surface-light dark:bg-surface-dark border border-bordercolor-light dark:border-bordercolor-dark p-4 rounded-xl hover:border-text-primary dark:hover:border-text-primary-dark btn-transition block shadow-sm"
              >
                <span className="text-[10px] font-bold bg-text-primary dark:bg-text-primary-dark text-surface-light dark:text-surface-dark px-1.5 py-0.5 rounded-sm mb-2 inline-block shadow-sm">
                  {t('learningCenter.page.recommendBadge2')}
                </span>
                <h3 className="text-[14px] font-bold text-text-primary dark:text-text-primary-dark leading-snug line-clamp-2">
                  {t('learningCenter.page.recommendItem2')}
                </h3>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SurfaceDashboardDock active="learning" avatarUrl={avatarUrl} />
    </div>
  );
}
