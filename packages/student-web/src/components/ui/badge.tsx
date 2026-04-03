/**
 * 文件说明：基于 shadcn/ui 约定封装的徽标原语。
 * 统一承接状态 pill、品牌浮层标签与轻量分类标签。
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-background/60 text-foreground',
        floating:
          'border-[color:var(--xm-color-agent-accent-border)] bg-[color:var(--xm-color-agent-accent-soft)] text-[color:var(--xm-color-agent-accent)]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>;

/**
 * 渲染统一徽标。
 *
 * @param props - 徽标参数。
 * @returns 徽标节点。
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge };
