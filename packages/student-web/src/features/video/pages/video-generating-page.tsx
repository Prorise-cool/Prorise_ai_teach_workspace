/**
 * 文件说明：视频任务等待页（Story 4.7 重构）。
 * 承接视频创建成功后的跳转，通过 SSE 消费 8 阶段进度事件。
 * 支持 SSE 断线恢复、status 降级轮询、修复态展示、失败态展示。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, CopySlash, Loader2, Moon, Sparkles, SunMedium, TriangleAlert, Wifi, WifiOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import '@/components/generating/styles/task-generating-view.scss';

import { FixAttemptIndicator } from '../components/fix-attempt-indicator';
import { GeneratingFailureCard } from '../components/generating-failure-card';
import { StageProgressBar } from '../components/stage-progress-bar';
import { estimateEtaText, getRequiredStages, getStageConfig, VIDEO_STAGES } from '../config/video-stages';
import { useVideoStatusPolling } from '../hooks/use-video-status-polling';
import { useVideoTaskSse } from '../hooks/use-video-task-sse';
import { useVideoTaskStatus } from '../hooks/use-video-task-status';
import { useVideoGeneratingStore } from '../stores/video-generating-store';

import type { VideoStageConfig } from '../config/video-stages';

/** 等待页底部轮播提示池。 */
const TIPS = [
  '小麦提示：生成完毕后，您还可以通过自然语言二次修改画面。',
  '复杂的数学公式推导，小麦会自动为您添加高亮引导。',
  '视频渲染过程需要在云端进行大量计算，感谢您的耐心等待。',
  '您可以随时切换板书风格、讲师音色和教学节奏。',
  '生成历史会自动保存在您的工作台，随时可以回来查看。',
];

/** 完成后跳转结果页的延迟（毫秒）。 */
const COMPLETED_REDIRECT_DELAY_MS = 2000;

/** Tips 轮播间隔（毫秒）。 */
const TIP_ROTATION_INTERVAL_MS = 6000;

/** 日志条目类型。 */
interface LogItem {
  id: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  text: string;
  tag?: string;
}

/**
 * 根据当前阶段和进度构建日志列表。
 *
 * @param currentStage - 当前阶段枚举值。
 * @param progress - 全局进度。
 * @returns 日志列表。
 */
function buildStageLog(
  currentStage: string | null,
  progress: number,
): LogItem[] {
  const logs: LogItem[] = [];
  let passedCurrent = false;

  for (const stage of VIDEO_STAGES) {
    if (passedCurrent) {
      break;
    }

    if (currentStage === stage.key) {
      passedCurrent = true;
      logs.push({
        id: stage.key,
        status: 'pending',
        text: `正在${stage.label}...`,
        tag: stage.tag,
      });
    } else if (progress > stage.progressEnd) {
      logs.push({
        id: stage.key,
        status: 'success',
        text: `${stage.label}完成`,
        tag: stage.tag,
      });
    } else if (!stage.conditional) {
      // 还没到这个阶段，且不是条件阶段 → 不显示
    }
  }

  return logs;
}

/** 日志行组件。 */
function LogItemRow({ item }: { item: LogItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        'flex items-start gap-3',
        item.status === 'success' ? 'text-[color:var(--xm-color-text-secondary)] opacity-70' :
        item.status === 'warning' ? 'text-[color:var(--xm-color-warning)]' :
        item.status === 'error' ? 'text-[color:var(--xm-color-error)]' :
        'text-[color:var(--xm-color-text-primary)] font-medium',
      )}
    >
      {item.status === 'success' && <Check className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-success)]" />}
      {item.status === 'warning' && <TriangleAlert className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-warning)]" />}
      {item.status === 'error' && <CopySlash className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-error)]" />}
      {item.status === 'pending' && <Loader2 className="h-4 w-4 mt-0.5 text-primary animate-spin drop-shadow-[0_0_8px_rgba(245,197,71,0.6)]" />}

      <div className="flex-1">
        <span>{item.text}</span>
        {item.tag && (
          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded border border-current opacity-40">
            {item.tag}
          </span>
        )}
        {item.status === 'pending' && <span className="xm-generating-cursor-blink" />}
      </div>
    </motion.div>
  );
}

/**
 * 渲染视频生成等待页。
 *
 * @returns 视频等待页。
 */
export function VideoGeneratingPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { themeMode, toggleThemeMode } = useThemeMode();

  /* ── 1. zustand store 状态 ── */
  const status = useVideoGeneratingStore((s) => s.status);
  const progress = useVideoGeneratingStore((s) => s.progress);
  const currentStage = useVideoGeneratingStore((s) => s.currentStage);
  const stageLabel = useVideoGeneratingStore((s) => s.stageLabel);
  const error = useVideoGeneratingStore((s) => s.error);
  const degradedToPolling = useVideoGeneratingStore((s) => s.degradedToPolling);
  const fixAttempt = useVideoGeneratingStore((s) => s.fixAttempt);
  const fixTotal = useVideoGeneratingStore((s) => s.fixTotal);
  const sseConnected = useVideoGeneratingStore((s) => s.sseConnected);

  /* ── 2. 查询任务快照，恢复上下文 ── */
  const {
    snapshot,
    isLoading: isSnapshotLoading,
    isNotFound,
  } = useVideoTaskStatus(taskId);

  /* ── 3. 从 snapshot 恢复 store 状态 ── */
  useEffect(() => {
    if (!snapshot || isSnapshotLoading || isNotFound) {
      return;
    }

    const store = useVideoGeneratingStore.getState();

    // 仅当 store 尚未收到 SSE 事件时才用 snapshot 恢复
    if (store.progress === 0 && store.status === 'pending') {
      const raw = snapshot as unknown as Record<string, unknown>;
      const snapshotStage = (raw.currentStage as string) ?? null;
      const snapshotStageLabel = (raw.stageLabel as string) ?? null;

      if (snapshot.status === 'completed') {
        store.setCompleted();
      } else if (snapshot.status === 'failed') {
        store.setFailed({
          errorCode: snapshot.errorCode ?? null,
          errorMessage: snapshot.message ?? null,
          failedStage: (snapshotStage as import('@/types/video').VideoPipelineStage) ?? null,
          retryable: false,
        });
      } else if (snapshotStage) {
        store.updateStage({
          currentStage: snapshotStage as import('@/types/video').VideoPipelineStage,
          stageLabel: snapshotStageLabel ?? snapshotStage,
          progress: snapshot.progress,
        });
      } else {
        store.updateProgress({ progress: snapshot.progress });
      }
    }
  }, [snapshot, isSnapshotLoading, isNotFound]);

  /* ── 4. SSE 事件流 ── */
  const sseEnabled =
    !isSnapshotLoading &&
    !isNotFound &&
    status !== 'completed' &&
    status !== 'failed' &&
    status !== 'cancelled';

  useVideoTaskSse(taskId, { enabled: sseEnabled });

  /* ── 5. 降级轮询 ── */
  useVideoStatusPolling(taskId);

  /* ── 6. 终态跳转 ── */
  useEffect(() => {
    if (status !== 'completed' || !taskId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void navigate(`/video/${taskId}`, { replace: true });
    }, COMPLETED_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [status, taskId, navigate]);

  /* ── 7. Tips 轮播 ── */
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, TIP_ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  /* ── 8. 操作回调 ── */
  const handleRetry = useCallback(() => {
    void navigate('/video/input?retry=1', { replace: true });
  }, [navigate]);

  const handleReturn = useCallback(() => {
    void navigate('/video/input');
  }, [navigate]);

  /* ── 9. 派生状态 ── */
  const isFixing = currentStage === 'manim_fix' && fixAttempt > 0;
  const etaText = estimateEtaText(progress);
  const logs = buildStageLog(currentStage, progress);

  /* ── 10. 渲染 ── */

  // 加载中
  if (isSnapshotLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">正在查询任务进度...</p>
      </div>
    );
  }

  // 无效 taskId（404）
  if (isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-4">
        <h2 className="text-lg font-semibold text-foreground">任务不存在</h2>
        <p className="text-sm text-muted-foreground">
          任务 {taskId ?? ''} 不存在或已过期，请返回重新创建
        </p>
        <button
          onClick={handleReturn}
          className="text-sm font-medium text-primary hover:underline"
        >
          返回输入页
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
          返回工作台
        </button>

        <div className="flex items-center gap-6">
          {/* 连接状态指示器 */}
          <div className="flex items-center gap-2">
            {degradedToPolling ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-[color:var(--xm-color-warning)]" />
                <span className="text-xs font-semibold text-[color:var(--xm-color-warning)] tracking-widest uppercase opacity-80">
                  Polling
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase opacity-80">
                  Engine Active
                </span>
              </>
            )}
          </div>

          <button
            onClick={toggleThemeMode}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-border/50 transition-colors backdrop-blur-md"
            aria-label="Toggle Theme"
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
          stageLabel={stageLabel}
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
            <span>网络恢复中，已切换到轮询模式</span>
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
            {TIPS.length > 0 && (
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
              >
                {TIPS[currentTipIndex]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
