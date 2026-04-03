/**
 * 文件说明：基于 shadcn/ui 约定封装的按钮原语。
 * 统一承接 student-web 的按钮变体、尺寸与 `asChild` 组合能力。
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-105',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-accent',
        outline:
          'border border-border bg-background/72 text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        link: 'rounded-none text-primary underline-offset-4 hover:underline',
        surface:
          'border border-[color:var(--xm-color-border-strong)] bg-[color:var(--xm-color-surface-glass)] text-foreground shadow-[var(--xm-shadow-card)] backdrop-blur-[var(--xm-blur-surface)] hover:bg-[color:var(--xm-color-surface)]',
        home:
          'bg-[color:var(--xm-color-surface-glass)] text-[color:var(--xm-color-text-primary)] shadow-sm hover:bg-[color:var(--xm-color-surface)]'
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-9 px-4 py-2',
        lg: 'h-12 px-6 py-3',
        icon: 'size-10 px-0',
        hero: 'min-h-14 px-10 py-4 text-base font-bold'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

/**
 * 渲染统一按钮原语。
 *
 * @param props - 按钮参数。
 * @param props.asChild - 是否把样式透传给子节点。
 * @returns 按钮节点。
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
