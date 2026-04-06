/**
 * 文件说明：统一任务生成进度指示视图组件。
 * 提供视频生成、课堂生成等沉浸式等待过程中的动效展示与日志回放支持。
 */
import { ArrowLeft, Check, CopySlash, Loader2, Moon, Sparkles, SunMedium, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';

import './styles/task-generating-view.scss';

export type GeneratingLogItem = {
  /** 日志唯一 ID */
  id: string;
  /** 状态：success | warning | error | pending (默认动画旋转态) */
  status: 'success' | 'warning' | 'error' | 'pending';
  /** 日志文本 */
  text: string;
  /** 可选标签 (如 Understanding / Code Gen) */
  tag?: string;
};

export type TaskGeneratingViewProps = {
  /** 任务主标题 */
  title: string;
  /** 剩余时间与细节文案 */
  etaText: string;
  /** 进度值 (0-100) */
  progress: number;
  /** 滚动日志列表 */
  logs: GeneratingLogItem[];
  /** 底部轮播提示池 */
  tips: string[];
  /** 返回键标签 */
  returnLabel?: string;
  /** 返回上级的动作回调 */
  onReturn?: () => void;
};

function LogItemRow({ item }: { item: GeneratingLogItem }) {
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
        'text-[color:var(--xm-color-text-primary)] font-medium'
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
 * 渲染沉浸式任务生成视图。
 */
export function TaskGeneratingView({
  title,
  etaText,
  progress,
  logs,
  tips,
  returnLabel = '返回工作台',
  onReturn,
}: TaskGeneratingViewProps) {
  const { themeMode, toggleThemeMode } = useThemeMode();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // 轮播提示
  useEffect(() => {
    if (!tips?.length) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [tips]);

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* 环境层：居中光晕与超细网格 */}
      <div className="xm-generating-ambient-glow" />
      <div className="fixed inset-0 xm-generating-bg-grid pointer-events-none z-0" />

      {/* 顶部导航：极简透明 */}
      <header className="w-full px-6 py-6 flex items-center justify-between relative z-20">
        {onReturn ? (
          <button
            onClick={onReturn}
            className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-border/50 transition-colors backdrop-blur-md">
              <ArrowLeft className="h-4 w-4" />
            </div>
            {returnLabel}
          </button>
        ) : <div />}

        {/* 亮暗色切换 & 状态 */}
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

          <button
            onClick={toggleThemeMode}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-border/50 transition-colors backdrop-blur-md"
            aria-label="Toggle Theme"
          >
            {themeMode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* 主体内空区 */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 relative z-10 -mt-8">
        
        {/* 核心扫描文字 GENERATING */}
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

        {/* 进度与信息展示区 */}
        <div className="w-full max-w-2xl mb-10">
          <div className="flex justify-between items-end mb-4 px-1">
            <div className="flex flex-col gap-1.5">
              <span 
                className={cn(
                  'text-xl font-bold tracking-wide transition-colors duration-300',
                  logs.some(l => l.status === 'warning') && 'text-[color:var(--xm-color-warning)] drop-shadow-[0_0_8px_rgba(255,103,0,0.4)]',
                  logs.some(l => l.status === 'error') && 'text-[color:var(--xm-color-error)]'
                )}
              >
                {title}
              </span>
              <span className="text-sm text-muted-foreground opacity-80 font-medium">
                {etaText}
              </span>
            </div>
            <span className="text-4xl font-black font-mono tracking-tighter text-primary drop-shadow-[0_0_16px_rgba(245,197,71,0.4)] transition-all">
              {clampedProgress}%
            </span>
          </div>

          {/* 发光进度条 */}
          <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden backdrop-blur-sm relative">
            <div 
              className={cn(
                'xm-generating-progress-fill h-full bg-primary rounded-full relative transition-[width] duration-700 ease-in-out',
                logs.some(l => l.status === 'warning') && 'bg-[color:var(--xm-color-warning)]',
                logs.some(l => l.status === 'error') && 'bg-[color:var(--xm-color-error)]'
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>

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

        {/* 极简 Tips */}
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
