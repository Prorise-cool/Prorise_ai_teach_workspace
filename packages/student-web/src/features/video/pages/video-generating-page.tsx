/**
 * 文件说明：视频任务等待页（Story 4.7 重构）。
 * 承接视频创建成功后的跳转，通过 SSE 消费 8 阶段进度事件。
 * 支持 SSE 断线恢复、status 降级轮询、修复态展示、失败态展示。
 */
import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Loader2, Moon, Sparkles, SunMedium, WifiOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import '@/components/generating/styles/task-generating-view.scss';

import { FixAttemptIndicator } from '../components/fix-attempt-indicator';
import { GeneratingFailureCard } from '../components/generating-failure-card';
import { LogItemRow } from '../components/log-item-row';
import { StageProgressBar } from '../components/stage-progress-bar';
import { buildStageLog, estimateEtaText } from '../config/video-stages';
import { useTipRotation } from '../hooks/use-tip-rotation';
import { useVideoTaskSse } from '../hooks/use-video-task-sse';
import { useVideoTaskStatus } from '../hooks/use-video-task-status';
import { useVideoGeneratingStore } from '../stores/video-generating-store';

/** 完成后跳转结果页的延迟（毫秒）。 */
const COMPLETED_REDIRECT_DELAY_MS = 2000;

/**
 * 渲染视频生成等待页。
 *
 * @returns 视频等待页。
 */
export function VideoGeneratingPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const { t } = useAppTranslation();

  /* -- 1. zustand store 状态（shallow selector） -- */
  const {
    status, progress, currentStage, stageLabel, error,
    degradedToPolling, fixAttempt, fixTotal, sseConnected,
  } = useVideoGeneratingStore(useShallow((s) => ({
    status: s.status,
    progress: s.progress,
    currentStage: s.currentStage,
    stageLabel: s.stageLabel,
    error: s.error,
    degradedToPolling: s.degradedToPolling,
    fixAttempt: s.fixAttempt,
    fixTotal: s.fixTotal,
    sseConnected: s.sseConnected,
  })));

  /* -- 2. 查询任务快照，恢复上下文 -- */
  const {
    snapshot,
    isLoading: isSnapshotLoading,
    isNotFound,
  } = useVideoTaskStatus(taskId);

  /* -- 3. 从 snapshot 恢复 store 状态 -- */
  useEffect(() => {
    if (!snapshot || isSnapshotLoading || isNotFound) {
      return;
    }

    const store = useVideoGeneratingStore.getState();
    const shouldRestore =
      store.taskId !== snapshot.taskId ||
      !store.hasHydratedRuntime;

    if (shouldRestore) {
      store.restoreSnapshot(snapshot);
    }
  }, [snapshot, isSnapshotLoading, isNotFound]);

  /* -- 4. SSE 事件流 -- */
  const sseEnabled =
    !isSnapshotLoading &&
    !isNotFound &&
    status !== 'completed' &&
    status !== 'failed' &&
    status !== 'cancelled';

  useVideoTaskSse(taskId, { enabled: sseEnabled });

  // 注意：降级轮询已内置于 services/sse 层的 fallback 机制，
  // 页面层不再重复启动额外 status 轮询，避免双重状态写入冲突。

  /* -- 5. 终态跳转 -- */
  useEffect(() => {
    if (status !== 'completed' || !taskId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void navigate(`/video/${taskId}`, { replace: true });
    }, COMPLETED_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [status, taskId, navigate]);

  /* -- 7. Tips 轮播 -- */
  const tips = t('video.generating.tips', { returnObjects: true }) as string[];
  const currentTipIndex = useTipRotation(tips.length);

  /* -- 8. 操作回调 -- */
  const handleRetry = useCallback(() => {
    void navigate('/video/input?retry=1', { replace: true });
  }, [navigate]);

  const handleReturn = useCallback(() => {
    void navigate('/video/input');
  }, [navigate]);

  /* -- 9. 派生状态 -- */
  const isFixing = currentStage === 'manim_fix' && fixAttempt > 0;
  const etaText = t(estimateEtaText(progress));
  const logs = buildStageLog(currentStage, progress, (label, completed) =>
    completed
      ? t('video.log.stageCompleted', { stage: t(label) })
      : t('video.log.stageInProgress', { stage: t(label) }),
  );

  /* -- 10. 渲染 -- */

  // 加载中
  if (isSnapshotLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          {t('video.generating.loadingSubtitle')}
        </p>
      </div>
    );
  }

  // 无效 taskId（404）
  if (isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('video.generating.notFoundTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('video.generating.notFoundMessage', { taskId: taskId ?? '' })}
        </p>
        <button
          onClick={handleReturn}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('video.common.returnToInput')}
        </button>
      </div>
    );
  }

  // 失败态
  if (status === 'failed' || status === 'cancelled') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <GeneratingFailureCard
          errorCode={error?.errorCode ?? null}
          errorMessage={error?.errorMessage ?? null}
          failedStage={error?.failedStage ?? null}
          retryable={error?.retryable ?? false}
          onRetry={handleRetry}
          onReturn={handleReturn}
        />
      </div>
    );
  }

  // 正常进度态（pending / processing / completed 过渡）
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* 环境层 */}
      <div className="xm-generating-ambient-glow" />
      <div className="fixed inset-0 xm-generating-bg-grid pointer-events-none z-0" />

      {/* 顶部导航 */}
      <header className="w-full px-6 py-6 flex items-center justify-between relative z-20">
        <button
          onClick={handleReturn}
          className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-border/50 transition-colors backdrop-blur-md">
            <ArrowLeft className="h-4 w-4" />
          </div>
          {t('video.common.returnToWorkbench')}
        </button>

        <div className="flex items-center gap-6">
          {/* 连接状态指示器 */}
          <div className="flex items-center gap-2">
            {degradedToPolling ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs font-semibold text-warning tracking-widest uppercase opacity-80">
                  {t('video.generating.connectionPolling')}
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase opacity-80">
                  {t('video.generating.connectionActive')}
                </span>
              </>
            )}
          </div>

          <button
            onClick={toggleThemeMode}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-border/50 transition-colors backdrop-blur-md"
            aria-label={t('video.generating.toggleTheme')}
          >
            {themeMode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 relative z-10 -mt-8">
        {/* GENERATING 文字动画 */}
        <div className="mb-14 md:scale-105">
          <div className="xm-generating-loader-wrapper" aria-label="Generating">
            {'GENERATING'.split('').map((char, index) => (
              <span key={index} className="xm-generating-loader-letter">
                {char}
              </span>
            ))}
            <div className="xm-generating-loader" />
          </div>
        </div>

        {/* 阶段进度条 */}
        <StageProgressBar
          stageLabel={t(stageLabel)}
          progress={progress}
          etaText={etaText}
          isWarning={isFixing}
          isError={false}
        />

        {/* 修复指示器 */}
        {isFixing && (
          <div className="w-full max-w-2xl mb-4">
            <FixAttemptIndicator attempt={fixAttempt} total={fixTotal} />
          </div>
        )}

        {/* 降级轮询提示 */}
        {degradedToPolling && (
          <div className="w-full max-w-2xl mb-4 flex items-center gap-2 text-xs text-muted-foreground/60">
            <WifiOff className="w-3 h-3" />
            <span>{t('video.generating.degradedPollingHint')}</span>
          </div>
        )}

        {/* 玻璃态日志面板 */}
        <div className="w-full max-w-2xl h-36 xm-generating-glass-panel rounded-[1rem] relative font-mono text-[13px] shadow-sm">
          <div className="xm-generating-log-container h-full w-full">
            <div className="xm-generating-log-scroll h-full overflow-y-auto px-6 pb-6 pt-8 space-y-4 relative flex flex-col justify-end">
              <div className="space-y-4 w-full">
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <LogItemRow key={log.id} item={log} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-10 flex items-center justify-center gap-2.5 text-sm text-muted-foreground/80 font-medium h-6">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <AnimatePresence mode="wait">
            {tips.length > 0 && (
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
              >
                {tips[currentTipIndex]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
