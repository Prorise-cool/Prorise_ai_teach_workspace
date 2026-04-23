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

import { CanvasArea } from './canvas/canvas-area';
import { AgentBubble } from './agent/agent-bubble';
import { InteractiveRenderer } from './scene-renderers/interactive-renderer';
import { PBLRenderer } from './scene-renderers/pbl-renderer';
import { SlideRenderer } from './scene-renderers/slide-renderer';
import { StageBottomBar } from './stage/stage-bottom-bar';
import { Whiteboard } from './whiteboard/whiteboard';
import { useActionPlayer } from '../hooks/use-action-player';
import { useClassroomStore } from '../stores/classroom-store';
import type { AgentProfile } from '../types/agent';
import type { ChatMessage, LectureNoteEntry } from '../types/chat';
import type { Scene } from '../types/scene';

interface StageProps {
  readonly scene: Scene | null;
  readonly agents: AgentProfile[];
  readonly messages: ChatMessage[];
  /** 预留：父级从 ChatArea 里管理的笔记，保留 prop 形状不变。 */
  readonly notes: LectureNoteEntry[];
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
function renderSceneContent(scene: Scene, spotlightId: string | null): ReactNode {
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
          未知场景类型
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
  // Action player 订阅当前场景的 speech/spotlight/… 序列
  useActionPlayer(scene);
  const spotlightId = useClassroomStore((s) => s.currentSpotlightId);
  const currentSpeech = useClassroomStore((s) => s.currentSpeech);

  // 本地 UI 态（尚未接入全局 settings store）
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
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

  const handleWhiteboardToggle = useCallback(() => {
    setWhiteboardOpen((v) => !v);
  }, []);

  const handleCycleSpeed = useCallback(() => {
    setPlaybackSpeed((s) => (s >= 2 ? 0.5 : s + 0.25));
  }, []);

  // 渲染白板叠层
  const renderWhiteboard = useCallback(
    () => (
      <div className="pointer-events-auto h-full w-full">
        <Whiteboard
          isOpen={whiteboardOpen}
          onClose={() => setWhiteboardOpen(false)}
          className="h-full w-full"
        />
      </div>
    ),
    [whiteboardOpen],
  );

  if (!scene) {
    return (
      <div className="flex h-full flex-col">
        <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl ring-1 ring-border">
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">选择一个场景开始学习</p>
          </div>
        </div>
        {teacher && (
          <div className="mt-3">
            <AgentBubble
              agent={teacher}
              text="等待场景加载..."
              listeners={listeners}
              isStreaming={false}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 画布 + 工具栏（OpenMAIC CanvasArea 视觉 1:1） */}
      <div className="relative flex-1 overflow-hidden rounded-lg ring-1 ring-border">
        <CanvasArea
          currentScene={scene}
          currentSceneIndex={sceneIndex}
          scenesCount={scenesCount}
          mode="playback"
          engineState={engineState}
          isLiveSession={isStreaming}
          whiteboardOpen={whiteboardOpen}
          sidebarCollapsed={false}
          chatCollapsed={false}
          onPrevSlide={onPrev}
          onNextSlide={onNext}
          onPlayPause={handlePlayPause}
          onWhiteboardClose={handleWhiteboardToggle}
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
          renderScene={(s) => renderSceneContent(s, spotlightId)}
          renderWhiteboard={whiteboardOpen ? renderWhiteboard : undefined}
        />
      </div>

      {/* 底部教师气泡 + 主问答输入 */}
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
  );
};

