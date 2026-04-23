/**
 * 场景边栏 —— 1:1 移植自 OpenMAIC `components/stage/scene-sidebar.tsx`。
 *
 * 视觉/拖拽宽度/缩略图布局/激活态/折叠态 完全照抄；颜色全部走全局 token：
 *   - gray-*       → muted / border / muted-foreground
 *   - purple/violet→ primary（激活高亮）
 *   - red          → destructive（生成失败态）
 *   - emerald/blue/orange/amber 等场景类型缩略图配色 → 复用 lucide icon + token；
 *     缩略图块本身保留 OpenMAIC 的渐变方案（功能性区分），但底色 base-100 走 muted。
 *
 * 拖拽尺寸默认 220 / min 170 / max 400，与 OpenMAIC 一致。
 * 我们的 scene 没有 PENDING_SCENE_ID / generatingOutlines / failedOutlines 概念，
 * 这部分逻辑用 prop 注入 placeholder，不在 sidebar 内部强耦合。
 */
import {
  AlertCircle,
  BookOpen,
  Cpu,
  Globe,
  MousePointer2,
  PanelLeftClose,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  type FC,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

import type { Scene, SceneType } from '../../types/scene';

/** 生成中的占位条目 —— 由父级注入（我们当前没有 streaming outline 流程，可不传） */
export interface PendingSceneEntry {
  id: string;
  title: string;
  isFailed?: boolean;
  isPaused?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void | Promise<void>;
}

interface SceneSidebarProps {
  readonly scenes: Scene[];
  readonly currentSceneId: string | null;
  readonly collapsed: boolean;
  readonly onCollapseChange: (collapsed: boolean) => void;
  readonly onSceneSelect: (sceneId: string) => void;
  readonly pendingEntry?: PendingSceneEntry | null;
  readonly width?: number;
  readonly onWidthChange?: (width: number) => void;
  readonly logo?: React.ReactNode;
  readonly onLogoClick?: () => void;
}

const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 170;
const MAX_WIDTH = 400;

const SCENE_TYPE_ICON: Record<SceneType, typeof BookOpen> = {
  slide: BookOpen,
  interactive: MousePointer2,
  pbl: Cpu,
};

export const SceneSidebar: FC<SceneSidebarProps> = ({
  scenes,
  currentSceneId,
  collapsed,
  onCollapseChange,
  onSceneSelect,
  pendingEntry,
  width,
  onWidthChange,
  logo,
  onLogoClick,
}) => {
  const { t } = useAppTranslation();
  const [internalWidth, setInternalWidth] = useState(width ?? DEFAULT_WIDTH);
  const sidebarWidth = width ?? internalWidth;
  const isDraggingRef = useRef(false);

  const setWidth = useCallback(
    (next: number) => {
      if (onWidthChange) onWidthChange(next);
      else setInternalWidth(next);
    },
    [onWidthChange],
  );

  const handleDragStart = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth, setWidth],
  );

  const displayWidth = collapsed ? 0 : sidebarWidth;

  return (
    <div
      style={{
        width: displayWidth,
        transition: isDraggingRef.current ? 'none' : 'width 0.3s ease',
      }}
      className="bg-card/80 backdrop-blur-xl border-r border-border shadow-[2px_0_24px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 relative overflow-visible"
    >
      {/* 拖拽手柄 */}
      {!collapsed && (
        <div
          onMouseDown={handleDragStart}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group hover:bg-primary/30 active:bg-primary/40 transition-colors"
        >
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors" />
        </div>
      )}

      <div className={cn('flex flex-col w-full h-full overflow-hidden', collapsed && 'hidden')}>
        {/* Logo / 折叠头 */}
        <div className="h-10 flex items-center justify-between shrink-0 relative mt-3 mb-1 px-3">
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-1.5 -mx-1.5 py-1 -my-1 hover:bg-accent active:scale-[0.97] transition-all duration-150"
            title={t('classroom.common.backHome')}
          >
            {logo ?? (
              <span className="text-sm font-bold tracking-tight text-foreground">{t('classroom.stage.xiaomaiBrand')}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onCollapseChange(true)}
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-border/40 hover:bg-accent hover:text-foreground active:scale-90 transition-all duration-200"
            aria-label={t('classroom.stage.ariaCollapseSidebar')}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* 场景列表 */}
        <div
          data-testid="scene-list"
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 pt-1"
        >
          {scenes.map((scene, index) => {
            const isActive = currentSceneId === scene.id;
            const Icon = SCENE_TYPE_ICON[scene.type] ?? BookOpen;

            return (
              <div
                key={scene.id}
                data-testid="scene-item"
                onClick={() => onSceneSelect(scene.id)}
                className={cn(
                  'group relative rounded-lg transition-all duration-200 cursor-pointer flex flex-col gap-1 p-1.5',
                  isActive
                    ? 'bg-primary/10 ring-1 ring-primary/40'
                    : 'hover:bg-accent/60',
                )}
              >
                {/* 场景头：编号 + 标题 */}
                <div className="flex justify-between items-center px-2 pt-0.5">
                  <div className="flex items-center gap-2 max-w-full">
                    <span
                      className={cn(
                        'text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      data-testid="scene-title"
                      className={cn(
                        'text-xs font-bold truncate transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {scene.title}
                    </span>
                  </div>
                </div>

                {/* 缩略图占位 —— 按 scene.type 区分视觉模板 */}
                <div className="relative aspect-video w-full rounded overflow-hidden bg-muted ring-1 ring-border/60">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SceneThumbnail scene={scene} icon={Icon} />
                    {scene.type === 'slide' && (
                      <div
                        className={cn(
                          'absolute inset-0 transition-colors',
                          isActive ? 'bg-transparent' : 'group-hover:bg-foreground/5',
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 单个生成中占位（可点击） —— 由父级 pendingEntry 注入 */}
          {pendingEntry && (
            <PendingSceneCard
              entry={pendingEntry}
              indexLabel={scenes.length + 1}
              isActive={currentSceneId === pendingEntry.id}
            />
          )}
        </div>

        <div className="mt-auto" />
      </div>
    </div>
  );
};

/** 场景缩略图 —— OpenMAIC quiz/interactive/pbl 三种模板 1:1 移植，
 *  slide 类型暂用图标占位（缩略图渲染需要单独的 ThumbnailSlide 组件）。 */
const SceneThumbnail: FC<{ scene: Scene; icon: typeof BookOpen }> = ({ scene, icon: Icon }) => {
  if (scene.type === 'interactive') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 p-1.5 flex flex-col">
        <div className="flex items-center gap-1 mb-1 pb-1 border-b border-emerald-200/40 dark:border-emerald-700/20">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-red-300/70" />
            <div className="w-1 h-1 rounded-full bg-amber-300/70" />
            <div className="w-1 h-1 rounded-full bg-green-300/70" />
          </div>
          <div className="h-1.5 flex-1 bg-emerald-200/40 dark:bg-emerald-700/30 rounded-full ml-0.5" />
        </div>
        <div className="flex-1 flex gap-1">
          <div className="w-1/4 space-y-1 pt-0.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-0.5 w-full bg-emerald-200/60 dark:bg-emerald-700/30 rounded-full"
              />
            ))}
          </div>
          <div className="flex-1 bg-emerald-100/40 dark:bg-emerald-800/20 rounded flex items-center justify-center border border-emerald-200/40 dark:border-emerald-700/20">
            <Globe className="w-4 h-4 text-emerald-300/80 dark:text-emerald-600/50" />
          </div>
        </div>
      </div>
    );
  }

  if (scene.type === 'pbl') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-1.5 flex flex-col">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-1.5 h-1.5 rounded bg-blue-300 dark:bg-blue-600" />
          <div className="h-1 w-8 bg-blue-200/60 dark:bg-blue-700/30 rounded-full" />
        </div>
        <div className="flex-1 flex gap-1 overflow-hidden">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className="flex-1 bg-card/50 rounded p-0.5 flex flex-col gap-0.5"
            >
              <div
                className={cn(
                  'h-0.5 w-3 rounded-full mb-0.5',
                  col === 0 ? 'bg-blue-300/70' : col === 1 ? 'bg-amber-300/70' : 'bg-green-300/70',
                )}
              />
              {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-full bg-blue-100/60 dark:bg-blue-800/20 rounded border border-blue-200/30 dark:border-blue-700/20"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // slide / fallback —— icon + label
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground/50">
      <Icon className="w-4 h-4" />
      <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{scene.type}</span>
    </div>
  );
};

/** 生成中 / 失败的占位卡 —— OpenMAIC pending state 1:1 复刻，颜色走 token */
const PendingSceneCard: FC<{
  entry: PendingSceneEntry;
  indexLabel: number;
  isActive: boolean;
}> = ({ entry, indexLabel, isActive }) => {
  const { t } = useAppTranslation();
  const isFailed = entry.isFailed === true;
  const isPaused = entry.isPaused === true;
  const isRetrying = entry.isRetrying === true;

  return (
    <div
      key={`generating-${entry.id}`}
      className={cn(
        'group relative rounded-lg flex flex-col gap-1 p-1.5 transition-all duration-200',
        isFailed ? 'opacity-100 cursor-default' : 'cursor-pointer hover:bg-accent/60',
        !isFailed && !isActive && 'opacity-60',
        isActive && !isFailed && 'bg-primary/10 ring-1 ring-primary/40 opacity-100',
      )}
    >
      <div className="flex justify-between items-center px-2 pt-0.5">
        <div className="flex items-center gap-2 max-w-full">
          <span
            className={cn(
              'text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0',
              isActive && !isFailed
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {indexLabel}
          </span>
          <span
            className={cn(
              'text-xs font-bold truncate transition-colors',
              isActive && !isFailed
                ? 'text-primary'
                : isFailed
                  ? 'text-foreground'
                  : 'text-muted-foreground',
            )}
          >
            {entry.title}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'relative aspect-video w-full rounded overflow-hidden ring-1',
          isFailed ? 'bg-destructive/5 ring-destructive/20' : 'bg-muted ring-border/60',
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {isFailed ? (
            <div className="flex items-center gap-1 text-xs font-medium text-destructive">
              {entry.onRetry ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void entry.onRetry?.();
                  }}
                  disabled={isRetrying}
                  className="p-1 -ml-1 rounded-md hover:bg-destructive/15 transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  title={t('classroom.common.retry')}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} />
                </button>
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{isRetrying ? t('classroom.common.retrying') : t('classroom.common.generateFailed')}</span>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'h-2 w-3/5 bg-muted-foreground/20 rounded',
                  !isPaused && 'animate-pulse',
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-2/5 bg-muted-foreground/20 rounded',
                  !isPaused && 'animate-pulse',
                )}
              />
              <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                {isPaused ? t('classroom.common.paused') : t('classroom.common.generating')}
              </span>
            </>
          )}
        </div>
        {!isFailed && !isPaused && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        )}
      </div>
    </div>
  );
};
