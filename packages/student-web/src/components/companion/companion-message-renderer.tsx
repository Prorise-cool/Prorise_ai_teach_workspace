/**
 * Companion 消息渲染器 —— 把 AI 回复里的元素引用解析成可点击药丸。
 *
 * 支持格式（契约 D，三种等价写法）：
 *   1. `[elem:slide-1-latex]`   ← 首选，明确
 *   2. `#slide-1-latex`         ← OpenMAIC 常见简写（允许出现在句子中间）
 *   3. `id:slide-1-latex`       ← 早期 prompt 残留格式，保兼容
 *
 * 点击药丸：调用 `onElementReference(elementId)`，课堂侧会在 store 上设
 * `highlightedElementId`，Stage 的元素 DOM 会在 3s 内叠加 outline。
 */
import { Crosshair } from 'lucide-react';
import type { FC } from 'react';
import { memo, useMemo } from 'react';

import { cn } from '@/lib/utils';

interface CompanionMessageRendererProps {
  content: string;
  onElementReference?: (elementId: string) => void;
  className?: string;
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'pill'; elementId: string };

/**
 * 组合正则：三种语法一次扫描。
 *   [elem:xxx] → group 1
 *   #xxx       → group 2 （仅接字母/数字/连字符/下划线开头的 token，避免把 URL 标签 `#top` 等也吞了）
 *   id:xxx     → group 3
 *
 * 为了避免在代码块或 URL 内误匹配 `#xxx`，要求 `#` 前面是空白或字符串起始。
 */
const ELEMENT_REF_RE =
  /\[elem:([A-Za-z0-9_-]+)\]|(?:^|(?<=\s))#([A-Za-z][A-Za-z0-9_-]*)|\bid:([A-Za-z0-9_-]+)/g;

export function parseCompanionMessage(content: string): Segment[] {
  if (!content) return [];
  const out: Segment[] = [];
  let lastIndex = 0;

  // 重置正则状态（module-level RE + /g 需要手动 reset 否则多次调用会错位）
  ELEMENT_REF_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ELEMENT_REF_RE.exec(content)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      out.push({ kind: 'text', text: content.slice(lastIndex, start) });
    }
    const elementId = match[1] ?? match[2] ?? match[3];
    if (elementId) {
      out.push({ kind: 'pill', elementId });
    }
    lastIndex = start + match[0].length;
  }
  if (lastIndex < content.length) {
    out.push({ kind: 'text', text: content.slice(lastIndex) });
  }
  return out;
}

/** 把 pill 序号渲染成圆圈数字 ①②③…（1-20）。超过 20 退化为 (N)。 */
function renderPillLabel(index: number): string {
  if (index < 1) return '';
  if (index <= 20) {
    // Unicode 带圈数字：U+2460 = ①，U+2461 = ②，...
    return String.fromCharCode(0x2460 + index - 1);
  }
  return `(${index})`;
}

export const CompanionMessageRenderer: FC<CompanionMessageRendererProps> = memo(
  ({ content, onElementReference, className }) => {
    const segments = useMemo(() => parseCompanionMessage(content), [content]);

    if (segments.length === 0) {
      return <span className={className}>{content}</span>;
    }

    let pillCounter = 0;
    return (
      <span className={className}>
        {segments.map((seg, idx) => {
          if (seg.kind === 'text') {
            return <span key={idx}>{seg.text}</span>;
          }
          // pill —— 隐藏内部元素 id，显示图标 + 序号
          pillCounter += 1;
          const label = renderPillLabel(pillCounter);
          const clickable = !!onElementReference;
          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable}
              onClick={() => onElementReference?.(seg.elementId)}
              title={clickable ? `定位到课堂第 ${pillCounter} 处引用` : undefined}
              className={cn(
                'mx-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors align-baseline',
                'bg-primary/10 text-primary ring-1 ring-primary/30',
                clickable
                  ? 'hover:bg-primary/20 active:bg-primary/30 cursor-pointer'
                  : 'cursor-default opacity-70',
              )}
              aria-label={`定位到幻灯片第 ${pillCounter} 处引用 (${seg.elementId})`}
            >
              <Crosshair className="h-3 w-3" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </span>
    );
  },
);

CompanionMessageRenderer.displayName = 'CompanionMessageRenderer';
