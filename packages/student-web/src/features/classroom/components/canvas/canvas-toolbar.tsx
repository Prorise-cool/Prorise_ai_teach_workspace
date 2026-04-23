/**
 * 画布工具栏 —— 1:1 移植自 OpenMAIC `components/canvas/canvas-toolbar.tsx`。
 * 视觉/交互/圆角/间距/icon 完全照抄；颜色全部改为我们项目的全局 token：
 *   - gray-*       → muted-foreground / accent / border
 *   - violet/purple→ primary
 *   - red          → destructive
 * 字体走全局 var(--xm-font-family-sans)（globals.css 已映射 font-sans）。
 */
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  PencilLine,
  LayoutList,
  MessageSquare,
  Volume1,
  Volume2,
  VolumeX,
  Repeat,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { cn } from '@/lib/utils';

export interface CanvasToolbarProps {
  readonly currentSceneIndex: number;
  readonly scenesCount: number;
  readonly engineState: 'idle' | 'playing' | 'paused';
  readonly isLiveSession?: boolean;
  readonly whiteboardOpen: boolean;
  readonly sidebarCollapsed?: boolean;
  readonly chatCollapsed?: boolean;
  readonly onToggleSidebar?: () => void;
  readonly onToggleChat?: () => void;
  readonly onPrevSlide: () => void;
  readonly onNextSlide: () => void;
  readonly onPlayPause: () => void;
  readonly onWhiteboardClose: () => void;
  readonly showStopDiscussion?: boolean;
  readonly onStopDiscussion?: () => void;
  readonly isPresenting?: boolean;
  readonly onTogglePresentation?: () => void;
  readonly className?: string;
  readonly ttsEnabled?: boolean;
  readonly ttsMuted?: boolean;
  readonly ttsVolume?: number;
  readonly onToggleMute?: () => void;
  readonly onVolumeChange?: (volume: number) => void;
  readonly autoPlayLecture?: boolean;
  readonly onToggleAutoPlay?: () => void;
  readonly playbackSpeed?: number;
  readonly onCycleSpeed?: () => void;
  readonly whiteboardElementCount?: number;
}

/* 紧凑控件按钮基类 —— 1:1 OpenMAIC */
const ctrlBtn = cn(
  'relative w-7 h-7 rounded-md flex items-center justify-center',
  'transition-all duration-150 outline-none cursor-pointer',
  'hover:bg-accent active:scale-90',
);

/** 1px 分隔线 */
function CtrlDivider() {
  return <div className="w-px h-3 bg-border mx-0.5 shrink-0" />;
}

/** 音量图标 —— 根据音量级别 / 静音状态切换 */
function VolumeIcon({
  muted,
  volume,
  disabled,
}: {
  muted: boolean;
  volume: number;
  disabled: boolean;
}) {
  const cls = 'w-3.5 h-3.5';
  if (disabled || muted || volume === 0) return <VolumeX className={cls} />;
  if (volume < 0.5) return <Volume1 className={cls} />;
  return <Volume2 className={cls} />;
}

export const CanvasToolbar: FC<CanvasToolbarProps> = ({
  currentSceneIndex,
  scenesCount,
  engineState,
  isLiveSession,
  whiteboardOpen,
  sidebarCollapsed,
  chatCollapsed,
  onToggleSidebar,
  onToggleChat,
  onPrevSlide,
  onNextSlide,
  onPlayPause,
  onWhiteboardClose,
  showStopDiscussion,
  onStopDiscussion,
  isPresenting,
  onTogglePresentation,
  className,
  ttsEnabled,
  ttsMuted,
  ttsVolume = 1,
  onToggleMute,
  onVolumeChange,
  autoPlayLecture,
  onToggleAutoPlay,
  playbackSpeed = 1,
  onCycleSpeed,
  whiteboardElementCount = 0,
}) => {
  const canGoPrev = currentSceneIndex > 0;
  const canGoNext = currentSceneIndex < scenesCount - 1;
  const showPlayPause = !isLiveSession;

  // 音量浮层 hover 状态
  const [volumeHover, setVolumeHover] = useState(false);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const volumeContainerRef = useRef<HTMLDivElement>(null);

  const handleVolumeEnter = useCallback(() => {
    clearTimeout(volumeTimerRef.current);
    setVolumeHover(true);
  }, []);

  const handleVolumeLeave = useCallback(() => {
    volumeTimerRef.current = setTimeout(() => setVolumeHover(false), 300);
  }, []);

  useEffect(() => () => clearTimeout(volumeTimerRef.current), []);

  const effectiveVolume = ttsMuted ? 0 : ttsVolume;
  const presentationLabel = isPresenting ? '退出全屏' : '全屏';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* ── 左：边栏切换 + 页码 ── */}
      <div className="flex items-center gap-1 shrink-0 pl-1">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={cn(
              ctrlBtn,
              'w-6 h-6',
              sidebarCollapsed ? 'text-muted-foreground/60' : 'text-foreground/80',
            )}
            aria-label="切换大纲"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="text-[11px] text-muted-foreground/70 tabular-nums select-none font-medium">
          {currentSceneIndex + 1}
          <span className="opacity-35 mx-px">/</span>
          {scenesCount}
        </span>
      </div>

      <CtrlDivider />

      {/* ── 中：播放控件 ── */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        <div
          className={cn(
            'inline-flex items-center gap-0.5 px-1 h-7',
            isPresenting ? '' : 'bg-muted/60 rounded-lg',
          )}
        >
          {/* 音量 + 垂直拖条浮层 */}
          {onToggleMute && (
            <div
              ref={volumeContainerRef}
              className="relative flex items-center"
              onMouseEnter={handleVolumeEnter}
              onMouseLeave={handleVolumeLeave}
            >
              <button
                type="button"
                onClick={onToggleMute}
                disabled={!ttsEnabled}
                className={cn(
                  ctrlBtn,
                  'w-6 h-6',
                  !ttsEnabled
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : ttsMuted
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
                aria-label={ttsMuted ? '取消静音' : '静音'}
              >
                <VolumeIcon muted={!!ttsMuted} volume={ttsVolume} disabled={!ttsEnabled} />
              </button>

              {/* 垂直滑条浮层（向上弹出） */}
              <div
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center',
                  'transition-all duration-200 ease-out pointer-events-none opacity-0',
                  volumeHover && ttsEnabled && 'pointer-events-auto opacity-100',
                )}
              >
                <div className="bg-popover border border-border rounded-lg shadow-lg px-2 py-2.5 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground tabular-nums font-medium select-none">
                    {Math.round(effectiveVolume * 100)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={effectiveVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      onVolumeChange?.(v);
                      if (v > 0 && ttsMuted) onToggleMute?.();
                    }}
                    className={cn(
                      'appearance-none cursor-pointer',
                      'h-16 w-1 rounded-full',
                      'bg-muted',
                      '[writing-mode:vertical-lr] [direction:rtl]',
                      '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3',
                      '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
                      '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3',
                      '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0',
                    )}
                  />
                </div>
                <div className="w-2 h-2 bg-popover border-b border-r border-border rotate-45 -mt-[5px]" />
              </div>
            </div>
          )}

          {/* 速度 */}
          {onCycleSpeed && (
            <button
              type="button"
              onClick={onCycleSpeed}
              className={cn(
                'w-8 h-5 rounded flex items-center justify-center',
                'transition-all duration-150 outline-none cursor-pointer',
                'text-[11px] font-semibold tabular-nums leading-none',
                'active:scale-90',
                playbackSpeed !== 1
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="播放速度"
              title={`播放速度 ${playbackSpeed}x`}
            >
              {playbackSpeed === 1.5 ? '1.5x' : `${playbackSpeed}x`}
            </button>
          )}

          <CtrlDivider />

          {/* 上一节 */}
          {scenesCount > 1 && (
            <button
              type="button"
              onClick={onPrevSlide}
              disabled={!canGoPrev}
              className={cn(
                ctrlBtn,
                'w-6 h-6 text-muted-foreground disabled:opacity-20 disabled:pointer-events-none',
              )}
              aria-label="上一节"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 播放 / 暂停 / 终止讨论 */}
          {showStopDiscussion && onStopDiscussion ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStopDiscussion();
              }}
              className={cn(
                'flex items-center gap-1.5 h-6 px-2.5 rounded-md',
                'bg-destructive/10 text-destructive',
                'text-[11px] font-semibold whitespace-nowrap',
                'hover:bg-destructive/20 active:scale-95 transition-all cursor-pointer',
              )}
              title="终止讨论"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/70 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
              </span>
              终止讨论
            </button>
          ) : showPlayPause ? (
            <button
              type="button"
              onClick={onPlayPause}
              className={cn(
                ctrlBtn,
                'w-7 h-6',
                engineState === 'playing' ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-label={engineState === 'playing' ? '暂停' : '播放'}
            >
              {engineState === 'playing' ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-px" />
              )}
            </button>
          ) : null}

          {/* 下一节 */}
          {scenesCount > 1 && (
            <button
              type="button"
              onClick={onNextSlide}
              disabled={!canGoNext}
              className={cn(
                ctrlBtn,
                'w-6 h-6 text-muted-foreground disabled:opacity-20 disabled:pointer-events-none',
              )}
              aria-label="下一节"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <CtrlDivider />

          {/* 自动连播 */}
          {onToggleAutoPlay && (
            <button
              type="button"
              onClick={onToggleAutoPlay}
              className={cn(
                ctrlBtn,
                'w-8 h-6',
                autoPlayLecture ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-label="自动连播"
              title={autoPlayLecture ? '关闭自动连播' : '自动连播下一节'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 白板 */}
          <button
            type="button"
            onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onWhiteboardClose();
            }}
            className={cn(
              ctrlBtn,
              'w-6 h-6',
              whiteboardOpen ? 'text-primary' : 'text-muted-foreground',
            )}
            title={whiteboardOpen ? '收起白板' : '打开白板'}
          >
            <PencilLine className="w-3.5 h-3.5" />
            {!whiteboardOpen && whiteboardElementCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ── 右：全屏 + 聊天切换 ── */}
      <div className="flex items-center justify-end gap-px shrink-0 pr-1">
        <CtrlDivider />
        {onTogglePresentation && (
          <button
            type="button"
            onClick={onTogglePresentation}
            className={cn(
              ctrlBtn,
              'w-6 h-6',
              isPresenting ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-label={presentationLabel}
            title={presentationLabel}
          >
            {isPresenting ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={cn(
              ctrlBtn,
              'w-6 h-6',
              chatCollapsed ? 'text-muted-foreground/60' : 'text-foreground/80',
            )}
            aria-label="切换聊天面板"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
