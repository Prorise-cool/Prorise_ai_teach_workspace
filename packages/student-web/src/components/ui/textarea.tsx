/**
 * 文件说明：基于 shadcn/ui 约定封装的多行输入框原语。
 * 主要服务营销落地页联系表单等需要统一样式的文本域场景。
 */
import * as React from 'react';

import { cn } from '@/lib/utils';

type TextareaProps = React.ComponentProps<'textarea'>;

/**
 * 渲染统一文本域。
 *
 * @param props - 文本域参数。
 * @returns 文本域节点。
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          'flex min-h-32 w-full rounded-[var(--xm-radius-lg)] border border-border bg-background/72 px-4 py-3 text-base text-foreground shadow-sm transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-[color:var(--xm-color-ring)] focus-visible:ring-2 focus-visible:ring-[color:var(--xm-color-ring)]/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        {...props}
      />
    );
  }
);

export { Textarea };
