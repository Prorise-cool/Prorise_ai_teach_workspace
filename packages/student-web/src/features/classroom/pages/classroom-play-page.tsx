/**
 * 课堂播放页（由 OpenMAIC 移植，Wave 1 已合入 features/classroom）。
 * 三栏布局：课程大纲 | 主画布（幻灯片+白板）| 智能体讨论。
 * 与 UI 设计稿 01-classroom.html 对应。
 */
import {
  ArrowRight,
  Globe2,
  Layers,
  Loader2,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { CompanionSidebar } from '@/components/companion';
import type {
  CompanionDataAdapter,
  CompanionQuickAction,
} from '@/components/companion';
import { EmptyState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useThemeMode } from '@/shared/hooks/use-theme-mode';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';
import { resolveClassroomPublicAdapter } from '@/services/api/adapters/classroom-public-adapter';

import { loadClassroom } from '../db/classroom-db';
import { useScenePlayer } from '../hooks/use-scene-player';
import { useClassroomStore } from '../stores/classroom-store';
import { Stage } from '../components/stage';
import { ClassroomHeader } from '../components/classroom-header';
import { SceneSidebar } from '../components/stage/scene-sidebar';
import { buildClassroomContext } from '../utils/build-classroom-context';
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
  const { t } = useAppTranslation();
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [outlineOpen, setOutlineOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [isMobileOverlayVisible, setMobileOverlayVisible] = useState(false);
  // 边栏宽度受 store 持久化（W3c 已扩展）；折叠状态本地驱动
  const sidebarWidth = useClassroomStore((s) => s.sidebarWidth);
  const setSidebarWidth = useClassroomStore((s) => s.setSidebarWidth);
  const chatAreaWidth = useClassroomStore((s) => s.chatAreaWidth);
  const { themeMode, toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';

  // Load classroom from DB into store
  const classroom = useClassroomStore((s) => s.classroom);
  const agents = useClassroomStore((s) => s.agents);
  const setClassroom = useClassroomStore((s) => s.setClassroom);
  const setAgents = useClassroomStore((s) => s.setAgents);
  // 区分"加载中"和"确认找不到" —— 避免伪 ID 打开空三栏架构
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!classroomId) return;
    if (classroom?.id === classroomId) {
      setLoadStatus('ready');
      return;
    }
    setLoadStatus('loading');
    // 切换课堂前 reset：清掉旧 currentSceneId / playbackStatus / agents
    // 否则 useActionPlayer 会用旧 scene.actions 继续跑 speechSynthesis 队列，
    // 导致用户进入新课堂仍听到第一节 TTS。
    if (useClassroomStore.getState().classroom?.id !== classroomId) {
      useClassroomStore.getState().resetClassroom();
    }
    void loadClassroom(classroomId).then((c) => {
      if (!c) {
        setLoadStatus('missing');
        return;
      }
      setClassroom(c);
      setLoadStatus('ready');
      // 从持久化的 classroom.agents 回灌 store.agents —— 避免刷新后教师气泡消失
      if (Array.isArray(c.agents) && c.agents.length > 0) {
        setAgents(summariesToProfiles(c.agents));
      }
      // 自动选中第 1 个场景（OpenMAIC 行为：进入课堂直接进 scene 1，不显示"选择场景"空态）
      const firstScene = c.scenes?.[0];
      if (firstScene) {
        useClassroomStore.getState().setCurrentScene(firstScene.id);
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
  const setHighlightedElementId = useClassroomStore(
    (s) => s.setHighlightedElementId,
  );

  // Phase 4：把课堂 classroom-adapter 的 askCompanion 包装成共享侧栏的
  // CompanionDataAdapter —— 同时把 agents 与 language directive 注入。
  const companionAdapter = useMemo<CompanionDataAdapter>(() => {
    const impl = resolveClassroomAdapter();
    return {
      ask(params) {
        return (async function* () {
          const ctx = params.contextSnapshot;
          // metadata 承载 sceneId 等（来自 buildClassroomContext 产物）
          const classroomContext =
            (ctx.metadata as Record<string, unknown> | undefined)
              ?.classroomContext ?? {};
          for await (const event of impl.askCompanion({
            questionText: params.questionText,
            classroomContext:
              classroomContext as Parameters<typeof impl.askCompanion>[0]['classroomContext'],
            agents,
            languageDirective: classroom?.stage?.languageDirective,
            taskId: classroom?.taskId ?? classroomId,
          })) {
            yield event;
          }
        })();
      },
    };
  }, [agents, classroom?.stage?.languageDirective, classroom?.taskId, classroomId]);

  const currentScene = player.currentScene;
  const getContextSnapshot = useCallback(() => {
    const payload = buildClassroomContext({ classroom, scene: currentScene });
    return {
      text: JSON.stringify(payload),
      metadata: { classroomContext: payload },
    };
  }, [classroom, currentScene]);

  const companionQuickActions = useMemo<CompanionQuickAction[]>(
    () => [
      {
        label: t('classroom.companion.quickExplain'),
        prompt: t('classroom.companion.quickExplainPrompt'),
      },
      {
        label: t('classroom.companion.quickKeyPoints'),
        prompt: t('classroom.companion.quickKeyPointsPrompt'),
      },
      {
        label: t('classroom.companion.quickExample'),
        prompt: t('classroom.companion.quickExamplePrompt'),
      },
    ],
    [t],
  );

  const anchorLabel = currentScene
    ? t('classroom.companion.anchorLabel', {
        title: currentScene.title,
        order: currentScene.order ?? currentScene.outline?.order ?? '',
      })
    : null;

  const handleElementReference = useCallback(
    (elementId: string) => {
      setHighlightedElementId(elementId, 3000);
    },
    [setHighlightedElementId],
  );

  const handleAskQuestion = useCallback(
    async (_text: string) => {
      // 底部 "提问" 输入现在由右侧 Companion 统一承接；保留回调链以兼容
      // 老接口签名，实际打开侧栏即可。
      setCompanionOpen(true);
    },
    [],
  );

  const toggleDark = toggleThemeMode;

  const openMobileOutline = useCallback(() => {
    setOutlineOpen(true);
    setCompanionOpen(false);
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

  const courseLabel = t('classroom.stage.xiaomaiBrand');

  if (!classroomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title={t('classroom.playPage.noIdTitle')}
          description={t('classroom.playPage.noIdDescription')}
          action={
            <Button onClick={() => void navigate('/classroom/input')} variant="outline">
              {t('classroom.playPage.backToList')}
            </Button>
          }
        />
      </div>
    );
  }

  // 课堂在 IndexedDB 中找不到 —— 可能是伪 ID（/classroom/play/test-id）或已过期链接。
  // 渲染 EmptyState 而不是空三栏架构，给用户明确的回到输入页入口。
  if (loadStatus === 'missing') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title={t('classroom.playPage.missingTitle')}
          description={t('classroom.playPage.missingDescription', { id: classroomId })}
          action={
            <Button onClick={() => void navigate('/classroom/input')} variant="outline">
              {t('classroom.playPage.backToInput')}
            </Button>
          }
        />
      </div>
    );
  }

  // 加载中 —— 比空三栏更明确
  if (loadStatus === 'loading' && !classroom) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingState size="lg" message={t('classroom.playPage.loadingTitle')} />
      </div>
    );
  }

  const courseTitle = classroom?.name ?? null;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* 背景纹理 —— 保留琥珀金系细网格（OpenMAIC 是纯 gray-50，我们在此延续既有品牌底） */}
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
          // 场景占位 —— 对齐 SceneSidebar 的 chrome（logo header + glass bg + border-r），
          // 避免加载态与正式态的视觉跳跃。
          <aside
            style={{ width: outlineOpen ? sidebarWidth : 0 }}
            className="flex h-full flex-col border-r border-border bg-card/80 backdrop-blur-xl shadow-[2px_0_24px_rgba(0,0,0,0.02)] shrink-0 overflow-hidden"
          >
            <div className="h-10 flex items-center shrink-0 mt-3 mb-1 px-3">
              <span className="text-sm font-bold tracking-tight text-foreground">
                {t('classroom.stage.xiaomaiBrand')}
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <LoadingState size="sm" message={t('classroom.playPage.sceneLoading')} />
            </div>
          </aside>
        ) : (
          <SceneSidebar
            scenes={player.scenes}
            currentSceneId={player.currentScene?.id ?? null}
            collapsed={!outlineOpen}
            onSceneSelect={(id) => player.goToScene(id)}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onLogoClick={() => void navigate('/')}
          />
        )}
      </div>

      {/* 主内容区 —— OpenMAIC `components/stage.tsx:946` 同型 min-w-0 relative，支撑内部 absolute 定位的 overlay */}
      <main className="relative flex flex-1 min-w-0 flex-col overflow-hidden">
        <ClassroomHeader
          courseLabel={courseLabel}
          courseTitle={courseTitle}
          isDark={isDark}
          onToggleDark={toggleDark}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onOpenMobileOutline={openMobileOutline}
          onBackHome={() => void navigate('/')}
          trailingExtras={
            <>
              {classroomId ? <PublishToggle classroomId={classroomId} /> : null}
              <button
                type="button"
                onClick={() => setCompanionOpen((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={
                  companionOpen
                    ? t('classroom.chat.ariaCollapsePanel')
                    : t('classroom.header.companion')
                }
                aria-label={
                  companionOpen
                    ? t('classroom.chat.ariaCollapsePanel')
                    : t('classroom.header.companion')
                }
              >
                {companionOpen ? (
                  <PanelRightClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelRightOpen className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          }
        />

        {/* 中央画布 —— 对齐 OpenMAIC 全屏无 padding：CanvasArea 内部自身有 p-2。
            注意：必须用块级（不是 flex）包裹 Stage，否则 Stage 作为 flex-row 子项
            默认 width: auto，canvas aspect-[16/9] 没有宽度参照会塌缩成窄条。 */}
        <div className="flex-1 min-h-0">
          <Stage
            scene={player.currentScene}
            agents={agents}
            messages={[]}
            isPlaying={player.playbackStatus === 'playing'}
            canGoNext={player.canGoNext}
            canGoPrev={player.canGoPrev}
            onPlay={player.play}
            onPause={player.pause}
            onNext={player.goNext}
            onPrev={player.goPrev}
            onAskQuestion={handleAskQuestion}
            sceneIndex={player.currentScene
              ? player.scenes.findIndex((s) => s.id === player.currentScene?.id)
              : 0}
            scenesCount={player.scenes.length}
            isStreaming={false}
          />
        </div>
      </main>

      {/* 右侧边栏 —— Phase 4 统一 Companion 侧栏（视频 / 课堂共享） */}
      <div
        className={`fixed right-0 top-0 z-30 h-full transition-transform duration-300 md:relative md:z-auto md:translate-x-0 ${
          companionOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
        style={{ width: companionOpen ? chatAreaWidth : 0 }}
      >
        <CompanionSidebar
          isOpen={companionOpen}
          onClose={() => {
            setCompanionOpen(false);
            setMobileOverlayVisible(false);
          }}
          adapter={companionAdapter}
          getContextSnapshot={getContextSnapshot}
          anchorLabel={anchorLabel}
          quickActions={companionQuickActions}
          onElementReference={handleElementReference}
          theme="indigo"
          sessionKey={classroomId}
          title={t('classroom.companion.title')}
          subtitle={t('classroom.companion.subtitle')}
          emptyHint={t('classroom.companion.emptyHint')}
          inputPlaceholder={t('classroom.companion.placeholder')}
        />
      </div>

      {/* 课堂结束 —— 课后测试引导 */}
      {showPostClassCTA && (
        <PostClassCTA
          courseTitle={classroom?.name ?? t('classroom.common.thisLesson')}
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
  const { t } = useAppTranslation();
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
          aria-label={t('classroom.playPage.ariaClose')}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-2 pt-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/60 dark:bg-amber-900/20 dark:ring-amber-700/30">
            <Trophy className="h-7 w-7 text-amber-500 dark:text-amber-400" />
          </div>
          <h3 id="post-class-title" className="mb-1.5 text-lg font-bold tracking-tight text-foreground">
            {t('classroom.playPage.postClassTitle')}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('classroom.playPage.postClassMessage', { title: courseTitle })}
          </p>
        </div>

        <div className="flex flex-row gap-3 px-6 pb-6 pt-4">
          <Button
            onClick={onDismiss}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            {t('classroom.playPage.postponeQuiz')}
          </Button>
          <Button
            onClick={onStartQuiz}
            className="flex-1 rounded-xl shadow-md shadow-amber-200/50 dark:shadow-amber-900/30"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {t('classroom.playPage.startQuiz')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


/**
 * 课堂公开 / 取消公开切换按钮 —— 注入到 ClassroomHeader 的 trailingExtras 插槽。
 * 点击 publish → POST /api/v1/classroom/tasks/{id}/publish；再点 → DELETE。
 * 初始状态默认私有（未知公开态则视作未发布，用户第一次点击即公开）。
 */
function PublishToggle({ classroomId }: { classroomId: string }) {
  const { t } = useAppTranslation();
  const [isPublic, setIsPublic] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 渲染期日志：如果你连这条都看不到，说明浏览器跑的是旧 bundle，
  // 需要硬刷新 (Cmd+Shift+R) 或重启 pnpm --filter student-web dev
  // eslint-disable-next-line no-console
  console.log(
    '[PublishToggle] RENDER classroomId=%s isPublic=%s',
    classroomId,
    isPublic,
  );

  // 挂载时 / classroomId 变化时拉一次当前状态，避免每次都默认显示"私有"
  useEffect(() => {
    const adapter = resolveClassroomPublicAdapter();
    const ac = new AbortController();
    // eslint-disable-next-line no-console
    console.log('[PublishToggle] useEffect fetch classroomId=%s', classroomId);
    void (async () => {
      try {
        const r = await adapter.getState(classroomId, { signal: ac.signal });
        if (!ac.signal.aborted) {
          // eslint-disable-next-line no-console
          console.info(
            '[PublishToggle] initial state classroomId=%s published=%s',
            classroomId,
            r.published,
          );
          setIsPublic(r.published);
        }
      } catch (err) {
        // 读不到不影响可用性（点击时仍可 publish），但把 error 吐到 console
        // 方便定位是 endpoint 404 / Java 未重启 / 网络问题
        if (!ac.signal.aborted) {
          // eslint-disable-next-line no-console
          console.warn('[PublishToggle] getState failed', err);
        }
      }
    })();
    return () => ac.abort();
  }, [classroomId]);

  const handleToggle = useCallback(async () => {
    if (isPending) return;
    setIsPending(true);
    setErrorMessage(null);
    const adapter = resolveClassroomPublicAdapter();
    try {
      if (isPublic) {
        const r = await adapter.unpublish(classroomId);
        setIsPublic(r.published);
      } else {
        const r = await adapter.publish(classroomId);
        setIsPublic(r.published);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '操作失败');
    } finally {
      setIsPending(false);
    }
  }, [classroomId, isPending, isPublic]);

  const activeTitle = isPublic
    ? t('classroom.publish.unpublishHint')
    : t('classroom.publish.publishHint');

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={isPending}
      title={errorMessage ?? activeTitle}
      aria-label={activeTitle}
      className={
        'flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors ' +
        (isPublic
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground')
      }
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPublic ? (
        <Globe2 className="h-3.5 w-3.5" />
      ) : (
        <Lock className="h-3.5 w-3.5" />
      )}
      <span>
        {isPublic ? t('classroom.publish.stateOn') : t('classroom.publish.stateOff')}
      </span>
    </button>
  );
}
