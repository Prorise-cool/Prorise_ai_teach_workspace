/**
 * 课堂顶部栏 —— 视觉对标 OpenMAIC `components/header.tsx`（~257 行）。
 *
 * 只抽取**层级/排版/玻璃感 pill** 三件事；
 * 依赖 OpenMAIC 特有的 `useI18n / useTheme / LanguageSwitcher / SettingsDialog /
 * useExportPPTX / useMediaGenerationStore` 的块全部跳过（我们的 Wave 1 尚未接入
 * 这些基础设施，见任务卡 Task 7 的 skip 说明）。这里只保留能**独立好抄**的部分：
 *
 *   左：ArrowLeft 返回按钮 + 课堂顶标（UPPER 角标 + 粗体标题）
 *   右：玻璃感 pill（backdrop-blur + rounded-full + border + shadow）
 *       └── 主题切换（Sun / Moon，本地 dark class）
 *           Bot 伴学助手开关（externalized via onToggleCompanion）
 *           Back 到首页 ChevronLeft
 *
 * 颜色全部走 token。从 classroom-play-page 抽出后，原页面只保留 <ClassroomHeader/>
 * 调用 + 三栏 main，整个 page 更清爽。
 */
import {
  Bot,
  ChevronLeft,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { LoadingState } from '@/components/states';

interface ClassroomHeaderProps {
  /** 顶部 UPPER 角标（例：OpenMAIC / 品牌名） */
  readonly courseLabel: string;
  /** 课堂标题；null 时显示加载态 */
  readonly courseTitle: string | null;
  /** 是否深色模式 */
  readonly isDark: boolean;
  readonly onToggleDark: () => void;
  /** 左侧大纲折叠态 —— 控制 icon 切换 */
  readonly outlineOpen: boolean;
  readonly onToggleOutline: () => void;
  /** 移动端汉堡菜单回调 */
  readonly onOpenMobileOutline: () => void;
  /** 右侧伴学助手开关 */
  readonly companionOpen: boolean;
  readonly onToggleCompanion: () => void;
  /** 返回首页 */
  readonly onBackHome: () => void;
  /** 额外插槽：右侧 pill 最左侧可插入（预留导出按钮等） */
  readonly trailingExtras?: ReactNode;
}

export const ClassroomHeader: FC<ClassroomHeaderProps> = ({
  courseLabel,
  courseTitle,
  isDark,
  onToggleDark,
  outlineOpen,
  onToggleOutline,
  onOpenMobileOutline,
  companionOpen,
  onToggleCompanion,
  onBackHome,
  trailingExtras,
}) => {
  const { t } = useAppTranslation();
  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 px-6 md:px-8 backdrop-blur-md">
      {/* 左侧：菜单 + 标题 */}
      <div className="flex min-w-0 items-center gap-2">
        {/* 移动端汉堡 */}
        <button
          type="button"
          onClick={onOpenMobileOutline}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
          aria-label={t('classroom.header.ariaOpenOutline')}
        >
          <Menu className="h-4 w-4" />
        </button>
        {/* 桌面端大纲切换 */}
        <button
          type="button"
          onClick={onToggleOutline}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:flex"
          aria-label={outlineOpen ? t('classroom.header.ariaCollapseOutline') : t('classroom.header.ariaExpandOutline')}
        >
          {outlineOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {courseLabel}
          </p>
          {courseTitle ? (
            <h1 className="truncate text-base font-bold tracking-tight text-foreground md:text-lg">
              {courseTitle}
            </h1>
          ) : (
            <LoadingState size="sm" variant="inline" message={t('classroom.common.loading')} />
          )}
        </div>
      </div>

      {/* 右侧玻璃感 pill —— 1:1 对标 OpenMAIC header 的 bg-white/60 backdrop-blur-md pill */}
      <div className="flex items-center gap-1 rounded-full border border-border/40 bg-card/60 px-2 py-1 shadow-sm backdrop-blur-md">
        {trailingExtras}
        <button
          type="button"
          onClick={onToggleDark}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          title={isDark ? t('classroom.header.toggleLight') : t('classroom.header.toggleDark')}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={onToggleCompanion}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-accent ${
            companionOpen ? 'text-primary' : 'text-muted-foreground'
          }`}
          title={t('classroom.header.companion')}
          aria-pressed={companionOpen}
        >
          <Bot className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={onBackHome}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          title={t('classroom.header.backHome')}
          aria-label={t('classroom.header.backHome')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
