/**
 * 文件说明：基于 shadcn/ui 约定封装的输入框原语。
 * 用于统一基础输入样式，并允许 feature 在外层继续包裹复杂交互壳层。
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full min-w-0 text-foreground transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  {
    variants: {
      variant: {
        default:
          'h-11 rounded-[var(--xm-radius-lg)] border border-border bg-background/70 px-4 py-3 shadow-sm focus-visible:border-[color:var(--xm-color-ring)] focus-visible:ring-2 focus-visible:ring-[color:var(--xm-color-ring)]/40',
        bare:
          'h-auto rounded-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-transparent focus-visible:ring-0'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

type InputProps = React.ComponentProps<'input'> &
  VariantProps<typeof inputVariants>;

/**
 * 渲染统一输入框。
 *
 * @param props - 输入框参数。
 * @returns 输入框节点。
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', variant, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }), 'text-base')}
      {...props}
    />
  );
});

export { Input };
