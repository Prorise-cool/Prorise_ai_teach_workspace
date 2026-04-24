/**
 * 文件说明：任务生成等待页通用外壳。
 * 视频 / 课堂等模块在提交后进入生成中阶段时复用此组件展示进度 / 日志 / tips。
 */
import { ArrowLeft, Check, CopySlash, Loader2, Moon, Sparkles, SunMedium, TriangleAlert, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

import './task-generating-shell.scss';

export type TaskGeneratingLogItem = {
  /** 日志唯一 ID */
  id: string;
  /** 状态：success | warning | error | pending */
  status: 'success' | 'warning' | 'error' | 'pending';
  /** 日志文本 */
  text: string;
  /** 可选标签 */
  tag?: string;
};

export type TaskGeneratingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskGeneratingColorScheme = 'amber' | 'indigo';

export type TaskGeneratingShellProps = {
  title: string;
  progress: number;
  stageLabel: string;
  logs: TaskGeneratingLogItem[];
  status?: TaskGeneratingStatus;
  etaText?: string;
  tipsRotation?: string[];
  onCancel?: () => void;
  cancelLabel?: string;
  returnLabel?: string;
  onReturn?: () => void;
  colorScheme?: TaskGeneratingColorScheme;
};

function LogItemRow({ item }: { item: TaskGeneratingLogItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        'flex items-start gap-3',
        item.status === 'success' && 'text-[color:var(--xm-color-text-secondary)] opacity-70',
        item.status === 'warning' && 'text-[color:var(--xm-color-warning)]',
        item.status === 'error' && 'text-[color:var(--xm-color-error)]',
        item.status === 'pending' && 'text-[color:var(--xm-color-text-primary)] font-medium',
      )}
    >
      {item.status === 'success' && <Check className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-success)]" />}
      {item.status === 'warning' && <TriangleAlert className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-warning)]" />}
      {item.status === 'error' && <CopySlash className="h-4 w-4 mt-0.5 font-bold text-[color:var(--xm-color-error)]" />}
      {item.status === 'pending' && <Loader2 className="h-4 w-4 mt-0.5 text-primary animate-spin" />}

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

const SCHEME_CLASSES: Record<TaskGeneratingColorScheme, { progress: string; percentText: string }> = {
  amber: {
    progress: 'bg-primary',
    percentText: 'text-primary',
  },
  indigo: {
    progress: 'bg-[color:var(--primary)]',
    percentText: 'text-[color:var(--primary)]',
  },
};

/**
 * 渲染任务生成等待页通用外壳。
 */
export function TaskGeneratingShell({
  title,
  progress,
  stageLabel,
  logs,
  status = 'processing',
  etaText,
  tipsRotation,
  onCancel,
  cancelLabel,
  returnLabel,
  onReturn,
  colorScheme = 'amber',
}: TaskGeneratingShellProps) {
  const { themeMode, toggleThemeMode } = useThemeMode();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (!tipsRotation?.length || tipsRotation.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipsRotation.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [tipsRotation]);

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const hasWarning = logs.some((l) => l.status === 'warning') || status === 'failed';
  const hasError = logs.some((l) => l.status === 'error') || status === 'failed';
  const schemeClasses = SCHEME_CLASSES[colorScheme];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden bg-background"
      data-color-scheme={colorScheme}
      data-task-status={status}
      role="status"
      aria-live="polite"
      aria-busy={status === 'pending' || status === 'processing'}
    >
      <div className="xm-generating-ambient-glow" />
      <div className="fixed inset-0 xm-generating-bg-grid pointer-events-none z-0" />

      <header className="w-full px-6 py-6 flex items-center justify-between relative z-20">
        {onReturn ? (
          <button
            type="button"
            onClick={onReturn}
            className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-border/50 transition-colors backdrop-blur-md">
              <ArrowLeft className="h-4 w-4" />
            </div>
            {returnLabel ?? 'Back'}
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase opacity-80">
              Engine Active
            </span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>{cancelLabel ?? 'Cancel'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleThemeMode}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-border/50 transition-colors backdrop-blur-md"
            aria-label="Toggle Theme"
          >
            {themeMode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 relative z-10 -mt-8">
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

        <div className="w-full max-w-2xl mb-10">
          <div className="flex justify-between items-end mb-4 px-1">
            <div className="flex flex-col gap-1.5">
              <span
                className={cn(
                  'text-xl font-bold tracking-wide transition-colors duration-300',
                  hasWarning && 'text-[color:var(--xm-color-warning)]',
                  hasError && 'text-[color:var(--xm-color-error)]',
                )}
              >
                {title}
              </span>
              <span className="text-sm text-muted-foreground opacity-80 font-medium">
                {stageLabel}
                {etaText ? ` · ${etaText}` : ''}
              </span>
            </div>
            <span
              className={cn(
                'text-4xl font-black font-mono tracking-tighter transition-all',
                schemeClasses.percentText,
              )}
            >
              {clampedProgress}%
            </span>
          </div>

          <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden backdrop-blur-sm relative">
            <div
              className={cn(
                'xm-generating-progress-fill h-full rounded-full relative transition-[width] duration-700 ease-in-out',
                schemeClasses.progress,
                hasWarning && 'bg-[color:var(--xm-color-warning)]',
                hasError && 'bg-[color:var(--xm-color-error)]',
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>

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

        {tipsRotation && tipsRotation.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-2.5 text-sm text-muted-foreground/80 font-medium h-6">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTipIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
              >
                {tipsRotation[currentTipIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
