/**
 * 文件说明：通用空态展示组件。
 *
 * 视觉对齐 video-public-feed 现有内联实现：垂直居中、轻量字号、辅以
 * 可选 icon 与 action 行动按钮。Wave 0.2 仅新建组件并导出，**未强制迁移**
 * 现有内联实现（替换战留待 Wave 1.5），新增 UI 时优先使用本组件。
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** 标题左侧的图标，常见为 lucide-react 中的小图标节点。 */
  icon?: ReactNode;
  /** 主标题文案，必填。 */
  title: string;
  /** 描述性副文案，可选。 */
  description?: string;
  /** 行动按钮节点，例如 “去创建” 链接，可选。 */
  action?: ReactNode;
  /** 额外 className，可覆盖布局或外间距。 */
  className?: string;
}

/**
 * 通用空态组件。
 *
 * @param props - {@link EmptyStateProps}
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-semibold text-foreground/80">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
