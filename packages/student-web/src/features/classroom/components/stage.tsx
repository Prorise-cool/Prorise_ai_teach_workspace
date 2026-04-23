/**
 * 课堂主舞台组件。
 * 顶层组合：场景渲染器 + 白板 + 聊天。
 */
import { ChevronLeft, ChevronRight, Maximize, Pause, Play } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

import type { Scene } from '../types/scene';
import type { AgentProfile } from '../types/agent';
import type { ChatMessage, LectureNoteEntry } from '../types/chat';
import { SlideRenderer } from './scene-renderers/slide-renderer';
import { InteractiveRenderer } from './scene-renderers/interactive-renderer';
import { PBLRenderer } from './scene-renderers/pbl-renderer';
import { AgentBubble } from './agent/agent-bubble';
import { Whiteboard } from './whiteboard/whiteboard';
import { useActionPlayer } from '../hooks/use-action-player';
import { useClassroomStore } from '../stores/classroom-store';

interface StageProps {
  scene: Scene | null;
  agents: AgentProfile[];
  messages: ChatMessage[];
  notes: LectureNoteEntry[];
  isPlaying: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAskQuestion: (text: string) => Promise<void>;
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
}) => {
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState('');

  const teacher = agents[0] ?? null;
  const listeners = agents.slice(1);

  // Action player — 把 speech/spotlight/… 序列按 play/pause 状态自动执行
  useActionPlayer(scene);
  const spotlightId = useClassroomStore((s) => s.currentSpotlightId);
  const currentSpeech = useClassroomStore((s) => s.currentSpeech);

  const renderSceneContent = () => {
    if (!scene) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">选择一个场景开始学习</p>
        </div>
      );
    }

    const order = scene.order ?? scene.outline?.order ?? 1;

    // discriminated union — TS 自动 narrow content 类型，无需 as any
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
        // exhaustive check — 新增 SceneType 时编译器报错
        const _exhaustive: never = scene;
        void _exhaustive;
        return (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            未知场景类型
          </div>
        );
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 主内容卡片 */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl ring-1 ring-border">
        {renderSceneContent()}

        {/* 白板叠层 */}
        {whiteboardOpen && (
          <div className="absolute inset-0 z-10">
            <Whiteboard
              isOpen={whiteboardOpen}
              onClose={() => setWhiteboardOpen(false)}
              className="h-full w-full"
            />
          </div>
        )}
      </div>

      {/* 底部：教师气泡 + 播放控件 */}
      <div className="shrink-0 border-t border-border py-3">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          {/* 后续步骤提示 */}
          {!isPlaying && scene && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3">
              <span className="text-xs text-muted-foreground">继续探索：</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                  资料依据
                </button>
                <button type="button" className="rounded-full border border-border bg-foreground px-3 py-1 text-[11px] text-background transition-colors hover:opacity-90">
                  Checkpoint
                </button>
                <button type="button" className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                  正式 Quiz
                </button>
              </div>
            </div>
          )}

          {/* 教师气泡 —— 朗读时显示真实讲稿，否则提示点击播放 */}
          {teacher && scene && (
            <AgentBubble
              agent={teacher}
              text={
                currentSpeech?.text
                  ? currentSpeech.text
                  : isPlaying
                    ? `现在播放场景「${scene.title}」...`
                    : `场景「${scene.title}」。点击播放开始讲解。`
              }
              listeners={listeners}
              isStreaming={isPlaying && !!currentSpeech}
            />
          )}

          {/* 播放控件 */}
          <div className="mt-3 flex items-center gap-3">
            {/* 播放/暂停 */}
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            {/* 问题输入 */}
            <div className="flex h-9 flex-1 items-center gap-2 rounded-full border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all md:h-10">
              <input
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="向老师提问或打断..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => {
                  if (questionInput.trim()) {
                    setQuestionInput('');
                  }
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* 上下场景 */}
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canGoPrev}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWhiteboardOpen((v) => !v)}
                className={`flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent ${
                  whiteboardOpen ? 'bg-primary/10 text-primary border-primary/40' : 'text-muted-foreground'
                }`}
                title="白板"
              >
                <span className="text-[10px] font-bold">WB</span>
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent">
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
