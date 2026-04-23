/**
 * 课堂播放页（由 OpenMAIC 移植，Wave 1 已合入 features/classroom）。
 * 三栏布局：课程大纲 | 主画布（幻灯片+白板）| 智能体讨论。
 * 与 UI 设计稿 01-classroom.html 对应。
 */
import { ArrowRight, Layers, Sparkles, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { GlobalTopNav } from '@/components/navigation/global-top-nav';
import { EmptyState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';

import { loadClassroom } from '../db/classroom-db';
import { useDirectorChat } from '../hooks/use-director-chat';
import { useScenePlayer } from '../hooks/use-scene-player';
import { useClassroomStore } from '../stores/classroom-store';
import { Stage } from '../components/stage';
import { ChatArea } from '../components/chat/chat-area';
import { ClassroomHeader } from '../components/classroom-header';
import { SceneSidebar } from '../components/stage/scene-sidebar';
import type { AgentSummary } from '../types/classroom';
import type { AgentProfile } from '../types/agent';

/**
 * 把持久化在 Classroom.agents 里的 AgentSummary（轻量字段集）补齐成
 * AgentProfile —— 仅缺的 persona / priority 字段以默认值填充，避免使用 `as any`。
 */
function summariesToProfiles(agents: AgentSummary[]): AgentProfile[] {
  return agents.map((a, idx) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    avatar: a.avatar,
    color: a.color,
    persona: '',
    priority: idx + 1,
  }));
}

export function ClassroomPlayPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [outlineOpen, setOutlineOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [isMobileOverlayVisible, setMobileOverlayVisible] = useState(false);
  // 边栏宽度受 store 持久化（W3c 已扩展）；折叠状态本地驱动
  const sidebarWidth = useClassroomStore((s) => s.sidebarWidth);
  const setSidebarWidth = useClassroomStore((s) => s.setSidebarWidth);
  const chatAreaWidth = useClassroomStore((s) => s.chatAreaWidth);
  const setChatAreaWidth = useClassroomStore((s) => s.setChatAreaWidth);
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
        setAgents(summariesToProfiles(c.agents));
      }
    });
  }, [classroomId, classroom, setClassroom, setAgents]);

  // 当前 classroom.agents 比 store.agents 新时也同步一次
  useEffect(() => {
    if (classroom && Array.isArray(classroom.agents) && classroom.agents.length > 0) {
      const currentIds = agents.map((a) => a.id).join(',');
      const classroomIds = classroom.agents.map((a) => a.id).join(',');
      if (currentIds !== classroomIds) {
        setAgents(summariesToProfiles(classroom.agents));
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

  // 检测课堂播放完毕 —— 引导跳转 learning-coach 课后测试
  const sceneCount = player.scenes.length;
  const playbackCompleted = player.playbackStatus === 'completed';
  const [postClassDismissed, setPostClassDismissed] = useState(false);
  const showPostClassCTA = playbackCompleted && sceneCount > 0 && !postClassDismissed;

  // 课堂切换时重置 CTA 关闭状态，避免后端重新就绪时弹窗不出现
  useEffect(() => {
    setPostClassDismissed(false);
  }, [classroomId]);

  /**
   * 跳转到 learning-coach 的 Quiz 入口。
   * 路由实际形态：`/coach/:sessionId`（learning-coach-entry-page）。
   * 课堂场景以 classroomId 作为 seed sessionId，并通过 sourceType=classroom
   * + sourceTaskId 让目标页识别来源（与 utils/source.ts 契约一致）。
   */
  const handleStartQuiz = useCallback(() => {
    if (!classroomId) return;
    const topic = classroom?.name ?? '';
    const params = new URLSearchParams({
      sourceType: 'classroom',
      sourceSessionId: classroomId,
      sourceTaskId: classroomId,
    });
    if (topic) params.set('topicHint', topic);
    void navigate(`/coach/${encodeURIComponent(classroomId)}?${params.toString()}`);
  }, [classroomId, classroom?.name, navigate]);

  const courseLabel = useMemo(() => 'OpenMAIC', []);

  if (!classroomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="课堂 ID 不存在"
          description="请从课堂列表重新进入。"
          action={
            <Button onClick={() => void navigate('/openmaic')} variant="outline">
              返回课堂列表
            </Button>
          }
        />
      </div>
    );
  }

  const courseTitle = classroom?.name ?? null;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-muted/30">
      <GlobalTopNav links={[]} variant="surface" />
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

      {/* 左侧边栏 — 课程大纲（OpenMAIC 1:1 移植：可拖拽宽度 + 缩略图） */}
      <div
        className={`fixed left-0 top-0 z-30 h-full transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${
          outlineOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {player.scenes.length === 0 ? (
          <aside
            style={{ width: outlineOpen ? sidebarWidth : 0 }}
            className="flex h-full flex-col border-r border-border bg-card/95 backdrop-blur-md overflow-hidden"
          >
            <LoadingState size="sm" message="场景加载中..." />
          </aside>
        ) : (
          <SceneSidebar
            scenes={player.scenes}
            currentSceneId={player.currentScene?.id ?? null}
            collapsed={!outlineOpen}
            onCollapseChange={(c) => { setOutlineOpen(!c); setMobileOverlayVisible(false); }}
            onSceneSelect={(id) => player.goToScene(id)}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onLogoClick={() => void navigate('/openmaic')}
          />
        )}
      </div>

      {/* 主内容区 */}
      <main className="flex flex-1 min-w-0 flex-col">
        <ClassroomHeader
          courseLabel={courseLabel}
          courseTitle={courseTitle}
          isDark={isDark}
          onToggleDark={toggleDark}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onOpenMobileOutline={openMobileOutline}
          companionOpen={companionOpen}
          onToggleCompanion={() => { setCompanionOpen((v) => !v); openMobileCompanion(); }}
          onBackHome={() => void navigate('/openmaic')}
        />

        {/* 中央画布 —— 对齐 OpenMAIC 全屏无 padding：CanvasArea 内部自身有 p-2 */}
        <div className="flex flex-1 min-h-0">
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
            sceneIndex={player.currentScene
              ? player.scenes.findIndex((s) => s.id === player.currentScene?.id)
              : 0}
            scenesCount={player.scenes.length}
            isStreaming={chat.isStreaming}
          />
        </div>
      </main>

      {/* 右侧边栏 — 伴学助手（OpenMAIC 1:1：双 Tab + 拖拽宽度 + 玻璃感） */}
      <div
        className={`fixed right-0 top-0 z-30 h-full transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${
          companionOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <ChatArea
          messages={chat.messages}
          notes={notes}
          isStreaming={chat.isStreaming}
          currentSceneId={player.currentScene?.id ?? null}
          onSendMessage={chat.sendMessage}
          collapsed={!companionOpen}
          onCollapseChange={(c) => { setCompanionOpen(!c); setMobileOverlayVisible(false); }}
          width={chatAreaWidth}
          onWidthChange={setChatAreaWidth}
        />
      </div>

      {/* 课堂结束 —— 课后测试引导 */}
      {showPostClassCTA && (
        <PostClassCTA
          courseTitle={classroom?.name ?? '本节课'}
          onStartQuiz={handleStartQuiz}
          onDismiss={() => setPostClassDismissed(true)}
        />
      )}
    </div>
  );
}

/**
 * 课后测试引导浮层。
 * 视觉对齐 OpenMAIC 完成态卡片：圆角 2xl + 顶部色带 + 居中 trophy 徽章 + 主次按钮组。
 */
interface PostClassCTAProps {
  courseTitle: string;
  onStartQuiz: () => void;
  onDismiss: () => void;
}

function PostClassCTA({ courseTitle, onStartQuiz, onDismiss }: PostClassCTAProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-class-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)]">
        {/* 顶部彩带 —— 对齐 OpenMAIC AlertDialog accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-2 pt-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/60 dark:bg-amber-900/20 dark:ring-amber-700/30">
            <Trophy className="h-7 w-7 text-amber-500 dark:text-amber-400" />
          </div>
          <h3 id="post-class-title" className="mb-1.5 text-lg font-bold tracking-tight text-foreground">
            课堂结束
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            学得不错！来做个课后测试巩固一下「{courseTitle}」吧。
          </p>
        </div>

        <div className="flex flex-row gap-3 px-6 pb-6 pt-4">
          <Button
            onClick={onDismiss}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            稍后再说
          </Button>
          <Button
            onClick={onStartQuiz}
            className="flex-1 rounded-xl shadow-md shadow-amber-200/50 dark:shadow-amber-900/30"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            开始测试
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

