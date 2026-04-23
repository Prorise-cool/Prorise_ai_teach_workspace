/**
 * 行内动作标签组件 —— 1:1 复制自 OpenMAIC `components/chat/inline-action-tag.tsx`。
 *
 * 用于在聊天/讲稿流中标注 AI 触发的动作（spotlight / 白板写字 / 讨论等），
 * 视觉上是一颗带图标 + 标签 + 状态色的小药丸 pill。
 *
 * 配色策略：保留 OpenMAIC 原始的「语义状态色」(violet / yellow / red / amber)，
 * 因为这是**功能性**色彩（区分动作类型），并非品牌色，全局 token 没有等价物。
 * 全部色调都是柔和的 *-50 / dark:*-500/15 半透明，不会与全局主色冲突。
 */
import {
  Flashlight,
  MousePointer2,
  Type,
  Shapes,
  Eraser,
  PanelLeftOpen,
  PanelLeftClose,
  MessageSquare,
  Zap,
  Loader2,
  BarChart3,
  Sigma,
  Table2,
  PenLine,
  Trash2,
  Play,
  Minus,
  Code2,
  FileCode,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { cn } from '@/lib/utils';

interface InlineActionTagProps {
  actionName: string;
  state: string;
}

// ── Style tokens ──────────────────────────────────────────────

const WB_STYLE =
  'bg-violet-50 dark:bg-violet-500/15 border-violet-300/40 dark:border-violet-500/30 text-violet-600 dark:text-violet-300';
const WB_ACCENT = 'bg-violet-500 dark:bg-violet-400';

const SPOTLIGHT_STYLE =
  'bg-yellow-50 dark:bg-yellow-500/15 border-yellow-300/40 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-300';
const LASER_STYLE =
  'bg-red-50 dark:bg-red-500/15 border-red-300/40 dark:border-red-500/30 text-red-600 dark:text-red-300';
const DISCUSS_STYLE =
  'bg-amber-50 dark:bg-amber-500/15 border-amber-300/40 dark:border-amber-500/30 text-amber-700 dark:text-amber-300';
const DEFAULT_STYLE =
  'bg-muted border-border text-muted-foreground';

// ── Action config ─────────────────────────────────────────────

interface ActionCfg {
  /** i18n key suffix under `classroom.inlineAction.` */
  labelKey: string;
  Icon: LucideIcon;
  style: string;
  /** Whiteboard family — gets the pen-line accent indicator */
  wb?: boolean;
}

const ACTION_CONFIG: Record<string, ActionCfg> = {
  // 幻灯片效果
  spotlight: { labelKey: 'spotlight', Icon: Flashlight, style: SPOTLIGHT_STYLE },
  laser: { labelKey: 'laser', Icon: MousePointer2, style: LASER_STYLE },
  play_video: { labelKey: 'play', Icon: Play, style: SPOTLIGHT_STYLE },

  // 白板生命周期
  wb_open: { labelKey: 'wbOpen', Icon: PanelLeftOpen, style: WB_STYLE, wb: true },
  wb_close: { labelKey: 'wbClose', Icon: PanelLeftClose, style: WB_STYLE, wb: true },
  wb_clear: { labelKey: 'wbClear', Icon: Eraser, style: WB_STYLE, wb: true },
  wb_delete: { labelKey: 'wbDelete', Icon: Trash2, style: WB_STYLE, wb: true },

  // 白板绘制
  wb_draw_text: { labelKey: 'wbDrawText', Icon: Type, style: WB_STYLE, wb: true },
  wb_draw_shape: { labelKey: 'wbDrawShape', Icon: Shapes, style: WB_STYLE, wb: true },
  wb_draw_chart: { labelKey: 'wbDrawChart', Icon: BarChart3, style: WB_STYLE, wb: true },
  wb_draw_latex: { labelKey: 'wbDrawLatex', Icon: Sigma, style: WB_STYLE, wb: true },
  wb_draw_table: { labelKey: 'wbDrawTable', Icon: Table2, style: WB_STYLE, wb: true },
  wb_draw_line: { labelKey: 'wbDrawLine', Icon: Minus, style: WB_STYLE, wb: true },
  wb_draw_code: { labelKey: 'wbDrawCode', Icon: Code2, style: WB_STYLE, wb: true },
  wb_edit_code: { labelKey: 'wbEditCode', Icon: FileCode, style: WB_STYLE, wb: true },

  // 互动
  discussion: { labelKey: 'discussion', Icon: MessageSquare, style: DISCUSS_STYLE },
};

// ── Component ─────────────────────────────────────────────────

export function InlineActionTag({ actionName, state }: InlineActionTagProps) {
  const { t } = useAppTranslation();
  const config = ACTION_CONFIG[actionName];
  const Icon = config?.Icon || Zap;
  const label = config ? t(`classroom.inlineAction.${config.labelKey}`) : actionName;
  const style = config?.style || DEFAULT_STYLE;
  const isWb = config?.wb ?? false;
  const isRunning = state === 'running' || state === 'input-available';

  return (
    <span
      className={cn(
        'inline-flex items-center mx-1 rounded-full border align-middle leading-none whitespace-nowrap',
        'text-[9px] font-bold tracking-wide',
        // 带白板 accent 时左侧 padding 收紧（accent 已提供视觉重量）
        isWb ? 'pl-0.5 pr-1.5 py-px' : 'px-1.5 py-px',
        style,
        isRunning && 'animate-pulse',
      )}
    >
      {/* 白板 accent：左侧的小 PenLine 圆片 */}
      {isWb && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full mr-0.5 shrink-0',
            'w-3 h-3',
            WB_ACCENT,
          )}
        >
          <PenLine className="w-[7px] h-[7px] text-white dark:text-violet-950" strokeWidth={2.5} />
        </span>
      )}

      {/* 动作图标 */}
      {isRunning ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
      ) : (
        <Icon className="w-2.5 h-2.5 shrink-0" />
      )}

      <span className="ml-0.5">{label}</span>
    </span>
  );
}
