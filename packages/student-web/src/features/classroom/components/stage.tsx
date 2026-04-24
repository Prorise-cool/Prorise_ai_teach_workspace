/**
 * 课堂主舞台组件 —— 画布容器 + 工具栏 + 底部 Roundtable/Composer。
 *
 * 在 classroom-play-page 的三栏布局（SceneSidebar | Stage | ChatArea）里，
 * 这个组件对标 OpenMAIC `components/stage.tsx` 主区的
 * `CanvasArea` + `Roundtable` 组合（去掉了我们暂时不需要的
 * PlaybackEngine / ActionEngine 侵入）。
 *
 * 视觉构成完全照抄 OpenMAIC：顶部画布卡片（16:9，ring + shadow-2xl，
 * 白板叠层，序号水印，play-hint 呼吸按钮）+ 底部 9px 工具栏（播放/上下一/
 * TTS/全屏），工具栏之下再挂一个 StageBottomBar（教师气泡 + 提问输入）。
 *
 * 颜色全部走项目 token；字体走 var(--xm-font-sans)。本组件不直接消费 OpenMAIC
 * 的 settings store，而是用 local state + props 兜底，保证 ≤ 500 行硬限制。
 */
import { useCallback, useMemo, useState, type FC, type ReactNode } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import { CanvasArea } from './canvas/canvas-area';
import { InteractiveRenderer } from './scene-renderers/interactive-renderer';
import { PBLRenderer } from './scene-renderers/pbl-renderer';
import { SlideRenderer } from './scene-renderers/slide-renderer';
import { StageBottomBar } from './stage/stage-bottom-bar';
import { useActionPlayer } from '../hooks/use-action-player';
import { useClassroomStore } from '../stores/classroom-store';
import type { AgentProfile } from '../types/agent';
import type { ChatMessage } from '../types/chat';
import type { Scene } from '../types/scene';

interface StageProps {
  readonly scene: Scene | null;
  readonly agents: AgentProfile[];
  readonly messages: ChatMessage[];
  readonly isPlaying: boolean;
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onAskQuestion: (text: string) => Promise<void>;
  /** 可选：场景总数（用于工具栏中的 1/N 显示） */
  readonly sceneIndex?: number;
  readonly scenesCount?: number;
  /** 可选：是否正在与后端对话（锁定输入） */
  readonly isStreaming?: boolean;
}

/** discriminated-union 消费场景 —— 避免 `as any`。 */
function renderSceneContent(
  scene: Scene,
  spotlightId: string | null,
  fallbackLabel: string,
): ReactNode {
  const order = scene.order ?? scene.outline?.order ?? 1;
  switch (scene.type) {
    case 'slide':
      return (
        <SlideRenderer
          content={scene.content}
          sceneTitle={scene.title}
          sceneOrder={order}
          spotlightId={spotlightId}
        />
      );
    case 'interactive':
      return (
        <InteractiveRenderer
          content={scene.content}
          sceneTitle={scene.title}
          sceneOrder={order}
        />
      );
    case 'pbl':
      return (
        <PBLRenderer
          content={scene.content}
          sceneTitle={scene.title}
          sceneOrder={order}
        />
      );
    default: {
      // exhaustive check
      const _exhaustive: never = scene;
      void _exhaustive;
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {fallbackLabel}
        </div>
      );
    }
  }
}

export const Stage: FC<StageProps> = ({
  scene,
  agents,
  isPlaying,
  canGoNext,
  canGoPrev,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onAskQuestion,
  sceneIndex = 0,
  scenesCount = 1,
  isStreaming = false,
}) => {
  const { t } = useAppTranslation();
  const spotlightId = useClassroomStore((s) => s.currentSpotlightId);
  const currentSpeech = useClassroomStore((s) => s.currentSpeech);

  // Action player 订阅当前场景的 speech/spotlight 序列（白板 wb_* 已删除）
  useActionPlayer(scene);
  const [ttsMuted, setTtsMuted] = useState(false);
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [autoPlayLecture, setAutoPlayLecture] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPresenting, setIsPresenting] = useState(false);

  const teacher = agents[0] ?? null;
  const listeners = useMemo(() => agents.slice(1), [agents]);

  // 把 play/pause/next/prev 映射成 CanvasToolbar 期望的 engineState 三态
  const engineState = useMemo<'idle' | 'playing' | 'paused'>(() => {
    if (isPlaying) return 'playing';
    if (currentSpeech?.text) return 'paused';
    return 'idle';
  }, [isPlaying, currentSpeech?.text]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) onPause();
    else onPlay();
  }, [isPlaying, onPlay, onPause]);

  const handleCycleSpeed = useCallback(() => {
    setPlaybackSpeed((s) => (s >= 2 ? 0.5 : s + 0.25));
  }, []);

  if (!scene) {
    return (
      <div className="flex h-full flex-col">
        <div className="overflow-hidden relative flex-1 min-h-0 isolate">
          <div className="flex h-full items-center justify-center bg-background">
            <p className="text-sm text-muted-foreground">{t('classroom.stage.choosePrompt')}</p>
          </div>
        </div>
        {teacher && (
          // 固定 h-[192px]：对齐 OpenMAIC Roundtable，保证 canvas 高度恒定、
          // 避免底部气泡文字变化导致 aspect-[16/9] canvas 宽度抖动。
          <div className="h-[192px] shrink-0">
            <StageBottomBar
              teacher={teacher}
              listeners={listeners}
              scene={null}
              currentSpeechText={null}
              isPlaying={false}
              isStreaming={false}
              onAskQuestion={onAskQuestion}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 画布 + 工具栏（OpenMAIC CanvasArea 视觉 1:1：flush edge，卡片 ring 由 CanvasArea 内部自带） */}
      <div className="overflow-hidden relative flex-1 min-h-0 isolate">
        <CanvasArea
          currentScene={scene}
          currentSceneIndex={sceneIndex}
          scenesCount={scenesCount}
          mode="playback"
          engineState={engineState}
          isLiveSession={isStreaming}
          sidebarCollapsed={false}
          chatCollapsed={false}
          onPrevSlide={onPrev}
          onNextSlide={onNext}
          onPlayPause={handlePlayPause}
          isPresenting={isPresenting}
          onTogglePresentation={() => setIsPresenting((v) => !v)}
          ttsEnabled
          ttsMuted={ttsMuted}
          ttsVolume={ttsVolume}
          onToggleMute={() => setTtsMuted((v) => !v)}
          onVolumeChange={setTtsVolume}
          autoPlayLecture={autoPlayLecture}
          onToggleAutoPlay={() => setAutoPlayLecture((v) => !v)}
          playbackSpeed={playbackSpeed}
          onCycleSpeed={handleCycleSpeed}
          renderScene={(s) => renderSceneContent(s, spotlightId, t('classroom.stage.unknownSceneType'))}
        />
      </div>

      {/* 底部教师气泡 + 主问答输入 —— 固定 h-[192px] 对齐 OpenMAIC Roundtable，
          保证 canvas 高度恒定，避免 scene 切换时气泡文字变化引起宽度抖动 */}
      <div className="h-[192px] shrink-0">
        <StageBottomBar
          teacher={teacher}
          listeners={listeners}
          scene={scene}
          currentSpeechText={currentSpeech?.text ?? null}
          isPlaying={isPlaying}
          isStreaming={isStreaming}
          onAskQuestion={onAskQuestion}
        />
      </div>
    </div>
  );
};

