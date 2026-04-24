/**
 * 画布容器 —— 1:1 移植自 OpenMAIC `components/canvas/canvas-area.tsx`。
 *
 * 视觉/动画/层级/aspect-ratio/shadow 完全照抄；颜色全部走我们项目 token：
 *  - gray-50/100  → muted / background
 *  - gray-800     → card (dark surface)
 *  - blue-* 互动色→ info / accent 弱化
 *  - purple/red   → primary / destructive
 *
 * 与旧实现相比：
 *  - pending overlay / play-hint 切换到 `motion.div` + `AnimatePresence`（OpenMAIC 同款）
 *  - spinner 改为双层圆环（外圈 border-muted + 内圈 border-t-primary animate-spin）
 *  - 场景水印保留 mix-blend-multiply / dark:mix-blend-screen 以与 OpenMAIC 一致
 *  - 根容器背景对齐 `bg-background`（去掉旧的 bg-muted/30）
 */
import { Play } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, type FC, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

import type { Scene, StageMode } from '../../types/scene';
import { CanvasToolbar, type CanvasToolbarProps } from './canvas-toolbar';

interface CanvasAreaProps extends CanvasToolbarProps {
  readonly currentScene: Scene | null;
  readonly mode: StageMode;
  readonly hideToolbar?: boolean;
  readonly isPendingScene?: boolean;
  readonly isGenerationFailed?: boolean;
  readonly onRetryGeneration?: () => void;
  /** 场景内容渲染函数（由父级根据 scene.type 选择 SceneRenderer） */
  readonly renderScene?: (scene: Scene) => ReactNode;
}

export const CanvasArea: FC<CanvasAreaProps> = ({
  currentScene,
  currentSceneIndex,
  scenesCount,
  mode,
  engineState,
  isLiveSession,
  sidebarCollapsed,
  chatCollapsed,
  onToggleSidebar,
  onToggleChat,
  onPrevSlide,
  onNextSlide,
  onPlayPause,
  isPresenting,
  onTogglePresentation,
  showStopDiscussion,
  onStopDiscussion,
  hideToolbar,
  isPendingScene,
  isGenerationFailed,
  onRetryGeneration,
  renderScene,
  // CanvasToolbarProps tail-through
  ttsEnabled,
  ttsMuted,
  ttsVolume,
  onToggleMute,
  onVolumeChange,
  autoPlayLecture,
  onToggleAutoPlay,
  playbackSpeed,
  onCycleSpeed,
}) => {
  const { t } = useAppTranslation();
  const showControls = mode === 'playback';
  const showPlayHint =
    showControls &&
    engineState !== 'playing' &&
    currentScene?.type === 'slide' &&
    !isLiveSession &&
    !isPendingScene;

  const handleSlideClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!showControls || isLiveSession || currentScene?.type !== 'slide') return;
      const container = e.currentTarget;
      const videoEls = container.querySelectorAll('[data-video-element]');
      for (const el of videoEls) {
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          return;
        }
      }
      onPlayPause();
    },
    [showControls, isLiveSession, onPlayPause, currentScene?.type],
  );

  return (
    <div className="w-full h-full flex flex-col bg-background group/canvas">
      {/* 幻灯片区 —— 占据剩余空间 */}
      <div
        className={cn(
          'flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-2 transition-colors duration-500',
          currentScene?.type === 'interactive' ? 'bg-info/5' : 'bg-muted/20',
        )}
      >
        <div
          className={cn(
            // 只对颜色/阴影做 transition；不能用 transition-all，否则尺寸类
            // 属性（width/height/aspect-ratio）也会被动画化，scene 切换时 React
            // reflow 的瞬时尺寸差被 700ms 补间，视觉表现为"canvas 窄一下又撑开"。
            'aspect-[16/9] h-full max-h-full max-w-full bg-card shadow-2xl rounded-lg overflow-hidden relative transition-[background-color,box-shadow,border-color] duration-500',
            showControls && !isLiveSession && currentScene?.type === 'slide' && 'cursor-pointer',
            currentScene?.type === 'interactive'
              ? 'ring-1 ring-info/20 shadow-info/20'
              : 'ring-1 ring-border',
          )}
          onClick={handleSlideClick}
        >
          {/* 场景内容（白板叠层已移除——按用户要求删除白板功能） */}
          {currentScene && renderScene && (
            <div className="absolute inset-0">{renderScene(currentScene)}</div>
          )}

          {/* 待生成场景的占位骨架 —— motion.div + AnimatePresence fade */}
          <AnimatePresence>
            {isPendingScene && !currentScene && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 z-[105] flex flex-col items-center justify-center bg-card"
              >
                {isGenerationFailed ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-destructive"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-destructive font-medium">
                      {t('classroom.canvas.sceneFailed')}
                    </span>
                    {onRetryGeneration && (
                      <button
                        type="button"
                        onClick={onRetryGeneration}
                        className="mt-1 px-4 py-1.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-95"
                      >
                        重试生成
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {/* Spinner —— 双层圆环 */}
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-muted" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                    </div>
                    {/* Text —— motion.span 延迟入场 */}
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      className="text-sm text-muted-foreground font-medium"
                    >
                      {t('classroom.canvas.nextScenePending')}
                    </motion.span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 序号水印 —— mix-blend 避免抢画面 */}
          {currentScene && (
            <div className="absolute top-4 right-4 text-foreground/10 font-black text-4xl pointer-events-none select-none mix-blend-multiply dark:mix-blend-screen">
              {(currentSceneIndex + 1).toString().padStart(2, '0')}
            </div>
          )}

          {/* 播放提示 —— 待播状态时的呼吸按钮（仅 slide 类型），AnimatePresence 淡入淡出 */}
          <AnimatePresence>
            {showPlayHint && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-[102] flex items-center justify-center pointer-events-none"
              >
                <div
                  className="opacity-50 group-hover/canvas:opacity-100 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPause();
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-full bg-card/95 flex items-center justify-center shadow-[0_4px_30px_rgba(245,197,71,0.18),inset_0_0_0_1px_rgba(245,197,71,0.32)] animate-[pulse_1.6s_ease-in-out_infinite]"
                    style={{ willChange: 'transform' }}
                  >
                    <Play className="w-7 h-7 text-primary fill-primary/80 ml-0.5" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 画布工具栏 ── */}
      {!hideToolbar && (
        <CanvasToolbar
          className={cn(
            'shrink-0 h-9 px-2',
            'bg-card/80 backdrop-blur-xl',
            'border-t border-border/40',
          )}
          currentSceneIndex={currentSceneIndex}
          scenesCount={scenesCount}
          engineState={engineState}
          isLiveSession={isLiveSession}
          sidebarCollapsed={sidebarCollapsed}
          chatCollapsed={chatCollapsed}
          onToggleSidebar={onToggleSidebar}
          onToggleChat={onToggleChat}
          onPrevSlide={onPrevSlide}
          onNextSlide={onNextSlide}
          onPlayPause={onPlayPause}
          isPresenting={isPresenting}
          onTogglePresentation={onTogglePresentation}
          showStopDiscussion={showStopDiscussion}
          onStopDiscussion={onStopDiscussion}
          ttsEnabled={ttsEnabled}
          ttsMuted={ttsMuted}
          ttsVolume={ttsVolume}
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
          autoPlayLecture={autoPlayLecture}
          onToggleAutoPlay={onToggleAutoPlay}
          playbackSpeed={playbackSpeed}
          onCycleSpeed={onCycleSpeed}
        />
      )}
    </div>
  );
};
