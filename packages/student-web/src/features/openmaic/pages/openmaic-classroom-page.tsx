/**
 * OpenMAIC 课堂播放页。
 * 三栏布局：课程大纲 | 主画布（幻灯片+白板）| 智能体讨论。
 * 与 UI 设计稿 01-classroom.html 对应。
 */
import {
  Bot,
  ChevronLeft,
  Layers,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { loadClassroom } from '../db/classroom-db';
import { useDirectorChat } from '../hooks/use-director-chat';
import { useScenePlayer } from '../hooks/use-scene-player';
import { useClassroomStore } from '../store/classroom-store';
import { Stage } from '../components/stage';
import { ChatPanel } from '../components/chat/chat-panel';
import type { Scene } from '../types/scene';

export function OpenMAICClassroomPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [outlineOpen, setOutlineOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [isMobileOverlayVisible, setMobileOverlayVisible] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  const [notes] = useState([] as never[]);

  // Load classroom from DB into store
  const classroom = useClassroomStore((s) => s.classroom);
  const agents = useClassroomStore((s) => s.agents);
  const setClassroom = useClassroomStore((s) => s.setClassroom);
  const setAgents = useClassroomStore((s) => s.setAgents);

  useEffect(() => {
    if (!classroomId) return;
    if (classroom?.id === classroomId) return;
    void loadClassroom(classroomId).then((c) => {
      if (!c) return;
      setClassroom(c);
      // 从持久化的 classroom.agents 回灌 store.agents —— 避免刷新后教师气泡消失
      if (Array.isArray(c.agents) && c.agents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAgents(c.agents as any);
      }
    });
  }, [classroomId, classroom, setClassroom, setAgents]);

  // 当前 classroom.agents 比 store.agents 新时也同步一次
  useEffect(() => {
    if (classroom && Array.isArray(classroom.agents) && classroom.agents.length > 0) {
      const currentIds = agents.map((a) => a.id).join(',');
      const classroomIds = classroom.agents.map((a) => a.id).join(',');
      if (currentIds !== classroomIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAgents(classroom.agents as any);
      }
    }
  }, [classroom, agents, setAgents]);

  const player = useScenePlayer();
  const chat = useDirectorChat(classroomId ?? '');

  const toggleDark = useCallback(() => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    setIsDark(next);
  }, [isDark]);

  const openMobileOutline = useCallback(() => {
    setOutlineOpen(true);
    setCompanionOpen(false);
    setMobileOverlayVisible(true);
  }, []);

  const openMobileCompanion = useCallback(() => {
    setCompanionOpen(true);
    setOutlineOpen(false);
    setMobileOverlayVisible(true);
  }, []);

  const closeOverlay = useCallback(() => {
    setMobileOverlayVisible(false);
  }, []);

  if (!classroomId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">课堂 ID 不存在</p>
      </div>
    );
  }

  const courseTitle = classroom?.name ?? '课堂加载中...';
  const courseLabel = 'OpenMAIC';

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* 背景纹理 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(59,23,1,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,23,1,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 100%)',
        }}
      />

      {/* 移动端遮罩层 */}
      {isMobileOverlayVisible && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={closeOverlay}
        />
      )}

      {/* 左侧边栏 — 课程大纲 */}
      <aside
        className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-border bg-card/95 backdrop-blur-md transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${
          outlineOpen ? 'translate-x-0' : '-translate-x-full'
        } w-[260px] shrink-0`}
      >
        {/* 侧栏标题 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              课程大纲
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOutlineOpen(false); setMobileOverlayVisible(false); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <PanelLeftClose className="h-4 w-4 hidden md:block" />
            <X className="h-4 w-4 md:hidden" />
          </button>
        </div>

        {/* 场景列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          {player.scenes.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">场景加载中...</p>
          ) : (
            <div className="space-y-2">
              {player.scenes.map((scene, i) => (
                <SceneItem
                  key={scene.id}
                  scene={scene}
                  index={i}
                  isActive={scene.id === player.currentScene?.id}
                  onClick={() => player.goToScene(scene.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex flex-1 min-w-0 flex-col">
        {/* 顶部导航栏 */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
          {/* 左侧：菜单 + 标题 */}
          <div className="flex items-center gap-2 min-w-0">
            {/* 移动端汉堡菜单 */}
            <button
              type="button"
              onClick={openMobileOutline}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            {/* 桌面端大纲切换 */}
            <button
              type="button"
              onClick={() => setOutlineOpen((v) => !v)}
              className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:flex"
            >
              {outlineOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {courseLabel}
              </p>
              <h1 className="truncate text-sm font-bold text-foreground md:text-base">
                {courseTitle}
              </h1>
            </div>
          </div>

          {/* 右侧工具栏 */}
          <div className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
            <button
              type="button"
              onClick={toggleDark}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
              title={isDark ? '切换浅色' : '切换深色'}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <div className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => { setCompanionOpen((v) => !v); openMobileCompanion(); }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-accent ${
                companionOpen ? 'text-primary' : 'text-muted-foreground'
              }`}
              title="伴学助手"
            >
              <Bot className="h-3.5 w-3.5" />
            </button>
            <div className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => void navigate('/openmaic')}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
              title="返回首页"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 中央画布 */}
        <div className="flex flex-1 min-h-0 p-2 md:p-3 lg:p-4">
          <Stage
            scene={player.currentScene}
            agents={agents}
            messages={chat.messages}
            notes={notes}
            isPlaying={player.playbackStatus === 'playing'}
            canGoNext={player.canGoNext}
            canGoPrev={player.canGoPrev}
            onPlay={player.play}
            onPause={player.pause}
            onNext={player.goNext}
            onPrev={player.goPrev}
            onAskQuestion={chat.sendMessage}
          />
        </div>
      </main>

      {/* 右侧边栏 — 伴学助手 */}
      <aside
        className={`fixed right-0 top-0 z-30 flex h-full flex-col border-l border-border bg-card/95 backdrop-blur-md transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${
          companionOpen ? 'translate-x-0' : 'translate-x-full'
        } w-[300px] shrink-0 xl:w-[340px]`}
      >
        {/* 紧凑关闭按钮（仅移动端） */}
        <button
          type="button"
          onClick={() => { setCompanionOpen(false); setMobileOverlayVisible(false); }}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden z-10"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>

        <ChatPanel
          classroomId={classroomId}
          agents={agents}
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          notes={notes}
          onSendMessage={chat.sendMessage}
          onClose={companionOpen ? () => { setCompanionOpen(false); } : undefined}
        />
      </aside>
    </div>
  );
}

/** 场景列表项 */
interface SceneItemProps {
  scene: Scene;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function SceneItem({ scene, index, isActive, onClick }: SceneItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl border p-3 text-left transition-all ${
        isActive
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border hover:bg-muted/60'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* 编号徽章 */}
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ${
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-xs font-bold ${
              isActive ? 'text-primary' : 'text-foreground'
            }`}
          >
            {scene.title}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {scene.type === 'slide' ? '幻灯片' : scene.type === 'quiz' ? '测验' : scene.type === 'interactive' ? '互动' : '项目'}
          </p>
        </div>
      </div>
      {/* 缩略图占位 */}
      <div
        className={`mt-2 aspect-video w-full rounded-md ${
          isActive ? 'bg-primary/10 opacity-90' : 'bg-muted/50 opacity-50'
        }`}
      />
    </button>
  );
}
